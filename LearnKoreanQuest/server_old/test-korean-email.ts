import { sendEmail } from './email';

export async function sendKoreanSecurityTestEmail(): Promise<boolean> {
  const koreanSecurityEmailContent = `
    <div style="font-family: 'Malgun Gothic', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
      <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- 헤더 -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e40af; padding-bottom: 20px;">
          <h1 style="color: #1e40af; margin: 0; font-size: 24px;">🛡️ ComplianceGuard</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">AI 기반 법규 준수 모니터링 시스템</p>
        </div>

        <!-- 제목 -->
        <h2 style="color: #dc2626; background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 0 0 25px 0;">
          🚨 정보보안 법규 준수 긴급 알림
        </h2>

        <!-- 기본 정보 -->
        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
          <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px;">📋 분석 대상 정보</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 120px;"><strong>담당 부서:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">정보보안팀</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>관련 법규:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">개인정보보호법, 정보통신망법</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>위험 등급:</strong></td>
              <td style="padding: 8px 0; color: #dc2626;"><strong>높음 (즉시 조치 필요)</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>분석 일시:</strong></td>
              <td style="padding: 8px 0; color: #1e293b;">${new Date().toLocaleString('ko-KR')}</td>
            </tr>
          </table>
        </div>

        <!-- 주요 발견사항 -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 16px;">🔍 주요 발견사항</h3>
          <ul style="color: #374151; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">개인정보 수집·이용 동의 절차의 명확성 부족</li>
            <li style="margin-bottom: 8px;">데이터 암호화 수준이 최신 보안 표준에 미달</li>
            <li style="margin-bottom: 8px;">개인정보 유출 사고 대응 매뉴얼 미비</li>
            <li style="margin-bottom: 8px;">정기적인 보안 교육 체계 부재</li>
          </ul>
        </div>

        <!-- 즉시 조치사항 -->
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 16px;">⚡ 즉시 조치사항 (7일 이내)</h3>
          <ol style="color: #451a03; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>개인정보 처리방침 개정</strong> - 수집·이용 목적 명확화</li>
            <li style="margin-bottom: 8px;"><strong>데이터 암호화 강화</strong> - AES-256 표준 적용</li>
            <li style="margin-bottom: 8px;"><strong>사고대응팀 구성</strong> - 24시간 비상연락체계 구축</li>
          </ol>
        </div>

        <!-- 권고사항 -->
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #047857; margin: 0 0 15px 0; font-size: 16px;">📈 개선 권고사항</h3>
          <ul style="color: #064e3b; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">월 1회 정기 보안교육 실시</li>
            <li style="margin-bottom: 8px;">분기별 모의해킹 테스트 수행</li>
            <li style="margin-bottom: 8px;">보안관제시스템 도입 검토</li>
            <li style="margin-bottom: 8px;">개인정보보호 인증(PIMS) 취득 추진</li>
          </ul>
        </div>

        <!-- 연락처 -->
        <div style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; padding: 20px; margin-top: 30px; text-align: center;">
          <p style="color: #64748b; margin: 0 0 10px 0; font-size: 14px;">
            <strong>ComplianceGuard 법무자문센터</strong>
          </p>
          <p style="color: #64748b; margin: 0; font-size: 12px;">
            📧 tbvjakrso@naver.com | ☎️ 02-1234-5678<br>
            🌐 www.complianceguard.co.kr
          </p>
          <p style="color: #94a3b8; margin: 15px 0 0 0; font-size: 11px;">
            본 보고서는 AI 기반 법규 분석 시스템에 의해 자동 생성되었습니다.<br>
            상세한 법률 자문이 필요한 경우 전문 변호사와 상담하시기 바랍니다.
          </p>
        </div>

      </div>
    </div>
  `;

  return await sendEmail({
    to: 'tbvjakrso@naver.com',
    from: 'ComplianceGuard System',
    subject: '🛡️ [긴급] 정보보안 법규 준수 분석 보고서 - ComplianceGuard',
    html: koreanSecurityEmailContent
  });
}