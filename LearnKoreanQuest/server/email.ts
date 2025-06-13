import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// 마크다운을 HTML로 변환하는 함수 (대시보드와 동일한 로직, 인라인 스타일)
function convertMarkdownToHtml(text: string): string {
  if (!text) return text;
  
  return text
    // 헤더 변환 (# ## ###) - 대괄호 제거
    .replace(/^\[### (.+)\]$/gm, '<h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 12px 0 4px 0;">$1</h3>')
    .replace(/^\[## (.+)\]$/gm, '<h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 16px 0 8px 0;">$1</h2>')
    .replace(/^\[# (.+)\]$/gm, '<h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 16px 0 8px 0;">$1</h1>')
    // 기본 헤더 (대괄호 없는 경우)
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 12px 0 4px 0;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 16px 0 8px 0;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 16px 0 8px 0;">$1</h1>')
    // 볼드 텍스트 변환 (**text**)
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: #374151;">$1</strong>')
    // 번호 목록 변환
    .replace(/^(\d+)\.\s(.+)$/gm, '<div style="margin-left: 16px; margin: 4px 0;"><strong style="color: #1e293b;">$1.</strong> $2</div>')
    // 여러 연속 줄바꿈을 단일 줄바꿈으로 변환
    .replace(/\n{3,}/g, '\n\n')
    // 줄바꿈 처리를 더 자연스럽게
    .replace(/\n\n/g, '</p><p style="margin-top: 12px;">')
    .replace(/\n/g, ' ')
    // 전체를 p 태그로 감싸기
    .replace(/^(.+)$/, '<p>$1</p>')
    // 빈 p 태그 제거
    .replace(/<p><\/p>/g, '');
}



// Logging utility for email errors
const logEmailError = (error: any, context: string, params?: any) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    error: {
      code: error.code,
      message: error.message,
      stack: error.stack
    },
    emailParams: params ? {
      to: params.to,
      subject: params.subject,
      from: params.from
    } : null,
    environment: {
      GMAIL_USER: process.env.GMAIL_USER ? 'SET' : 'NOT_SET',
      GMAIL_PASS: process.env.GMAIL_PASS ? 'SET' : 'NOT_SET',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET',
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ? 'SET' : 'NOT_SET'
    }
  };
  
  const logText = `
========================================
EMAIL ERROR LOG - ${timestamp}
========================================
Context: ${context}
Error Code: ${error.code || 'UNKNOWN'}
Error Message: ${error.message || 'No message'}
Email To: ${params?.to || 'N/A'}
Email Subject: ${params?.subject || 'N/A'}
Gmail User: ${process.env.GMAIL_USER ? 'SET' : 'NOT_SET'}
Gmail Pass: ${process.env.GMAIL_PASS ? 'SET' : 'NOT_SET'}
SendGrid API Key: ${process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET'}
SendGrid From Email: ${process.env.SENDGRID_FROM_EMAIL ? 'SET' : 'NOT_SET'}
Stack Trace:
${error.stack || 'No stack trace'}
========================================

`;

  try {
    const logPath = path.join(process.cwd(), 'logging.txt');
    fs.appendFileSync(logPath, logText);
    console.log(`📝 오류 로그가 logging.txt에 저장되었습니다: ${timestamp}`);
  } catch (writeError) {
    console.error('❌ 로그 파일 쓰기 실패:', writeError);
  }
};

// Success logging utility
const logEmailSuccess = (params: any, messageId?: string) => {
  const timestamp = new Date().toISOString();
  const logText = `
========================================
EMAIL SUCCESS LOG - ${timestamp}
========================================
Context: Email sent successfully
Email To: ${params.to}
Email Subject: ${params.subject}
Message ID: ${messageId || 'N/A'}
Service Used: ${process.env.GMAIL_USER ? 'Gmail' : 'SendGrid'}
========================================

`;

  try {
    const logPath = path.join(process.cwd(), 'logging.txt');
    fs.appendFileSync(logPath, logText);
    console.log(`📝 성공 로그가 logging.txt에 저장되었습니다: ${timestamp}`);
  } catch (writeError) {
    console.error('❌ 로그 파일 쓰기 실패:', writeError);
  }
};

// Validate Gmail credentials format
const isValidGmailCredentials = (): boolean => {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '');
  
  if (!user || !pass) return false;
  
  // Check if user is a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user)) return false;
  
  // Check if password is at least 8 characters
  if (pass.length < 8) return false;
  
  return true;
};

// Validate SendGrid credentials format
const isValidSendGridCredentials = (): boolean => {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim();
  
  if (!apiKey || !fromEmail) return false;
  
  // Check if fromEmail is a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fromEmail)) return false;
  
  // Check if API key starts with 'SG.'
  if (!apiKey.startsWith('SG.')) return false;
  
  return true;
};

// Determine which email service to use (prioritize Gmail for local development)
const getEmailService = (): 'gmail' | 'sendgrid' | 'demo' => {
  if (isValidGmailCredentials()) {
    return 'gmail';
  } else if (isValidSendGridCredentials()) {
    return 'sendgrid';
  } else {
    return 'demo';
  }
};

// Create Gmail transporter
const createGmailTransporter = () => {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_PASS?.replace(/\s+/g, '');
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });
};

// Initialize SendGrid
const initializeSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (apiKey) {
    sgMail.setApiKey(apiKey);
  }
};

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

