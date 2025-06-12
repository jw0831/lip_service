import 'dotenv/config';
import { scheduledLawSync } from "./law-sync";
import { scheduledMonthlyAnalysis } from "./monthly-analysis";
import { sendMonthlyUpcomingRegulationsEmail } from "./email";
import dotenv from "dotenv";

dotenv.config();
let intervalIds: NodeJS.Timeout[] = [];

export function startSchedulers() {
  console.log("스케줄러 시작...");
  console.log('📧 스케줄러 환경변수 상태:');
  console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT_SET');
  console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET' : 'NOT_SET');
  console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET');
  
  // 일일 법규 동기화 (매일 오전 6시) - 비활성화됨
  // const dailySyncInterval = setInterval(() => {
  //   const now = new Date();
  //   const hours = now.getHours();
  //   const minutes = now.getMinutes();
  //   
  //   // 매일 오전 6시에 실행
  //   if (hours === 6 && minutes === 0) {
  //     scheduledLawSync().catch(error => {
  //       console.error("정기 법규 동기화 스케줄러 오류:", error);
  //     });
  //   }
  // }, 60000); // 1분마다 체크
  
  // 월간 분석 (매월 1일 오전 9시)
  const monthlyAnalysisInterval = setInterval(() => {
    const now = new Date();
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 매월 1일 오전 9시에 실행
    if (date === 1 && hours === 9 && minutes === 0) {
      scheduledMonthlyAnalysis().catch(error => {
        console.error("정기 월간 분석 스케줄러 오류:", error);
      });
      
      // 매월 1일 시행 예정 법규 이메일 발송
      sendMonthlyUpcomingRegulations().catch(error => {
        console.error("월간 시행 예정 법규 이메일 발송 오류:", error);
      });
    }
  }, 60000); // 1분마다 체크
  
  // 실시간 알림 체크 (5분마다)
  const notificationInterval = setInterval(() => {
    checkUpcomingRegulations().catch(error => {
      console.error("알림 체크 스케줄러 오류:", error);
    });
  }, 5 * 60 * 1000); // 5분마다 실행
  
  intervalIds.push(monthlyAnalysisInterval, notificationInterval);
  
  console.log("스케줄러 설정 완료:");
  console.log("- 일일 법규 동기화: 비활성화됨");
  console.log("- 월간 분석: 매월 1일 오전 9시");
  console.log("- 월간 시행 예정 법규 이메일: 매월 1일 오전 9시");
  console.log("- 알림 체크: 5분마다");
}

export function stopSchedulers() {
  console.log("스케줄러 중지...");
  intervalIds.forEach(id => clearInterval(id));
  intervalIds = [];
}

async function checkUpcomingRegulations() {
  try {
    const { ExcelService } = await import("./excelService");
    const excelService = ExcelService.getInstance();
    const regulations = await excelService.getAllRegulations();
    const now = new Date();
    
    for (const regulation of regulations) {
      if (!regulation.시행일자 || regulation.시행일자 === 'None') continue;
      
      const effectiveDate = new Date(regulation.시행일자);
      const timeDiff = effectiveDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // 7일 전 알림
      if (daysDiff === 7) {
        console.log(`7일 전 알림: ${regulation.법률명}`);
      }
      
      // 1일 전 긴급 알림
      if (daysDiff === 1) {
        console.log(`1일 전 긴급 알림: ${regulation.법률명}`);
      }
      
      // 시행일 당일 알림
      if (daysDiff === 0) {
        console.log(`시행일 당일 알림: ${regulation.법률명}`);
      }
    }
    
  } catch (error) {
    console.error("법규 시행일 체크 중 오류:", error);
  }
}

// 개발/테스트용 즉시 실행 함수들
export async function runImmediateLawSync() {
  console.log("즉시 법규 동기화 실행...");
  return scheduledLawSync();
}

export async function runImmediateMonthlyAnalysis() {
  console.log("즉시 월간 분석 실행...");
  return scheduledMonthlyAnalysis();
}

export async function sendMonthlyUpcomingRegulations() {
  try {
    console.log("월간 시행 예정 법규 이메일 발송 시작...");
    console.log('🔧 sendMonthlyUpcomingRegulations 환경변수 상태:');
    console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT_SET');
    console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET' : 'NOT_SET');
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET');
    
    const { ExcelService } = await import("./excelService");
    const excelService = ExcelService.getInstance();
    const regulations = await excelService.getAllRegulations();
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // 한달 이내 시행 예정 법규 필터링
    const upcomingRegulations = regulations.filter(r => {
      if (!r.시행일자 || r.시행일자 === 'None') return false;
      const effectiveDate = new Date(r.시행일자);
      return effectiveDate > now && effectiveDate <= nextMonth;
    });
    
    // 부서별로 그룹화
    const departmentGroups = Array.from(new Set(upcomingRegulations.map(r => r.담당부서).filter(d => d && d !== 'None')));
    
    for (const deptName of departmentGroups) {
      const deptRegulations = upcomingRegulations.filter(r => r.담당부서 === deptName);
      
      if (deptRegulations.length > 0) {
        console.log(`📤 기본 이메일 발송 시도: ${deptName} (${deptRegulations.length}건)`);
        const emailResult = await sendMonthlyUpcomingRegulationsEmail(deptName, deptRegulations);
        if (emailResult) {
          console.log(`✅ ${deptName}에 기본 이메일 발송 완료`);
        } else {
          console.log(`❌ ${deptName}에 기본 이메일 발송 실패`);
        }
      }
    }
    
    console.log(`월간 시행 예정 법규 이메일 발송 완료: ${departmentGroups.length}개 부서`);
    
  } catch (error) {
    console.error("월간 시행 예정 법규 이메일 발송 실패:", error);
  }
}

