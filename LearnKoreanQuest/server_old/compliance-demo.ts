import { storage } from "./storage";
import { analyzeRegulationCompliance, generateComplianceReport } from "./openai";

// 종합 법규 준수 분석 및 이메일 데모
export async function runComplianceDemo() {
  try {
    console.log("🚀 AI 기반 법규 준수 분석 및 이메일 전송 데모 시작...");
    
    // 실제 법규 데이터 가져오기
    const regulations = await storage.getAllRegulations();
    const departments = await storage.getAllDepartments();
    
    // 정보통신망 이용촉진 및 정보보호 등에 관한 법률 찾기
    const targetRegulation = regulations.find(reg => 
      reg.name.includes("정보통신망 이용촉진 및 정보보호")
    );
    
    if (!targetRegulation) {
      throw new Error("정보통신망 이용촉진 및 정보보호 등에 관한 법률을 찾을 수 없습니다.");
    }

    // 환경부서 또는 IT부서 찾기
    const targetDepartment = departments.find(dept => 
      dept.name.includes("환경") || dept.name.includes("IT")
    ) || departments[0];

    console.log(`📋 분석 대상:`);
    console.log(`- 법규: ${targetRegulation.name}`);
    console.log(`- 조항: ${targetRegulation.article}`);
    console.log(`- 부서: ${targetDepartment.name}`);
    console.log(`- 담당자: ${targetDepartment.contactName}`);

    // AI 분석 수행
    console.log("\n🤖 OpenAI GPT-4o를 통한 법규 분석 중...");
    
    const analysisResult = await analyzeRegulationCompliance(
      `${targetRegulation.name}\n${targetRegulation.article}\n${targetRegulation.content}`,
      `현재 ${targetDepartment.name} 부서의 개인정보 보호 관련 정책 문서입니다. 개인정보 수집 및 이용에 대한 기본적인 규정은 있으나, 최신 법령 요구사항에 대한 세부 대응책이 부족한 상황입니다.`,
      targetDepartment.name
    );

    console.log("✅ AI 분석 완료");
    console.log(`- 위험도: ${analysisResult.riskLevel}`);
    console.log(`- 준수율: ${analysisResult.compliance}%`);
    console.log(`- 즉시 조치사항: ${analysisResult.actionItems.immediate.length}개`);
    console.log(`- 단기 조치사항: ${analysisResult.actionItems.shortTerm.length}개`);
    console.log(`- 장기 조치사항: ${analysisResult.actionItems.longTerm.length}개`);

    // 보고서 생성
    console.log("\n📄 ComplianceGuard 법무 자문 보고서 생성 중...");
    
    const reportContent = await generateComplianceReport(
      targetRegulation,
      targetDepartment,
      analysisResult
    );

    console.log("✅ 보고서 생성 완료");

    // 이메일 내용 출력
    console.log("\n" + "=".repeat(120));
    console.log("📧 이메일 전송 내용");
    console.log("=".repeat(120));
    console.log("From: tbvjakrso@hufs-gsuite.kr");
    console.log("To: tbvjakrso@naver.com");
    console.log("Subject: 🛡️ ComplianceGuard - 법규 준수 분석 보고서");
    console.log("=".repeat(120));
    console.log();
    console.log(reportContent);
    console.log();
    console.log("=".repeat(120));
    console.log("✅ 이메일 전송 완료 (개발 환경에서는 콘솔 출력으로 시뮬레이션)");

    return {
      success: true,
      regulation: targetRegulation.name,
      department: targetDepartment.name,
      analysis: analysisResult,
      reportGenerated: true,
      emailSent: true
    };

  } catch (error) {
    console.error("❌ 법규 준수 분석 실패:", error);
    throw error;
  }
}