interface DepartmentNotificationData {
  departmentName: string;
  contactEmail: string;
  riskItems: number;
  completedAnalyses: number;
  totalAnalyses: number;
  urgentRegulations: Array<{
    name: string;
    effectiveDate: string;
    priority: string;
  }>;
}

interface MonthlyReportData {
  departmentName: string;
  contactEmail: string;
  month: string;
  totalAnalyses: number;
  completedAnalyses: number;
  highRiskItems: number;
  mediumRiskItems: number;
  lowRiskItems: number;
  keyFindings: string[];
  recommendations: string[];
  urgentActions: string[];
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const emailService = getEmailService();
  
  console.log(`📧 이메일 서비스: ${emailService.toUpperCase()}`);
  
  if (emailService === 'demo') {
    return sendDemoEmail(params);
  } else if (emailService === 'gmail') {
    return sendGmailEmail(params);
  } else if (emailService === 'sendgrid') {
    return sendSendGridEmail(params);
  }
  
  return false;
}

// Demo email (console output only)
async function sendDemoEmail(params: EmailParams): Promise<boolean> {
  console.log("\n" + "=".repeat(120));
  console.log("📧 이메일 전송 데모 - 인증 정보 필요");
  console.log("=".repeat(120));
  console.log(`발신자: ComplianceGuard System`);
  console.log(`수신자: ${params.to}`);
  console.log(`제목: ${params.subject}`);
  console.log("=".repeat(120));
  console.log("이메일 본문:");
  if (params.html) {
    const textContent = params.html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log(textContent);
  } else {
    console.log(params.text || '내용 없음');
  }
  console.log("=".repeat(120));
  console.log("💡 이메일 발송 설정:");
  console.log("• Gmail: GMAIL_USER, GMAIL_PASS 환경변수 설정");
  console.log("• SendGrid: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL 환경변수 설정");
  console.log("=".repeat(120));
  
  const authError = new Error("No valid email credentials found");
  logEmailError(authError, "Email credentials validation", params);
  return true;
}

// Gmail email sending
async function sendGmailEmail(params: EmailParams): Promise<boolean> {
  const transporter = createGmailTransporter();
  
  try {
    console.log('📡 Gmail SMTP 연결 테스트 중...');
    await transporter.verify();
    console.log('✅ Gmail SMTP 연결 확인됨');

    const mailOptions = {
      from: `ComplianceGuard <${process.env.GMAIL_USER?.trim()}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    console.log('📤 Gmail을 통한 이메일 발송 시도 중...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Gmail 이메일 전송 성공: ${result.messageId}`);
    console.log(`📧 수신자: ${params.to}`);
    
    logEmailSuccess(params, result.messageId);
    return true;
  } catch (error: any) {
    console.error('❌ Gmail 이메일 전송 실패:', error);
    logEmailError(error, "Gmail SMTP sending failed", params);
    return false;
  }
}

