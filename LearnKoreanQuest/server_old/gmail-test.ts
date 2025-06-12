import nodemailer from "nodemailer";

export async function testActualGmailSending(): Promise<boolean> {
  console.log("🔍 실제 Gmail SMTP 연결 테스트 시작...");
  
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  
  if (!user || !pass) {
    console.error("❌ Gmail 인증 정보가 없습니다");
    return false;
  }
  
  console.log(`Gmail 계정: ${user}`);
  console.log(`앱 비밀번호: ${pass.substring(0, 4)}****`);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    // SMTP 연결 확인
    const verified = await transporter.verify();
    console.log("✅ Gmail SMTP 연결 성공:", verified);
    
    // 실제 테스트 이메일 전송
    const result = await transporter.sendMail({
      from: `"ComplianceGuard System" <${user}>`,
      to: "tbvjakrso@naver.com",
      subject: "🧪 ComplianceGuard 실제 이메일 테스트",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ 이메일 시스템 성공!</h2>
          <p>이 이메일은 ComplianceGuard 시스템에서 실제로 전송된 테스트 이메일입니다.</p>
          <p><strong>전송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
          <p>시스템이 정상적으로 작동하고 있으며, 법규 분석 보고서를 실제로 전송할 수 있습니다.</p>
          <hr style="margin: 20px 0;">
          <small style="color: #666;">ComplianceGuard - AI 기반 법규 준수 모니터링 플랫폼</small>
        </div>
      `
    });
    
    console.log("✅ 실제 이메일 전송 성공!");
    console.log("Message ID:", result.messageId);
    console.log("수신자: tbvjakrso@naver.com");
    
    return true;
  } catch (error) {
    console.error("❌ Gmail 이메일 전송 실패:", error);
    return false;
  }
}