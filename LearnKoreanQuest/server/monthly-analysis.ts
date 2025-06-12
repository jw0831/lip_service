import { storage } from "./storage";
import { analyzeRegulationCompliance } from "./openai";
import { sendEmail } from "./email";

export async function runMonthlyAnalysis() {
  console.log("월간 분석 시작...");
  
  try {
    const departments = await storage.getAllDepartments();
    const regulations = await storage.getAllRegulations();
    
    for (const department of departments) {
      console.log(`${department.name} 월간 분석 진행 중...`);
      
      // 부서별 정책 가져오기
      const policies = await storage.getPoliciesByDepartment(department.id);
      
      // 부서별 기존 분석 가져오기
      const existingAnalyses = await storage.getAnalysesByDepartment(department.id);
      
      // 미분석 법규들에 대해 새로운 분석 생성
      for (const regulation of regulations) {
        const hasExistingAnalysis = existingAnalyses.some(
          analysis => analysis.regulationId === regulation.id && analysis.departmentId === department.id
        );
        
        if (!hasExistingAnalysis) {
          // AI 분석 실행
          try {
            const aiAnalysis = await analyzeRegulationCompliance(
              regulation.content,
              policies.map(p => p.content).join('\n'),
              department.name
            );
            
            // 분석 결과 저장
            await storage.createAnalysis({
              regulationId: regulation.id,
              policyId: policies[0]?.id,
              departmentId: department.id,
              status: "완료",
              findings: aiAnalysis.findings,
              recommendations: aiAnalysis.recommendations,
              riskLevel: aiAnalysis.riskLevel,
            });
            
            console.log(`${department.name} - ${regulation.name} 분석 완료`);
            
          } catch (error) {
            console.error(`AI 분석 실패: ${department.name} - ${regulation.name}`, error);
            
            // 실패한 경우에도 기본 분석 저장
            await storage.createAnalysis({
              regulationId: regulation.id,
              policyId: policies[0]?.id,
              departmentId: department.id,
              status: "오류",
              findings: "AI 분석 중 오류가 발생했습니다.",
              recommendations: "수동 검토가 필요합니다.",
              riskLevel: "중위험",
            });
          }
        }
      }
      
      // 부서별 월간 리포트 생성 및 이메일 발송
      await generateAndSendMonthlyReport(department);
    }
    
    // 전체 월간 분석 완료 알림
    await storage.createNotification({
      type: "시스템",
      title: "월간 분석 완료",
      message: `${new Date().getMonth() + 1}월 전체 부서 법규 분석이 완료되었습니다.`,
    });
    
    console.log("월간 분석 완료");
    
  } catch (error) {
    console.error("월간 분석 중 오류 발생:", error);
    
    await storage.createNotification({
      type: "오류",
      title: "월간 분석 실패",
      message: "월간 법규 분석 중 오류가 발생했습니다.",
    });
    
    throw error;
  }
}

async function generateAndSendMonthlyReport(department: any) {
  try {
    // 부서별 분석 현황 조회
    const analyses = await storage.getAnalysesByDepartment(department.id);
    const highRiskAnalyses = analyses.filter(a => a.riskLevel === "고위험");
    const mediumRiskAnalyses = analyses.filter(a => a.riskLevel === "중위험");
    const lowRiskAnalyses = analyses.filter(a => a.riskLevel === "저위험");
    const completedAnalyses = analyses.filter(a => a.status === "완료");
    
    // 이메일 내용 생성
    const emailContent = `
      <h2>${department.name} 월간 법규 분석 리포트</h2>
      
      <h3>분석 현황</h3>
      <ul>
        <li>총 분석 건수: ${analyses.length}건</li>
        <li>완료된 분석: ${completedAnalyses.length}건</li>
        <li>고위험 항목: ${highRiskAnalyses.length}건</li>
        <li>중위험 항목: ${mediumRiskAnalyses.length}건</li>
        <li>저위험 항목: ${lowRiskAnalyses.length}건</li>
      </ul>
      
      <h3>고위험 항목</h3>
      ${highRiskAnalyses.length > 0 ? 
        `<ul>${highRiskAnalyses.map(a => `<li>${a.findings}</li>`).join('')}</ul>` :
        '<p>고위험 항목이 없습니다.</p>'
      }
      
      <h3>권고사항</h3>
      <ul>
        ${analyses
          .filter(a => a.recommendations)
          .slice(0, 5)
          .map(a => `<li>${a.recommendations}</li>`)
          .join('')
        }
      </ul>
      
      <p>상세한 분석 결과는 시스템에서 확인하실 수 있습니다.</p>
      <p>문의사항이 있으시면 법무팀으로 연락 바랍니다.</p>
    `;
    
    // 이메일 발송
    if (department.contactEmail) {
      const success = await sendEmail(process.env.SENDGRID_API_KEY || "", {
        to: department.contactEmail,
        from: "noreply@company.com",
        subject: `[법규 준수] ${department.name} ${new Date().getMonth() + 1}월 분석 리포트`,
        html: emailContent,
      });
      
      if (success) {
        console.log(`${department.name} 월간 리포트 이메일 발송 완료`);
      } else {
        console.error(`${department.name} 월간 리포트 이메일 발송 실패`);
      }
    }
    
  } catch (error) {
    console.error(`${department.name} 월간 리포트 생성 실패:`, error);
  }
}