export async function sendCustomMonthlyUpcomingRegulations(departmentEmails: Array<{department: string, email: string}>) {
  try {
    console.log("커스텀 월간 시행 예정 법규 이메일 발송 시작...");
    console.log('🔧 sendCustomMonthlyUpcomingRegulations 환경변수 상태:');
    console.log('GMAIL_USER:', process.env.GMAIL_USER ? 'SET' : 'NOT_SET');
    console.log('GMAIL_PASS:', process.env.GMAIL_PASS ? 'SET' : 'NOT_SET');
    console.log('SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET');
    
    const { ExcelService } = await import("./excelService");
    const { sendEmail } = await import("./email");
    const excelService = ExcelService.getInstance();
    const regulations = await excelService.getAllRegulations();
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // 현재 월 시행 예정 법규 필터링 (6월이면 6월)
    const currentMonthRegulations = regulations.filter(r => {
      if (!r.시행일자 || r.시행일자 === 'None') return false;
      if (!r.시행일자.includes('2025')) return false;
      
      const dateMatch = r.시행일자.match(/2025-(\d{2})/);
      if (!dateMatch) return false;
      
      const month = parseInt(dateMatch[1]);
      return month === currentMonth;
    });
    
    for (const deptEmail of departmentEmails) {
      const deptRegulations = currentMonthRegulations.filter(r => r.담당부서 === deptEmail.department);
      
      if (deptRegulations.length > 0) {
        const subject = `📋 ${deptEmail.department} ${currentMonth}월 시행 예정 법규 안내`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
            <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">📋 ${deptEmail.department}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${currentMonth}월 시행 예정 법규 안내 | 총 ${deptRegulations.length}건</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
                <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">📊 ${currentMonth}월 시행 예정 법규 현황</h2>
                <div style="color: #1e40af;">
                  <p style="margin: 5px 0;"><strong>총 법규:</strong> ${deptRegulations.length}건</p>
                  <p style="margin: 5px 0;"><strong>담당부서:</strong> ${deptEmail.department}</p>
                  <p style="margin: 5px 0;"><strong>발송일:</strong> ${new Date().toLocaleDateString('ko-KR')}</p>
                </div>
              </div>
              
              <h2 style="color: #374151; margin-bottom: 20px;">📋 시행 예정 법규 상세 내용</h2>
              
              ${deptRegulations.map((regulation) => `
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

                  ${regulation['AI 주요 개정 정리'] && 
                   regulation['AI 주요 개정 정리'] !== '- [개정이유]: 없음\\n\\n- [주요내용]: 없음' ? `
                    <div style="background: #dbeafe; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">💡 AI 주요 개정 정리</p>
                      <div style="color: #1e40af; white-space: pre-line; font-size: 14px;">
                        ${regulation['AI 주요 개정 정리']}
                      </div>
                    </div>
                  ` : ''}

                  ${regulation['AI 후속 조치 사항'] && 
                   regulation['AI 후속 조치 사항'] !== '내용/조치사항 없음' ? `
                    <div style="background: #dcfce7; padding: 15px; border-radius: 6px;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #15803d;">📋 AI 후속 조치 사항</p>
                      <div style="color: #15803d; white-space: pre-line; font-size: 14px;">
                        ${regulation['AI 후속 조치 사항']}
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

        console.log(`📤 이메일 발송 시도: ${deptEmail.department} -> ${deptEmail.email}`);
        console.log(`📧 From: ${process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || ""}`);
        console.log(`📧 To: ${deptEmail.email}`);
        console.log(`📧 Subject: ${subject}`);
        
        const emailResult = await sendEmail({
          to: deptEmail.email,
          from: process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "",
          subject,
          html
        });
        
        if (emailResult) {
          console.log(`✅ ${deptEmail.department} (${deptEmail.email})에 ${deptRegulations.length}건의 법규 정보 이메일 발송 완료`);
        } else {
          console.log(`❌ ${deptEmail.department} (${deptEmail.email})에 이메일 발송 실패`);
        }
      } else {
        console.log(`⚠️ ${deptEmail.department}에는 ${currentMonth}월 시행 예정 법규가 없습니다.`);
      }
    }
    
    console.log(`커스텀 월간 시행 예정 법규 이메일 발송 완료: ${departmentEmails.length}개 부서`);
    
  } catch (error) {
    console.error("커스텀 월간 시행 예정 법규 이메일 발송 실패:", error);
    throw error;
  }
}

// 서버 종료 시 정리
process.on('SIGINT', () => {
  console.log('서버 종료 중...');
  stopSchedulers();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  stopSchedulers();
  process.exit(0);
});
