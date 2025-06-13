import type { Express } from "express";
import { createServer, type Server } from "http";
import { ExcelService } from "./excelService";
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
  // Initialize Excel service
  const excelService = ExcelService.getInstance();

  // Excel-based legal regulations routes
  app.get("/api/regulations", async (req, res) => {
    try {
      const { department, type, search } = req.query;
      let regulations;
      
      if (search) {
        regulations = await excelService.searchRegulations(search as string);
      } else if (department) {
        regulations = await excelService.getRegulationsByDepartment(department as string);
      } else if (type) {
        regulations = await excelService.getRegulationsByType(type as string);
      } else {
        regulations = await excelService.getAllRegulations();
      }
      
      res.json(regulations);
    } catch (error) {
      console.error('Error fetching regulations:', error);
      res.status(500).json({ message: "법규 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/regulations/:id", async (req, res) => {
    try {
      const regulation = await excelService.getRegulationById(req.params.id);
      if (!regulation) {
        return res.status(404).json({ message: "법규를 찾을 수 없습니다." });
      }
      res.json(regulation);
    } catch (error) {
      console.error('Error fetching regulation:', error);
      res.status(500).json({ message: "법규를 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await excelService.getDepartments();
      res.json(departments.map(name => ({ name, code: name })));
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({ message: "부서 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/regulation-types", async (req, res) => {
    try {
      const types = await excelService.getRegulationTypes();
      res.json(types);
    } catch (error) {
      console.error('Error fetching regulation types:', error);
      res.status(500).json({ message: "법령 종류를 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const regulations = await excelService.getAllRegulations();
      const departments = await excelService.getDepartments();
      
      // 2025년 시행 예정 법규 계산
      const yearlyAmendments = regulations.filter(r => {
        if (!r.시행일자 || r.시행일자 === 'None') return false;
        return r.시행일자.includes('2025');
      });
      
      const stats = {
        totalRegulations: regulations.length,
        totalDepartments: departments.length,
        riskItems: regulations.filter(r => 
          r['AI 후속 조치 사항'] && r['AI 후속 조치 사항'] !== '내용/조치사항 없음'
        ).length,
        yearlyAmendments: yearlyAmendments.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "대시보드 통계를 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/dashboard/department-progress", async (req, res) => {
    try {
      const departments = await excelService.getDepartments();
      const progress = departments.map(dept => ({
        name: dept,
        completed: Math.floor(Math.random() * 50) + 30, // Mock data
        total: Math.floor(Math.random() * 100) + 50
      }));
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "부서별 진행률을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/dashboard/monthly-amendments", async (req, res) => {
    try {
      const regulations = await excelService.getAllRegulations();
      
      const amendments = regulations.filter(r => {
        if (!r.시행일자 || r.시행일자 === 'None') return false;
        // 2025년 6월 이후의 법규만 표시
        return r.시행일자.includes('2025') && r.시행일자.includes('-06');
      }).map(r => ({
        name: r.법률명,
        type: r.법령종류,
        effectiveDate: r.시행일자,
        department: r.담당부서
      }));
      res.json(amendments);
    } catch (error) {
      res.status(500).json({ message: "한달 이내 개정 법규 현황을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 2025년 연간 시행 예정 법규 API 추가
  app.get("/api/dashboard/yearly-amendments", async (req, res) => {
    try {
      const regulations = await excelService.getAllRegulations();
      
      const yearlyAmendments = regulations.filter(r => {
        if (!r.시행일자 || r.시행일자 === 'None') return false;
        // 2025년도의 모든 법규
        return r.시행일자.includes('2025');
      });

      res.json({
        year: 2025,
        totalCount: yearlyAmendments.length,
        amendments: yearlyAmendments.map(r => ({
          name: r.법률명,
          type: r.법령종류,
          effectiveDate: r.시행일자,
          department: r.담당부서
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "연간 시행 예정 법규 현황을 가져오는 중 오류가 발생했습니다." });
    }
  });


  // AI Compliance Analysis endpoint
  app.post("/api/admin/compliance-analysis", async (req, res) => {
    try {
      console.log("🚀 AI 기반 법규 준수 분석 및 이메일 전송 시작...");
      
      const { senderEmail, recipientEmail } = req.body;
      const regulations = await excelService.getAllRegulations();
      const departments = await excelService.getDepartments();
      
      // Find target regulation with AI analysis from Excel data
      const targetRegulation = regulations.find(reg => 
        reg['AI 후속 조치 사항'] && 
        reg['AI 후속 조치 사항'] !== '내용/조치사항 없음' &&
        reg['AI 주요 개정 정리'] && 
        reg['AI 주요 개정 정리'] !== '- [개정이유]: 없음\n\n- [주요내용]: 없음'
      ) || regulations[0];

      const targetDepartment = targetRegulation?.담당부서 || "안전보건기획그룹";

      console.log(`📋 분석 대상: ${targetRegulation?.법률명} - ${targetDepartment}`);

      // Generate AI compliance email
      const emailSubject = `🚨 긴급 [고위험] ${targetDepartment} 법규 준수 알림: ${targetRegulation?.법률명}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔴 ${targetDepartment} 긴급 알림</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">시행일자: ${targetRegulation?.시행일자} | 위험도: 고위험 | 필수 대응: 즉시 조치 필요</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">💡 ${targetRegulation?.법률명} - AI 분석 결과</h2>
              <div style="color: #1e40af; white-space: pre-wrap;">${targetRegulation?.['AI 주요 개정 정리'] || '주요 개정 내용이 분석되었습니다.'}</div>
            </div>
            
            <div style="background: #dcfce7; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a;">
              <h2 style="margin: 0 0 15px 0; color: #15803d; font-size: 18px;">📋 ${targetDepartment} 이행 조치사항 (액션 아이템)</h2>
              <div style="color: #15803d;">
                <div style="font-weight: bold; margin-bottom: 10px;">🔧 즉시 조치사항 (7일 이내):</div>
                <div style="white-space: pre-wrap; background: white; padding: 15px; border-radius: 6px; border: 1px solid #bbf7d0;">
${targetRegulation?.['AI 후속 조치 사항'] || '후속 조치사항이 분석되었습니다.'}
                </div>
              </div>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h3 style="margin: 0 0 10px 0; color: #374151;">📞 문의 및 지원</h3>
              <p style="margin: 0; color: #6b7280;">
                추가 문의사항이 있으시면 법무팀(${senderEmail})으로 연락해 주세요.<br>
                긴급한 사안의 경우 즉시 연락 바랍니다.
              </p>
            </div>
          </div>
          
          <div style="background: #374151; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px;">
            <small>ComplianceGuard - AI 기반 법규 준수 모니터링 플랫폼 | 발송시간: ${new Date().toLocaleString('ko-KR')}</small>
          </div>
        </div>
      `;

      // Send email
      const emailSent = await sendEmail({
        to: recipientEmail,
        from: senderEmail,
        subject: emailSubject,
        html: emailHtml
      });

      console.log(`📧 이메일 전송 결과: ${emailSent ? '성공' : '실패'}`);

      res.json({
        success: emailSent,
        message: emailSent ? "AI 분석 및 이메일 전송이 완료되었습니다." : "이메일 전송에 실패했습니다.",
        regulation: targetRegulation?.법률명,
        department: targetDepartment,
        emailSent,
        recipientEmail
      });

    } catch (error) {
      console.error("AI 분석 실패:", error);
      res.status(500).json({ 
        success: false,
        message: "AI 분석 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      });
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

  // Notifications routes (Excel-based mock data)
  app.get("/api/notifications", async (req, res) => {
    try {
      const mockNotifications = [
        {
          id: 1,
          type: "법규변경",
          title: "개인정보보호법 개정안 발표",
          message: "개인정보보호법 일부개정법률안이 국회를 통과하였습니다.",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          type: "시스템",
          title: "월간 분석 완료",
          message: "6월 월간 법규 분석이 완료되었습니다.",
          createdAt: new Date().toISOString()
        }
      ];
      res.json(mockNotifications);
    } catch (error) {
      res.status(500).json({ message: "알림 목록을 가져오는 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "알림 읽음 처리 중 오류가 발생했습니다." });
    }
  });

  // Admin routes (Excel-based simulation)
  app.post("/api/admin/sync", async (req, res) => {
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1000));
      res.json({ message: "Excel 데이터 동기화가 완료되었습니다." });
    } catch (error) {
      res.status(500).json({ message: "동기화 중 오류가 발생했습니다." });
    }
  });

  app.post("/api/admin/monthly-analysis", async (req, res) => {
    try {
      console.log("🔍 월간 분석 수동 실행 시작...");
      
      const { runImmediateMonthlyAnalysis } = await import('./scheduler');
      const analysisResult = await runImmediateMonthlyAnalysis();
      
      console.log("✅ 월간 분석 수동 실행 완료");
      
      res.json({ 
        success: true,
        message: "월간 분석이 성공적으로 완료되었습니다.",
        result: analysisResult || "분석이 완료되었습니다.",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("❌ 월간 분석 실행 실패:", error);
      res.status(500).json({ 
        success: false,
        message: "월간 분석 중 오류가 발생했습니다.",
        error: error.message || "알 수 없는 오류",
        timestamp: new Date().toISOString()
      });
    }
  });

  app.post("/api/admin/test-monthly-upcoming-email", async (req, res) => {
    try {
      console.log("🧪 월간 시행 예정 법규 이메일 테스트 시작...");
      
      const { departmentEmails } = req.body;
      
      if (departmentEmails && Array.isArray(departmentEmails)) {
        // 부서별 이메일이 지정된 경우 커스텀 발송
        const { sendCustomMonthlyUpcomingRegulations } = await import('./scheduler');
        await sendCustomMonthlyUpcomingRegulations(departmentEmails);
      } else {
        // 기본 발송
        const { sendMonthlyUpcomingRegulations } = await import('./scheduler');
        await sendMonthlyUpcomingRegulations();
      }
      
      res.json({ 
        success: true,
        message: "월간 시행 예정 법규 이메일 테스트가 완료되었습니다." 
      });
    } catch (error) {
      console.error("월간 시행 예정 법규 이메일 테스트 실패:", error);
      res.status(500).json({ 
        success: false,
        message: "월간 시행 예정 법규 이메일 테스트 중 오류가 발생했습니다.",
        error: error instanceof Error ? error.message : "알 수 없는 오류"
      });
    }
  });

  app.post("/api/admin/test-email", async (req, res) => {
    try {
      const { email, subject, message } = req.body;
      console.log(`📧 테스트 이메일 전송 시작: ${email}`);
      
      const success = await sendEmail({
        to: email,
        from: process.env.GMAIL_USER || "",
        subject: subject || "🧪 ComplianceGuard 이메일 테스트",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📧 이메일 시스템 테스트</h2>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #334155;">메시지 내용:</h3>
              <p style="margin: 0; white-space: pre-wrap; color: #475569;">${message || '테스트 메시지입니다.'}</p>
            </div>
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

  // 이메일 서비스 테스트 엔드포인트 (Gmail 우선, SendGrid 대체)
  app.post("/api/admin/test-email-service", async (req, res) => {
    try {
      console.log('🔧 이메일 서비스 연결 테스트 시작...');
      
      const { sendEmail } = await import('./email');
      const testEmail = process.env.GMAIL_USER || process.env.SENDGRID_FROM_EMAIL || "test@example.com";
      
      const success = await sendEmail({
        to: testEmail,
        from: testEmail,
        subject: "🧪 이메일 서비스 연결 테스트",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">✅ 이메일 서비스 연결 테스트 성공!</h2>
            <p>이 이메일이 수신되었다면 이메일 설정이 올바르게 구성되었습니다.</p>
            <p><strong>테스트 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            <p><strong>사용된 서비스:</strong> ${process.env.GMAIL_USER ? 'Gmail SMTP' : 'SendGrid API'}</p>
            <p><strong>발신자:</strong> ${testEmail}</p>
            <hr>
            <small>ComplianceGuard - 이메일 서비스 연결 테스트</small>
          </div>
        `
      });
      
      const serviceName = process.env.GMAIL_USER ? 'Gmail SMTP' : process.env.SENDGRID_API_KEY ? 'SendGrid API' : '데모 모드';
      
      res.json({ 
        success, 
        message: success 
          ? `${serviceName} 연결 및 테스트 이메일 전송이 성공했습니다.` 
          : `${serviceName} 연결에 실패했습니다.`,
        service: serviceName
      });
    } catch (error) {
      console.error("이메일 서비스 테스트 오류:", error);
      res.status(500).json({ 
        success: false, 
        message: "이메일 서비스 테스트 중 오류가 발생했습니다." 
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

  // 이메일 로그 확인 엔드포인트
  app.get("/api/admin/email-logs", async (req, res) => {
    try {
      const logPath = path.join(process.cwd(), 'logging.txt');
      
      if (!fs.existsSync(logPath)) {
        return res.json({ 
          exists: false, 
          message: "로그 파일이 아직 생성되지 않았습니다.",
          logs: ""
        });
      }
      
      const logContent = fs.readFileSync(logPath, 'utf8');
      const lines = logContent.split('\n');
      
      // 최근 50줄만 반환
      const recentLines = lines.slice(-50).join('\n');
      
      res.json({ 
        exists: true, 
        message: "이메일 로그를 성공적으로 불러왔습니다.",
        logs: recentLines,
        totalLines: lines.length
      });
    } catch (error) {
      console.error("이메일 로그 읽기 오류:", error);
      res.status(500).json({ 
        exists: false,
        message: "로그 파일 읽기 중 오류가 발생했습니다.",
        logs: ""
      });
    }
  });

  // 이메일 로그 삭제 엔드포인트
  app.delete("/api/admin/email-logs", async (req, res) => {
    try {
      const logPath = path.join(process.cwd(), 'logging.txt');
      
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
        res.json({ 
          success: true, 
          message: "이메일 로그가 성공적으로 삭제되었습니다."
        });
      } else {
        res.json({ 
          success: true, 
          message: "삭제할 로그 파일이 없습니다."
        });
      }
    } catch (error) {
      console.error("이메일 로그 삭제 오류:", error);
      res.status(500).json({ 
        success: false,
        message: "로그 파일 삭제 중 오류가 발생했습니다."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}


// 엑셀 데이터 처리 함수 (Excel-based simulation)
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
      
      // 법규 데이터 시뮬레이션
      const regulation = {
        id: processedRegulations.length + 1,
        name: lawName,
        category: category,
        effectiveDate: parsedDate || new Date(),
        department: department
      };
      
      processedRegulations.push(regulation);
      
    } catch (error) {
      console.error(`법규 ${lawName} 처리 중 오류:`, error);
    }
  }
  
  return processedRegulations;
}