// 월간 스케줄러에서 호출되는 함수
export async function scheduledMonthlyAnalysis() {
  try {
    console.log("정기 월간 분석 실행...");
    await runMonthlyAnalysis();
    
  } catch (error) {
    console.error("정기 월간 분석 실패:", error);
  }
}

// 특정 부서의 긴급 분석
export async function runUrgentAnalysis(departmentId: number, regulationId: number) {
  try {
    console.log(`긴급 분석 시작: 부서 ${departmentId}, 법규 ${regulationId}`);
    
    const department = await storage.getDepartment(departmentId);
    const regulation = await storage.getRegulation(regulationId);
    
    if (!department || !regulation) {
      throw new Error("부서 또는 법규를 찾을 수 없습니다.");
    }
    
    const policies = await storage.getPoliciesByDepartment(departmentId);
    
    // AI 긴급 분석
    const aiAnalysis = await analyzeRegulationCompliance(
      regulation.content,
      policies.map(p => p.content).join('\n'),
      department.name
    );
    
    // 긴급 분석 결과 저장
    const analysis = await storage.createAnalysis({
      regulationId: regulation.id,
      policyId: policies[0]?.id,
      departmentId: department.id,
      status: "완료",
      findings: `[긴급 분석] ${aiAnalysis.findings}`,
      recommendations: `[즉시 조치 필요] ${aiAnalysis.recommendations}`,
      riskLevel: "고위험", // 긴급 분석은 항상 고위험으로 처리
    });
    
    // 긴급 알림 생성
    await storage.createNotification({
      type: "긴급",
      title: `긴급 분석 완료: ${regulation.name}`,
      message: `${department.name}에 대한 긴급 법규 분석이 완료되었습니다. 즉시 확인이 필요합니다.`,
    });
    
    // 긴급 이메일 발송
    if (department.contactEmail) {
      const emailContent = `
        <h2>긴급 법규 분석 결과</h2>
        <p><strong>법규:</strong> ${regulation.name}</p>
        <p><strong>부서:</strong> ${department.name}</p>
        <p><strong>위험도:</strong> 고위험</p>
        
        <h3>분석 결과</h3>
        <p>${aiAnalysis.findings}</p>
        
        <h3>권고사항</h3>
        <p>${aiAnalysis.recommendations}</p>
        
        <p style="color: red; font-weight: bold;">
          이 분석은 긴급사항으로 분류되었습니다. 즉시 조치를 취해주세요.
        </p>
      `;
      
      await sendEmail(process.env.SENDGRID_API_KEY || "", {
        to: department.contactEmail,
        from: "noreply@company.com",
        subject: `[긴급] ${regulation.name} 법규 분석 결과 - ${department.name}`,
        html: emailContent,
      });
    }
    
    console.log("긴급 분석 완료");
    return analysis;
    
  } catch (error) {
    console.error("긴급 분석 실패:", error);
    throw error;
  }
}
