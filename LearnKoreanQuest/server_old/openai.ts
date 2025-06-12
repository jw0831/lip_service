import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

interface RegulationAnalysisResult {
  findings: string;
  recommendations: string;
  riskLevel: string;
  compliance: number;
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface DocumentAnalysisResult {
  findings: string;
  recommendations: string;
  complianceScore: number;
}

// AI 기반 법규 준수성 분석
export async function analyzeRegulationCompliance(
  regulationContent: string,
  policyContent: string,
  departmentName: string
): Promise<RegulationAnalysisResult> {
  try {
    const prompt = `
당신은 한국 법규 준수 전문가이자 컨설턴트입니다. 다음 법규와 정책 문서를 분석하여 종합적인 준수성 평가를 수행해주세요.

법규 내용:
${regulationContent}

현재 정책 문서:
${policyContent}

담당 부서: ${departmentName}

다음 항목들을 포함하여 분석해주세요:
1. 현재 정책의 법규 요구사항 충족도 (0-100점)
2. 위험도 수준 (고위험/중위험/저위험)
3. 주요 발견사항 및 현재 준수 상태
4. 구체적인 개선 권고사항
5. 단계별 실행 계획 (즉시/단기/중장기)

반드시 JSON 형식으로 응답해주세요:
{
  "findings": "주요 발견사항과 현재 준수 상태를 상세히 기술",
  "recommendations": "구체적인 개선 권고사항",
  "riskLevel": "고위험|중위험|저위험",
  "compliance": 숫자(0-100),
  "actionItems": {
    "immediate": ["즉시 조치사항 1", "즉시 조치사항 2"],
    "shortTerm": ["단기 이행사항 1", "단기 이행사항 2"],
    "longTerm": ["중장기 개선사항 1", "중장기 개선사항 2"]
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 한국 법규 준수 전문가입니다. 정확하고 실용적인 분석을 제공하며, 항상 JSON 형식으로 응답합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // 결과 검증 및 기본값 설정
    return {
      findings: result.findings || "분석 중 오류가 발생했습니다.",
      recommendations: result.recommendations || "수동 검토가 필요합니다.",
      riskLevel: result.riskLevel || "중위험",
      compliance: result.compliance || 50,
      actionItems: result.actionItems || {
        immediate: ["법규 검토 및 현황 파악"],
        shortTerm: ["정책 개정안 수립"],
        longTerm: ["지속적 모니터링 체계 구축"]
      }
    };

  } catch (error) {
    console.error("OpenAI 법규 분석 실패:", error);
    throw new Error(`AI 분석 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// 업로드된 문서 분석
export async function analyzeDocument(
  documentContent: string,
  regulationContext?: string
): Promise<DocumentAnalysisResult> {
  try {
    const prompt = `
당신은 한국 법규 준수 전문가입니다. 업로드된 정책 문서를 분석해주세요.

문서 내용:
${documentContent}

${regulationContext ? `
관련 법규 맥락:
${regulationContext}
` : ''}

다음 사항을 분석해주세요:
1. 문서의 법규 준수성 평가
2. 개선이 필요한 부분
3. 준수도 점수 (0-100점)

JSON 형식으로 응답해주세요:
{
  "findings": "문서 분석 결과 및 주요 발견사항",
  "recommendations": "구체적인 개선 권고사항",
  "complianceScore": 0-100점수
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 한국 법규 준수 전문가입니다. 문서를 정확히 분석하고 실용적인 권고사항을 제공합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      findings: result.findings || "문서 분석 중 오류가 발생했습니다.",
      recommendations: result.recommendations || "수동 검토가 필요합니다.",
      complianceScore: typeof result.complianceScore === "number" 
        ? Math.max(0, Math.min(100, result.complianceScore))
        : 50
    };

  } catch (error) {
    console.error("OpenAI 문서 분석 실패:", error);
    throw new Error(`문서 분석 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// 법규 요약 생성
export async function summarizeRegulation(regulationContent: string): Promise<string> {
  try {
    const prompt = `
다음 한국 법규를 간결하고 이해하기 쉽게 요약해주세요:

${regulationContent}

요약 시 포함할 내용:
- 법규의 주요 목적
- 핵심 요구사항
- 준수해야 할 주요 사항
- 위반 시 제재 내용 (있는 경우)

300자 이내로 한국어로 요약해주세요.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 법규 요약 전문가입니다. 복잡한 법규를 간결하고 이해하기 쉽게 요약합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0].message.content?.trim() || "요약 생성에 실패했습니다.";

  } catch (error) {
    console.error("OpenAI 법규 요약 실패:", error);
    throw new Error(`법규 요약 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// 종합 법무 자문 보고서 생성
export async function generateComplianceReport(
  regulation: any,
  department: any,
  analysisResult: RegulationAnalysisResult
): Promise<string> {
  try {
    const caseNumber = `CG-2025-${Math.floor(Math.random() * 900000) + 100000}`;
    const daysUntilEffective = Math.floor((new Date(regulation.effectiveDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const monthlyCompleted = Math.min(100, Math.floor(analysisResult.compliance * 1.1));
    const monthlyIncomplete = 100 - monthlyCompleted;

    const reportContent = `🛡️
Safety Compliance Center
산업안전보건 전문 컨설팅 및 준수관리 서비스

📋 고위험 안전관리 알림 - 계획 수립 필요
Case No. ${caseNumber}
${regulation.name}
${regulation.article}(${regulation.content.substring(0, 80)}...)
📅 시행일자: ${new Date(regulation.effectiveDate).toLocaleDateString('ko-KR')}부터 적용
담당 부서: ${department.name}
책임자: ${department.contactName || '김개발'}
연락처: ${department.contactPhone || '02-1234-5678'}
관련 규정: ${regulation.category} 관리 규정

📊 법규 준수 현황
${analysisResult.compliance}%
연간
연간 진행률 (${analysisResult.compliance}%)
월간 완료 (${monthlyCompleted}%)
월간 미완료 (${monthlyIncomplete}%)

🔴 안전관리 일반 알림 (D-${Math.abs(daysUntilEffective)}일)
시행일자: ${new Date(regulation.effectiveDate).toLocaleDateString('ko-KR')}
위험도: ${analysisResult.riskLevel}
관리등급: 일반
필수 대응: 계획 수립 필요

🛡️ 산업안전보건 위험성 평가 결과
위험요인 식별:
${regulation.name} ${regulation.article}이 ${new Date(regulation.effectiveDate).toLocaleDateString('ko-KR')}부터 새롭게 시행됩니다. 주요 변경사항: ${regulation.content}

현행 안전관리 체계 점검사항:
• 안전보건관리책임자 지정 및 교육 이수 현황
• 작업환경측정 및 특수건강진단 실시 현황
• 위험성평가 실시 및 개선대책 수립 여부
• 안전교육 실시 및 기록 관리 현황
• 개인보호구 지급 및 착용 관리 체계

📋 안전관리 이행 조치사항 (Action Items)
🔧 즉시 조치사항 (7일 이내):
현업부서에서는 해당법을 준수하기 위해서 다음과 같이 행동하여야 합니다: ${analysisResult.actionItems.immediate.map((item, index) => `${index + 1}. ${item}`).join(' ')}

📅 단기 이행사항 (30일 이내):
• ${analysisResult.actionItems.shortTerm.join('\n• ')}

📈 중장기 개선사항 (90일 이내):
• ${analysisResult.actionItems.longTerm.join('\n• ')}

ComplianceGuard Legal Advisory
📧 tbvjakrso@naver.com | ☎️ 02-1234-5678
🌐 www.complianceguard.co.kr
본 법무 자문서는 ComplianceGuard의 AI 기반 법규 분석 시스템에 의해 자동 생성되었습니다.
상세한 법률 자문이 필요한 경우 전문 변호사와 상담하시기 바랍니다.
발송일시: ${new Date().toLocaleString('ko-KR')} (한국시간)`;

    return reportContent;

  } catch (error) {
    console.error("보고서 생성 실패:", error);
    throw new Error(`보고서 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// 월간 리포트 생성을 위한 종합 분석
export async function generateMonthlyInsights(
  departmentName: string,
  analysisData: Array<{
    regulation: string;
    status: string;
    findings: string;
  }>
): Promise<{
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  trendAnalysis: string;
}> {
  try {
    const prompt = `
${departmentName}의 월간 법규 준수 분석 데이터를 기반으로 종합적인 인사이트를 생성해주세요.

분석 데이터:
${analysisData.map(item => `
- 법규: ${item.regulation}
- 상태: ${item.status}
- 발견사항: ${item.findings}
`).join('\n')}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "전체적인 준수 현황 요약",
  "keyFindings": ["주요 발견사항 1", "주요 발견사항 2", "주요 발견사항 3"],
  "recommendations": ["권고사항 1", "권고사항 2", "권고사항 3"],
  "trendAnalysis": "준수 동향 및 개선 방향 분석"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 법규 준수 분석 전문가입니다. 데이터를 종합하여 유의미한 인사이트를 제공합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      summary: result.summary || "월간 분석 요약을 생성할 수 없습니다.",
      keyFindings: Array.isArray(result.keyFindings) ? result.keyFindings : ["분석 데이터 부족"],
      recommendations: Array.isArray(result.recommendations) ? result.recommendations : ["추가 검토 필요"],
      trendAnalysis: result.trendAnalysis || "동향 분석 데이터가 부족합니다."
    };

  } catch (error) {
    console.error("OpenAI 월간 인사이트 생성 실패:", error);
    throw new Error(`월간 인사이트 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
  }
}

// 위험도 자동 평가
export async function assessRiskLevel(
  regulationContent: string,
  priority: string,
  departmentType: string
): Promise<"고위험" | "중위험" | "저위험"> {
  try {
    const prompt = `
다음 법규의 위험도를 평가해주세요:

법규 내용: ${regulationContent}
우선순위: ${priority}
담당 부서 유형: ${departmentType}

평가 기준:
- 고위험: 즉시 대응이 필요하고, 위반 시 심각한 제재가 있는 경우
- 중위험: 상당한 주의가 필요하고, 적절한 대응이 필요한 경우  
- 저위험: 일반적인 관리 수준으로 충분한 경우

"고위험", "중위험", "저위험" 중 하나만 응답해주세요.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "당신은 법규 위험 평가 전문가입니다. 정확한 위험도 평가를 제공합니다."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 10,
    });

    const result = response.choices[0].message.content?.trim() || "";
    
    if (["고위험", "중위험", "저위험"].includes(result)) {
      return result as "고위험" | "중위험" | "저위험";
    }
    
    // 기본값으로 우선순위 기반 판단
    return priority === "높음" ? "고위험" : priority === "보통" ? "중위험" : "저위험";

  } catch (error) {
    console.error("OpenAI 위험도 평가 실패:", error);
    // 오류 시 우선순위 기반 기본값 반환
    return priority === "높음" ? "고위험" : priority === "보통" ? "중위험" : "저위험";
  }
}
