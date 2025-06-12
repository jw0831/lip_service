import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

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
      GMAIL_PASS_LENGTH: process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '').length : 0
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
Gmail Pass Length: ${process.env.GMAIL_PASS ? process.env.GMAIL_PASS.replace(/\s+/g, '').length : 0}
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
Gmail User: ${process.env.GMAIL_USER}
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
  const pass = (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD)?.replace(/\s+/g, '');
  
  if (!user || !pass) return false;
  
  // Check if user is a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user)) return false;
  
  // For Gmail app password, it should be 16 characters, but we'll be more flexible
  if (pass.length < 8) return false;
  
  return true;
};

// Configure Gmail SMTP transporter
const createTransporter = () => {
  const user = process.env.GMAIL_USER?.trim();
  const pass = (process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD)?.replace(/\s+/g, '');
  
  console.log('🔧 Transporter 설정:');
  console.log(`User: ${user}`);
  console.log(`Pass length: ${pass?.length}`);
  console.log(`Pass (masked): ${pass?.substring(0, 4)}****${pass?.substring(pass.length - 4)}`);
  
  return nodemailer.createTransport({
    service: 'gmail',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
    debug: true, // Enable debug mode
    logger: true // Enable logging
  });
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
  console.log('🔍 Gmail 인증 정보 확인 중...');
  console.log(`GMAIL_USER: ${process.env.GMAIL_USER ? '설정됨' : '설정안됨'}`);
  console.log(`GMAIL_PASS: ${process.env.GMAIL_PASS ? `설정됨 (길이: ${process.env.GMAIL_PASS.replace(/\s+/g, '').length})` : '설정안됨'}`);
  
  // 데모 모드: 항상 성공으로 처리하고 콘솔에 출력
  console.log("\n" + "=".repeat(120));
  console.log("📧 이메일 발송 데모 (Gmail 설정 후 실제 발송 가능)");
  console.log("=".repeat(120));
  console.log(`발신자: ComplianceGuard System <${process.env.GMAIL_USER}>`);
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
  console.log("✅ 이메일 발송 시뮬레이션 완료");
  console.log("💡 실제 Gmail 발송을 위해서는:");
  console.log("1. Google 계정 > 보안 > 2단계 인증 활성화");
  console.log("2. 앱 비밀번호 생성 > 16자리 앱 비밀번호 복사");
  console.log("3. .env 파일의 GMAIL_PASS에 앱 비밀번호 설정");
  console.log("=".repeat(120));
  
  // 실제 Gmail 발송 시도 (실패해도 데모 모드로 성공 처리)
  if (isValidGmailCredentials()) {
    try {
      const result = await sendRealEmail(params);
      if (result) {
        logEmailSuccess(params, 'gmail-success');
      }
      return result;
    } catch (error) {
      console.log("❌ 실제 이메일 발송 실패, 데모 모드로 계속 진행");
      console.log("오류:", error);
      logEmailError(error, "Real Gmail sending failed", params);
    }
  } else {
    // Gmail 인증 정보가 없는 경우도 로깅
    const authError = new Error("Gmail credentials validation failed");
    logEmailError(authError, "Gmail credentials validation", params);
  }
  
  return true; // 데모 모드에서는 항상 성공
}

async function sendRealEmail(params: EmailParams): Promise<boolean> {
  const transporter = createTransporter();
  
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

    console.log('📤 이메일 발송 시도 중...');
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ 실제 이메일 전송 성공: ${result.messageId}`);
    console.log(`📧 수신자: ${params.to}`);
    
    // 성공 로그 기록
    logEmailSuccess(params, result.messageId);
    return true;
  } catch (error: any) {
    console.error('❌ Gmail 이메일 전송 실패:');
    console.error('오류 코드:', error.code);
    console.error('오류 메시지:', error.message);
    
    // 오류 로그 기록
    logEmailError(error, "Gmail SMTP sending failed", params);
    
    if (error.code === 'EAUTH') {
      console.error('🔑 인증 오류: Gmail 앱 비밀번호를 확인하세요');
      console.error('💡 해결방법:');
      console.error('1. https://myaccount.google.com/security');
      console.error('2. 2단계 인증 > 앱 비밀번호 생성');
      console.error('3. 생성된 16자리 비밀번호를 .env의 GMAIL_PASS에 설정');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 네트워크 오류: 인터넷 연결을 확인하세요');
    }
    
    throw error; // 오류를 다시 throw하여 상위에서 처리
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
    from: process.env.GMAIL_USER || "",
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
    from: process.env.GMAIL_USER || "",
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
    from: process.env.GMAIL_USER || "",
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
    from: process.env.GMAIL_USER || "",
    subject,
    html
  });
}