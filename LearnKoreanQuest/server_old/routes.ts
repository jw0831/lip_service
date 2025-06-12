import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDepartmentSchema, insertRegulationSchema, insertPolicySchema, insertAnalysisSchema, insertNotificationSchema } from "@shared/schema";
import { startSchedulers } from "./scheduler";
import { runLawSync } from "./law-sync";
import { runMonthlyAnalysis } from "./monthly-analysis";
import { analyzeDocument } from "./openai";
import { sendEmail } from "./email";
import multer from "multer";
import path from "path";
import * as XLSX from "xlsx";
import fs from "fs";

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize sample data and start schedulers
  await initializeSampleData();
  startSchedulers();

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "대시보드 통계를 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/dashboard/department-progress", async (req, res) => {
    try {
      const progress = await storage.getDepartmentProgress();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "부서별 진행률을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/dashboard/monthly-amendments", async (req, res) => {
    try {
      const amendments = await storage.getMonthlyAmendments();
      res.json(amendments);
    } catch (error) {
      res.status(500).json({ message: "한달 이내 개정 법규 현황을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Departments routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "부서 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const parsed = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(parsed);
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "부서 생성 중 오류가 발생했습니다." });
    }
  });

  app.put("/api/departments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertDepartmentSchema.partial().parse(req.body);
      const department = await storage.updateDepartment(id, parsed);
      res.json(department);
    } catch (error) {
      res.status(400).json({ message: "부서 수정 중 오류가 발생했습니다." });
    }
  });

  // Regulations routes
  app.get("/api/regulations", async (req, res) => {
    try {
      const regulations = await storage.getAllRegulations();
      res.json(regulations);
    } catch (error) {
      res.status(500).json({ message: "법규 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/regulations", async (req, res) => {
    try {
      const parsed = insertRegulationSchema.parse(req.body);
      const regulation = await storage.createRegulation(parsed);
      res.json(regulation);
    } catch (error) {
      res.status(400).json({ message: "법규 생성 중 오류가 발생했습니다." });
    }
  });

  // AI Compliance Analysis endpoint
  app.post("/api/admin/compliance-analysis", async (req, res) => {
    try {
      console.log("🚀 AI 기반 법규 준수 분석 및 이메일 전송 시작...");
      
      const { analyzeRegulationCompliance, generateComplianceReport } = await import("./openai");
      const { sendEmail } = await import("./email");
      
      const regulations = await storage.getAllRegulations();
      const departments = await storage.getAllDepartments();
      
      // Find Information Communication Network Act
      const targetRegulation = regulations.find(reg => 
        reg.name.includes("정보통신망 이용촉진 및 정보보호")
      ) || regulations[0];

      const targetDepartment = departments.find(dept => 
        dept.name.includes("IT") || dept.name.includes("정보")
      ) || departments[0];

      console.log(`📋 분석 대상: ${targetRegulation.name} - ${targetDepartment.name}`);

      // Perform AI analysis
      const analysisResult = await analyzeRegulationCompliance(
        `${targetRegulation.name}\n${targetRegulation.article}\n${targetRegulation.content}`,
        `현재 ${targetDepartment.name} 부서의 개인정보 보호 관련 정책 문서입니다.`,
        targetDepartment.name
      );

      console.log("🤖 AI 분석 완료");

      // Generate email report
      const reportContent = await generateComplianceReport(
        targetRegulation,
        targetDepartment,
        analysisResult
      );

      console.log("📄 보고서 생성 완료");

      // Send actual email
      const emailSent = await sendEmail({
        to: "tbvjakrso@naver.com",
        from: process.env.GMAIL_USER || "",
        subject: "🛡️ ComplianceGuard - 법규 준수 분석 보고서",
        html: reportContent
      });

      console.log("📧 이메일 전송:", emailSent ? "성공" : "실패");

      res.json({
        success: true,
        message: "AI 분석 및 이메일 전송이 완료되었습니다.",
        regulation: targetRegulation.name,
        department: targetDepartment.name,
        analysis: analysisResult,
        emailSent
      });

    } catch (error) {
      console.error("AI 분석 실패:", error);
      res.status(500).json({ 
        error: "AI 분석 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  });



  // Policies routes
  app.get("/api/policies", async (req, res) => {
    try {
      const policies = await storage.getAllPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({ message: "정책 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/policies/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "파일이 업로드되지 않았습니다." });
      }

      const { name, departmentId } = req.body;
      
      // Extract text from file (simplified - in real implementation, use proper text extraction libraries)
      const content = `파일 내용: ${req.file.originalname}`;
      
      const policy = await storage.createPolicy({
        name,
        fileName: req.file.originalname,
        content,
        departmentId: parseInt(departmentId),
      });

      // Start AI analysis
      try {
        const analysis = await analyzeDocument(content);
        await storage.createAnalysis({
          policyId: policy.id,
          departmentId: parseInt(departmentId),
          status: "완료",
          findings: analysis.findings,
          recommendations: analysis.recommendations,
        });
      } catch (analysisError) {
        console.error("AI 분석 실패:", analysisError);
      }

      res.json(policy);
    } catch (error) {
      res.status(500).json({ message: "파일 업로드 중 오류가 발생했습니다." });
    }
  });

  // Excel upload and processing route
  app.post("/api/upload-excel", upload.single('excel'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "엑셀 파일이 필요합니다." });
      }

      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Process Excel data and update regulations
      const processedRegulations = await processExcelData(data);
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        message: "엑셀 데이터 처리 완료", 
        processedCount: processedRegulations.length 
      });
    } catch (error) {
      console.error("엑셀 처리 오류:", error);
      res.status(500).json({ message: "엑셀 파일 처리 중 오류가 발생했습니다." });
    }
  });

  // Analyses routes
  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllAnalyses();
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "분석 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/analyses/department/:departmentId", async (req, res) => {
    try {
      const departmentId = parseInt(req.params.departmentId);
      const analyses = await storage.getAnalysesByDepartment(departmentId);
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ message: "부서별 분석을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "알림 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "알림 읽음 처리 중 오류가 발생했습니다." });
    }
  });

  // Admin routes
  app.post("/api/admin/sync", async (req, res) => {
    try {
      await runLawSync();
      res.json({ message: "법규 동기화가 완료되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "법규 동기화 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/admin/monthly-analysis", async (req, res) => {
    try {
      await runMonthlyAnalysis();
      res.json({ message: "월간 분석이 완료되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "월간 분석 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      console.log(`📧 테스트 이메일 전송 시작: ${email}`);
      
      const success = await sendEmail({
        to: email,
        from: process.env.GMAIL_USER || "",
        subject: "🧪 ComplianceGuard 이메일 테스트",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📧 이메일 시스템 테스트</h2>
            <p>이 이메일은 ComplianceGuard 시스템의 이메일 전송 테스트용입니다.</p>
            <p><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            <p>이메일이 정상적으로 수신되었다면 시스템이 올바르게 작동하고 있습니다.</p>
            <hr>
            <small>ComplianceGuard - AI 기반 법규 준수 모니터링 플랫폼</small>
          </div>
        `
      });
      
      console.log(`📧 테스트 이메일 결과: ${success ? '성공' : '실패'}`);
      
      res.json({ 
        success, 
        message: success ? "테스트 이메일이 성공적으로 전송되었습니다." : "이메일 전송에 실패했습니다."
      });
    } catch (error) {
      console.error("테스트 이메일 전송 오류:", error);
      res.status(500).json({ 
        success: false, 
        message: "이메일 전송 중 오류가 발생했습니다." 
      });
    }
  });

  // Gmail 연결 테스트 엔드포인트
  app.post("/api/admin/test-gmail", async (req, res) => {
    try {
      const { testGmailConnection } = await import('./email-test');
      const success = await testGmailConnection();
      
      res.json({ 
        success, 
        message: success ? "Gmail SMTP 연결 및 테스트 이메일 전송이 성공했습니다." : "Gmail SMTP 연결에 실패했습니다."
      });
    } catch (error) {
      console.error("Gmail 연결 테스트 오류:", error);
      res.status(500).json({ 
        success: false, 
        message: "Gmail 연결 테스트 중 오류가 발생했습니다." 
      });
    }
  });

  // 실제 Gmail 전송 테스트
  app.post("/api/admin/test-real-gmail", async (req, res) => {
    try {
      const { testActualGmailSending } = await import('./gmail-test');
      const success = await testActualGmailSending();
      
      res.json({ 
        success, 
        message: success ? "실제 Gmail 이메일 전송이 성공했습니다!" : "Gmail 이메일 전송에 실패했습니다."
      });
    } catch (error) {
      console.error("실제 Gmail 전송 테스트 오류:", error);
      res.status(500).json({ 
        success: false, 
        message: "Gmail 전송 테스트 중 오류가 발생했습니다." 
      });
    }
  });

  // 한국어 정보보안 테스트 이메일
  app.post("/api/admin/test-korean-security-email", async (req, res) => {
    try {
      const { sendKoreanSecurityTestEmail } = await import('./test-korean-email');
      const success = await sendKoreanSecurityTestEmail();
      
      res.json({ 
        success, 
        message: success ? "정보보안 테스트 이메일이 성공적으로 전송되었습니다!" : "이메일 전송에 실패했습니다."
      });
    } catch (error) {
      console.error("한국어 보안 이메일 전송 오류:", error);
      res.status(500).json({ 
        success: false, 
        message: "이메일 전송 중 오류가 발생했습니다." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function initializeSampleData() {
  try {
    // Create departments
    const departmentData = [
      { name: "인사팀", code: "HR", contactName: "김인사", contactEmail: "hr@company.com", contactPhone: "02-1234-5678" },
      { name: "안전관리팀", code: "SAFETY", contactName: "박안전", contactEmail: "safety@company.com", contactPhone: "02-1234-5679" },
      { name: "환경관리팀", code: "ENV", contactName: "이환경", contactEmail: "env@company.com", contactPhone: "02-1234-5680" },
      { name: "IT보안팀", code: "IT", contactName: "최보안", contactEmail: "it@company.com", contactPhone: "02-1234-5681" },
      { name: "법무팀", code: "LEGAL", contactName: "정법무", contactEmail: "legal@company.com", contactPhone: "02-1234-5682" },
      { name: "재무팀", code: "FINANCE", contactName: "강재무", contactEmail: "finance@company.com", contactPhone: "02-1234-5683" },
      { name: "운영관리팀", code: "OPERATIONS", contactName: "윤운영", contactEmail: "ops@company.com", contactPhone: "02-1234-5684" },
    ];

    for (const dept of departmentData) {
      try {
        await storage.createDepartment(dept);
      } catch (error) {
        // Department might already exist
      }
    }

    // Create Korean regulations (72 laws)
    const koreanLaws = [
      { name: "근로기준법", category: "노동법", content: "근로조건의 기준을 정한 법률" },
      { name: "산업안전보건법", category: "안전법", content: "산업재해 예방과 근로자 보건증진을 위한 법률" },
      { name: "개인정보보호법", category: "정보보호법", content: "개인정보의 처리 및 보호에 관한 법률" },
      { name: "정보통신망 이용촉진 및 정보보호 등에 관한 법률", category: "정보보호법", content: "정보통신망의 이용촉진 및 정보보호에 관한 법률" },
      { name: "공정거래법", category: "경제법", content: "공정하고 자유로운 경쟁을 촉진하기 위한 법률" },
      { name: "환경영향평가법", category: "환경법", content: "환경에 미치는 영향을 미리 평가하는 법률" },
      { name: "대기환경보전법", category: "환경법", content: "대기환경을 보전하고 대기오염으로 인한 국민건강과 환경상의 위해를 예방" },
      { name: "수질 및 수생태계 보전에 관한 법률", category: "환경법", content: "수질보전과 수생태계 보전에 관한 법률" },
      { name: "폐기물관리법", category: "환경법", content: "폐기물의 발생억제와 적정한 관리를 통한 환경보전" },
      { name: "화학물질관리법", category: "환경법", content: "화학물질로 인한 위해를 예방하고 안전을 확보" },
      { name: "소음·진동관리법", category: "환경법", content: "소음과 진동으로 인한 피해를 방지" },
      { name: "악취방지법", category: "환경법", content: "악취로 인한 피해를 방지하고 국민의 생활환경을 보전" },
      { name: "자연환경보전법", category: "환경법", content: "자연환경의 보전과 지속가능한 이용" },
      { name: "생물다양성 보전 및 이용에 관한 법률", category: "환경법", content: "생물다양성의 보전과 지속가능한 이용" },
      { name: "건설기술 진흥법", category: "건설법", content: "건설기술의 진흥과 건설공사의 품질향상" },
      { name: "건축법", category: "건설법", content: "건축물의 안전·기능·환경 및 미관을 향상" },
      { name: "도시계획법", category: "건설법", content: "도시의 건전한 발전과 질서 있는 개발" },
      { name: "국토의 계획 및 이용에 관한 법률", category: "건설법", content: "국토의 계획과 이용에 관한 법률" },
      { name: "건설산업기본법", category: "건설법", content: "건설산업의 건전한 발전" },
      { name: "전기사업법", category: "에너지법", content: "전기사업의 운영과 전기설비의 공급" },
      { name: "가스사업법", category: "에너지법", content: "가스사업의 건전한 발전" },
      { name: "에너지이용 합리화법", category: "에너지법", content: "에너지의 합리적 이용" },
      { name: "신에너지 및 재생에너지 개발·이용·보급 촉진법", category: "에너지법", content: "신재생에너지의 개발·이용·보급 촉진" },
      { name: "화재예방, 소방시설 설치·유지 및 안전관리에 관한 법률", category: "안전법", content: "화재예방과 소방시설의 설치·유지" },
      { name: "재난 및 안전관리 기본법", category: "안전법", content: "재난 및 안전관리의 기본사항" },
      { name: "시설물의 안전 및 유지관리에 관한 특별법", category: "안전법", content: "시설물의 안전과 유지관리" },
      { name: "승강기 안전관리법", category: "안전법", content: "승강기의 안전관리" },
      { name: "고압가스 안전관리법", category: "안전법", content: "고압가스의 안전관리" },
      { name: "위험물안전관리법", category: "안전법", content: "위험물의 안전관리" },
      { name: "액화석유가스의 안전관리 및 사업법", category: "안전법", content: "액화석유가스의 안전관리" },
      { name: "전기안전관리법", category: "안전법", content: "전기설비의 안전관리" },
      { name: "법인세법", category: "세법", content: "법인의 소득에 대한 법인세" },
      { name: "소득세법", category: "세법", content: "개인의 소득에 대한 소득세" },
      { name: "부가가치세법", category: "세법", content: "재화와 용역의 공급에 대한 부가가치세" },
      { name: "특별소비세법", category: "세법", content: "특정 재화에 대한 특별소비세" },
      { name: "증권거래세법", category: "세법", content: "증권거래에 대한 증권거래세" },
      { name: "인지세법", category: "세법", content: "문서작성에 대한 인지세" },
      { name: "종합부동산세법", category: "세법", content: "고액부동산에 대한 종합부동산세" },
      { name: "상속세 및 증여세법", category: "세법", content: "상속과 증여에 대한 세법" },
      { name: "지방세법", category: "세법", content: "지방자치단체의 세입" },
      { name: "국세기본법", category: "세법", content: "국세에 관한 기본법" },
      { name: "관세법", category: "세법", content: "수출입물품에 대한 관세" },
      { name: "상법", category: "상법", content: "상행위와 기업에 관한 법률" },
      { name: "회사법", category: "상법", content: "회사의 설립과 운영에 관한 법률" },
      { name: "보험업법", category: "금융법", content: "보험업의 건전한 발전" },
      { name: "은행법", category: "금융법", content: "은행업의 건전한 발전" },
      { name: "자본시장과 금융투자업에 관한 법률", category: "금융법", content: "자본시장의 공정성과 투명성" },
      { name: "여신전문금융업법", category: "금융법", content: "여신전문금융업의 건전한 발전" },
      { name: "전자금융거래법", category: "금융법", content: "전자금융거래의 안전성과 신뢰성" },
      { name: "민법", category: "민법", content: "사인간의 권리의무 관계" },
      { name: "형법", category: "형법", content: "범죄와 형벌에 관한 법률" },
      { name: "민사소송법", category: "절차법", content: "민사소송절차에 관한 법률" },
      { name: "형사소송법", category: "절차법", content: "형사소송절차에 관한 법률" },
      { name: "행정절차법", category: "행정법", content: "행정절차에 관한 법률" },
      { name: "정부조직법", category: "행정법", content: "정부조직에 관한 법률" },
      { name: "공무원법", category: "행정법", content: "공무원의 신분과 복무" },
      { name: "지방자치법", category: "행정법", content: "지방자치에 관한 법률" },
      { name: "행정기본법", category: "행정법", content: "행정작용에 관한 기본법" },
      { name: "독점규제 및 공정거래에 관한 법률", category: "경제법", content: "경제력집중 방지와 공정거래 확보" },
      { name: "하도급거래 공정화에 관한 법률", category: "경제법", content: "하도급거래의 공정화" },
      { name: "표시·광고의 공정화에 관한 법률", category: "경제법", content: "표시·광고의 공정화" },
      { name: "약관의 규제에 관한 법률", category: "경제법", content: "약관의 규제" },
      { name: "소비자기본법", category: "소비자법", content: "소비자의 권익증진" },
      { name: "제품안전기본법", category: "소비자법", content: "제품의 안전성 확보" },
      { name: "식품안전기본법", category: "식품법", content: "식품안전에 관한 기본법" },
      { name: "식품위생법", category: "식품법", content: "식품의 위생적 관리" },
      { name: "건강기능식품에 관한 법률", category: "식품법", content: "건강기능식품의 안전성과 기능성" },
      { name: "축산물 위생관리법", category: "식품법", content: "축산물의 위생적 관리" },
      { name: "수산물품질관리법", category: "식품법", content: "수산물의 품질관리" },
      { name: "농산물품질관리법", category: "식품법", content: "농산물의 품질관리" },
      { name: "저작권법", category: "지식재산권법", content: "저작자의 권리와 이에 인접하는 권리" },
      { name: "특허법", category: "지식재산권법", content: "발명의 보호와 이용" },
      { name: "상표법", category: "지식재산권법", content: "상표의 보호와 사용" },
      { name: "디자인보호법", category: "지식재산권법", content: "디자인의 보호와 이용" },
    ];

    for (const law of koreanLaws) {
      try {
        await storage.createRegulation({
          ...law,
          article: `제1조`,
          effectiveDate: new Date(),
        });
      } catch (error) {
        // Regulation might already exist
      }
    }

    // Create initial notifications
    const notifications = [
      {
        type: "법규변경",
        title: "개인정보보호법 개정안 발표",
        message: "개인정보보호법 일부개정법률안이 국회를 통과하였습니다.",
      },
      {
        type: "시스템",
        title: "월간 분석 완료",
        message: "12월 월간 법규 분석이 완료되었습니다.",
      },
      {
        type: "긴급",
        title: "산업안전보건법 긴급 공지",
        message: "새로운 안전기준이 즉시 시행됩니다.",
      },
    ];

    for (const notification of notifications) {
      try {
        await storage.createNotification(notification);
      } catch (error) {
        // Notification might already exist
      }
    }

  } catch (error) {
    console.error("샘플 데이터 초기화 실패:", error);
  }
}

// 엑셀 데이터 처리 함수
async function processExcelData(data: any[]): Promise<any[]> {
  const processedRegulations: any[] = [];
  
  // 헤더 행을 제외하고 데이터 처리 (첫 번째 행은 헤더로 간주)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // 엑셀 열 인덱스 (0부터 시작)
    // D열(3): 시행일자, F열(5): 법률명, J열(9): 부서
    const effectiveDate = row[3]; // D열
    const lawName = row[5]; // F열  
    const department = row[9]; // J열
    
    if (!lawName) continue; // 법률명이 없으면 건너뛰기
    
    try {
      // 시행일자 파싱
      let parsedDate = null;
      if (effectiveDate) {
        // 엑셀 날짜가 숫자로 저장된 경우 처리
        if (typeof effectiveDate === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          parsedDate = new Date(excelEpoch.getTime() + (effectiveDate - 2) * 24 * 60 * 60 * 1000);
        } else if (typeof effectiveDate === 'string') {
          parsedDate = new Date(effectiveDate);
        }
      }
      
      // 부서명을 기준으로 카테고리 매핑
      let category = "기타";
      if (department) {
        if (department.includes("환경") || department.includes("안전")) {
          category = "환경안전법";
        } else if (department.includes("IT") || department.includes("정보")) {
          category = "정보보호법";
        } else if (department.includes("인사") || department.includes("노무")) {
          category = "노동법";
        }
      }
      
      // 법규 데이터 생성
      const regulation = await storage.createRegulation({
        name: lawName,
        article: "제1조",
        content: `${lawName}에 대한 규정`,
        effectiveDate: parsedDate || new Date(),
        priority: "보통",
        category: category
      });
      
      processedRegulations.push(regulation);
      
    } catch (error) {
      console.error(`법규 ${lawName} 처리 중 오류:`, error);
    }
  }
  
  return processedRegulations;
}
