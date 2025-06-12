import nodemailer from "nodemailer";

// Validate Gmail credentials format
const isValidGmailCredentials = (): boolean => {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  
  if (!user || !pass) return false;
  
  // Check if user is a valid email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user)) return false;
  
  // Check if password is 16 characters (Gmail app password format)
  if (pass.length !== 16) return false;
  
  return true;
};

// Configure Gmail SMTP transporter
const createTransporter = () => {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
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
  // Check if valid Gmail credentials are configured
  if (!isValidGmailCredentials()) {
    console.log("\n" + "=".repeat(120));
    console.log("이메일 전송 데모 - Gmail 인증 정보 필요");
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
    console.log("올바른 Gmail 계정 정보 설정 시 실제 이메일이 전송됩니다");
    console.log("=".repeat(120));
    return true;
  }

  const transporter = createTransporter();
  
  try {
    await transporter.verify();
    console.log('Gmail SMTP 연결 확인됨');

    const mailOptions = {
      from: `ComplianceGuard <${process.env.GMAIL_USER?.trim()}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`실제 이메일 전송 성공: ${result.messageId}`);
    console.log(`수신자: ${params.to}`);
    return true;
  } catch (error) {
    console.error('Gmail 이메일 전송 실패:', error);
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