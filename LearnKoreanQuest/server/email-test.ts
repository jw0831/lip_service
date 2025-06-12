import nodemailer from "nodemailer";

// Test Gmail SMTP configuration
export async function testGmailConnection(): Promise<boolean> {
  console.log("🔍 Gmail SMTP 연결 테스트 시작...");
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    debug: true, // 디버그 모드 활성화
    logger: true, // 로깅 활성화
  });

  try {
    // SMTP 연결 확인
    const isConnected = await transporter.verify();
    console.log("✅ Gmail SMTP 연결 성공:", isConnected);
    
    // 테스트 이메일 전송
    const testEmail = {
      from: process.env.GMAIL_USER,
      to: "tbvjakrso@naver.com",
      subject: "🧪 ComplianceGuard 이메일 테스트",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">📧 이메일 시스템 테스트</h2>
          <p>이 이메일은 ComplianceGuard 시스템의 Gmail SMTP 연결 테스트용입니다.</p>
          <p><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
          <p>이메일이 정상적으로 수신되었다면 시스템이 올바르게 작동하고 있습니다.</p>
          <hr>
          <small>ComplianceGuard - AI 기반 법규 준수 모니터링 플랫폼</small>
        </div>
      `
    };

    const result = await transporter.sendMail(testEmail);
    console.log("✅ 테스트 이메일 전송 성공:", result.messageId);
    console.log("📧 수신 확인:", testEmail.to);
    
    return true;
  } catch (error) {
    console.error("❌ Gmail SMTP 연결 실패:", error);
    console.error("인증 정보:", {
      user: process.env.GMAIL_USER ? "설정됨" : "없음",
      password: process.env.GMAIL_APP_PASSWORD ? "설정됨" : "없음"
    });
    return false;
  }
}

// 실제 이메일 전송 함수 (개선된 버전)
export async function sendActualEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const result = await transporter.sendMail({
      from: `"ComplianceGuard System" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    console.log("✅ 이메일 전송 완료:", result.messageId);
    console.log("📧 수신자:", params.to);
    return true;
  } catch (error) {
    console.error("❌ 이메일 전송 실패:", error);
    return false;
  }
}