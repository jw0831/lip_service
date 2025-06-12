import { scheduledLawSync } from "./law-sync";
import { scheduledMonthlyAnalysis } from "./monthly-analysis";

let intervalIds: NodeJS.Timeout[] = [];

export function startSchedulers() {
  console.log("스케줄러 시작...");
  
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
  console.log("- 알림 체크: 5분마다");
}

export function stopSchedulers() {
  console.log("스케줄러 중지...");
  intervalIds.forEach(id => clearInterval(id));
  intervalIds = [];
}

async function checkUpcomingRegulations() {
  try {
    const { storage } = await import("./storage");
    const regulations = await storage.getAllRegulations();
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    for (const regulation of regulations) {
      if (!regulation.effectiveDate) continue;
      
      const effectiveDate = new Date(regulation.effectiveDate);
      const timeDiff = effectiveDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // 7일 전 알림
      if (daysDiff === 7) {
        await storage.createNotification({
          type: "알림",
          title: `법규 시행 예정: ${regulation.name}`,
          message: `${regulation.name}이(가) 7일 후 시행됩니다. 준비사항을 점검해주세요.`,
        });
      }
      
      // 1일 전 긴급 알림
      if (daysDiff === 1) {
        await storage.createNotification({
          type: "긴급",
          title: `법규 시행 임박: ${regulation.name}`,
          message: `${regulation.name}이(가) 내일 시행됩니다. 최종 점검이 필요합니다.`,
        });
      }
      
      // 시행일 당일 알림
      if (daysDiff === 0) {
        await storage.createNotification({
          type: "시행",
          title: `법규 시행: ${regulation.name}`,
          message: `${regulation.name}이(가) 오늘부터 시행됩니다.`,
        });
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