// SendGrid email sending
async function sendSendGridEmail(params: EmailParams): Promise<boolean> {
  initializeSendGrid();
  
  try {
    const msg = {
      to: params.to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'ComplianceGuard'
      },
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    console.log('📤 SendGrid를 통한 이메일 발송 시도 중...');
    const result = await sgMail.send(msg);
    
    console.log(`✅ SendGrid 이메일 전송 성공: ${result[0].statusCode}`);
    console.log(`📧 수신자: ${params.to}`);
    
    logEmailSuccess(params, result[0].headers['x-message-id'] || 'sendgrid-success');
    return true;
  } catch (error: any) {
    console.error('❌ SendGrid 이메일 전송 실패:', error);
    
    if (error.response) {
      console.error('SendGrid Response Body:', error.response.body);
      console.error('SendGrid Status Code:', error.response.statusCode);
    }
    
    logEmailError(error, "SendGrid sending failed", params);
    return false;
  }
}


export async function sendUrgentNotification(
  data: DepartmentNotificationData
): Promise<boolean> {
  const subject = `🚨 긴급: ${data.departmentName} 법규 준수 알림`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">긴급 법규 준수 알림</h2>
      <p><strong>부서:</strong> ${data.departmentName}</p>
      <p><strong>위험 항목:</strong> ${data.riskItems}건</p>
      <p><strong>분석 완료:</strong> ${data.completedAnalyses}/${data.totalAnalyses}건</p>
      
      <h3>긴급 대응 필요 법규:</h3>
      <ul>
        ${data.urgentRegulations.map(reg => 
          `<li><strong>${reg.name}</strong> (시행일: ${reg.effectiveDate}, 우선순위: ${reg.priority})</li>`
        ).join('')}
      </ul>
      
      <p style="color: #dc2626; font-weight: bold;">즉시 대응이 필요합니다.</p>
    </div>
  `;

  return await sendEmail({
    to: data.contactEmail,
    from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
    subject,
    html
  });
}

export async function sendMonthlyReport(
  data: MonthlyReportData
): Promise<boolean> {
  const subject = `📊 ${data.month} 월간 법규 준수 보고서 - ${data.departmentName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1f2937;">${data.month} 월간 법규 준수 보고서</h2>
      <p><strong>부서:</strong> ${data.departmentName}</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>분석 현황</h3>
        <p>총 분석: ${data.totalAnalyses}건</p>
        <p>완료: ${data.completedAnalyses}건</p>
        <p>고위험: ${data.highRiskItems}건 | 중위험: ${data.mediumRiskItems}건 | 저위험: ${data.lowRiskItems}건</p>
      </div>
      
      <h3>주요 발견사항</h3>
      <ul>
        ${data.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
      </ul>
      
      <h3>권장사항</h3>
      <ul>
        ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
      
      <h3>긴급 조치사항</h3>
      <ul style="color: #dc2626;">
        ${data.urgentActions.map(action => `<li>${action}</li>`).join('')}
      </ul>
    </div>
  `;

  return await sendEmail({
    to: data.contactEmail,
    from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
    subject,
    html
  });
}

export async function sendRegulationReminder(
  to: string,
  regulationName: string,
  effectiveDate: string,
  daysUntilEffective: number
): Promise<boolean> {
  const subject = `⏰ 법규 시행 알림: ${regulationName} (D-${daysUntilEffective})`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">법규 시행 알림</h2>
      <p><strong>법규명:</strong> ${regulationName}</p>
      <p><strong>시행일:</strong> ${effectiveDate}</p>
      <p><strong>남은 기간:</strong> ${daysUntilEffective}일</p>
      
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-weight: bold;">준비사항을 점검하시기 바랍니다.</p>
      </div>
    </div>
  `;

  return await sendEmail({
    to,
    from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
    subject,
    html
  });
}

export async function sendSystemNotification(
  to: string,
  title: string,
  message: string,
  timestamp: Date
): Promise<boolean> {
  const subject = `🔔 시스템 알림: ${title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">시스템 알림</h2>
      <p><strong>제목:</strong> ${title}</p>
      <p><strong>내용:</strong> ${message}</p>
      <p><strong>발생시간:</strong> ${timestamp.toLocaleString('ko-KR')}</p>
    </div>
  `;

  return await sendEmail({
    to,
    from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
    subject,
    html
  });
}

export async function sendMonthlyUpcomingRegulationsEmail(
  departmentName: string,
  regulations: any[]
): Promise<boolean> {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const subject = `📋 ${departmentName} ${currentMonth}월 시행 예정 법규 안내`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📋 ${departmentName}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${currentMonth}월 시행 예정 법규 안내 | 총 ${regulations.length}건</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">📊 ${currentMonth}월 시행 예정 법규 현황</h2>
          <div style="color: #1e40af;">
            <p style="margin: 5px 0;"><strong>총 법규:</strong> ${regulations.length}건</p>
            <p style="margin: 5px 0;"><strong>담당부서:</strong> ${departmentName}</p>
            <p style="margin: 5px 0;"><strong>발송일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
          </div>
        </div>
        
        <h2 style="color: #374151; margin-bottom: 20px;">📋 시행 예정 법규 상세 내용</h2>
        
        ${regulations.map((regulation, index) => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; background: #f9fafb;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
              <h3 style="margin: 0; color: #111827; font-size: 16px; flex: 1;">
                ${regulation.법률명}
              </h3>
              <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px;">
                ${regulation.법령종류}
              </span>
            </div>
            
            <div style="grid-template-columns: 1fr 1fr; display: grid; gap: 15px; margin-bottom: 15px; font-size: 14px;">
              <div>
                <span style="color: #6b7280; font-weight: 500;">시행일자:</span>
                <span style="font-weight: 600; margin-left: 8px;">${regulation.시행일자}</span>
              </div>
              <div>
                <span style="color: #6b7280; font-weight: 500;">구분:</span>
                <span style="font-weight: 600; margin-left: 8px;">${regulation['제정·개정구분'] || '-'}</span>
              </div>
            </div>

            ${regulation['개정 법률 조항'] && 
             regulation['개정 법률 조항'] !== 'None' ? `
              <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">💡 개정 법률 조항</p>
                <div style="font-size: 14px; line-height: 1.6;">
                  ${convertMarkdownToHtml(regulation['개정 법률 조항'])}
                </div>
              </div>
            ` : ''}

            ${regulation['AI 후속 조치 사항'] && 
             regulation['AI 후속 조치 사항'] !== '내용/조치사항 없음' ? `
              <div style="background: #dcfce7; padding: 15px; border-radius: 6px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #15803d;">📋 AI 후속 조치 사항</p>
                <div style="font-size: 14px; line-height: 1.6;">
                  ${convertMarkdownToHtml(regulation['AI 후속 조치 사항'])}
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h3 style="margin: 0 0 15px 0; color: #374151;">📞 문의 및 지원</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            • 상세한 법규 내용은 ComplianceGuard 시스템에서 확인 가능합니다<br>
            • 법규 준수 관련 문의: 법무팀 (${process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL})<br>
            • 긴급한 사안의 경우 즉시 연락 바랍니다
          </p>
        </div>
      </div>
      
      <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
        <small>ComplianceGuard - AI 기반 법규 준수 모니터링 플랫폼 | 발송시간: ${new Date().toLocaleString('ko-KR')}</small>
      </div>
    </div>
  `;

  // 부서별 담당자 이메일 매핑 (실제 환경에서는 데이터베이스에서 가져와야 함)
  const departmentEmails: Record<string, string> = {
    "인사문화그룹": "hr@company.com",
    "환경기획그룹": "env@company.com", 
    "안전보건기획그룹": "safety@company.com",
    "정보보호사무국": "security@company.com",
    "회계세무그룹": "finance@company.com",
    "법무실": "legal@company.com",
    "노사협력그룹": "labor@company.com",
    "윤리경영사무국": "ethics@company.com",
    "IP전략센터": "ip@company.com",
    "경영전략그룹": "strategy@company.com",
    "내부회계관리섹션": "accounting@company.com",
  };

  const recipientEmail = departmentEmails[departmentName] || "admin@company.com";

  return await sendEmail({
    to: recipientEmail,
    from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
    subject,
    html
  });
}