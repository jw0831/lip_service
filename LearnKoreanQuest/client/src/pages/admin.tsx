import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Settings,
  RefreshCw,
  FileText,
  Users,
  Building2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Mail,
  BarChart3,
  Bot,
  Play,
  FileSearch,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface LegalRegulation {
  번호: string;
  법률명: string;
  법령종류: string;
  담당부서: string;
  시행일자: string;
  'AI 주요 개정 정리': string;
  'AI 후속 조치 사항': string;
  '제정·개정구분': string;
}

interface DepartmentProgress {
  name: string;
  completed: number;
  total: number;
}

interface DashboardStats {
  totalRegulations: number;
  totalDepartments: number;
  totalAnalyses: number;
  pendingReviews: number;
}

// Email form schemas
const emailSchema = z.object({
  to: z.string().email("유효한 이메일 주소를 입력해주세요"),
  subject: z.string().min(1, "제목을 입력해주세요"),
  message: z.string().min(1, "메시지를 입력해주세요"),
});

const complianceEmailSchema = z.object({
  senderEmail: z.string().email("유효한 발신자 이메일을 입력해주세요"),
  recipientEmail: z.string().email("유효한 수신자 이메일을 입력해주세요"),
});

const departmentEmailSchema = z.object({
  departmentEmails: z.array(z.object({
    department: z.string().min(1, "부서명을 선택해주세요"),
    email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  })).min(1, "최소 1개 부서의 이메일을 입력해주세요"),
});

type EmailFormData = z.infer<typeof emailSchema>;
type ComplianceEmailFormData = z.infer<typeof complianceEmailSchema>;
type DepartmentEmailFormData = z.infer<typeof departmentEmailSchema>;

export default function Admin() {
  const [testEmail, setTestEmail] = useState("");
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isComplianceEmailDialogOpen, setIsComplianceEmailDialogOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isMonthlyEmailDialogOpen, setIsMonthlyEmailDialogOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState("");
  const { toast } = useToast();

  // Email forms
  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: "",
      subject: "🧪 ComplianceGuard 테스트 이메일",
      message: "안녕하세요,\n\n이것은 ComplianceGuard 시스템의 테스트 이메일입니다.\n\n감사합니다.",
    },
  });

  const complianceForm = useForm<ComplianceEmailFormData>({
    resolver: zodResolver(complianceEmailSchema),
    defaultValues: {
      senderEmail: "tbvjakrso@hufs-gsuite.kr",
      recipientEmail: "", // 수신자는 빈 문자열로 시작하여 사용자가 직접 입력하도록 함
    },
  });

  const departmentEmailForm = useForm<DepartmentEmailFormData>({
    resolver: zodResolver(departmentEmailSchema),
    defaultValues: {
      departmentEmails: [
        { department: "인사문화그룹", email: "" },
        { department: "환경기획그룹", email: "" },
        { department: "안전보건기획그룹", email: "" },
        { department: "정보보호사무국", email: "" },
        { department: "회계세무그룹", email: "" },
        { department: "법무실", email: "" },
        { department: "노사협력그룹", email: "" },
        { department: "윤리경영사무국", email: "" },
      ],
    },
  });

  const { data: regulations, isLoading: regulationsLoading } = useQuery<LegalRegulation[]>({
    queryKey: ["/api/regulations"],
  });

  const { data: departmentProgress, isLoading: progressLoading } = useQuery<DepartmentProgress[]>({
    queryKey: ["/api/dashboard/department-progress"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Email mutations
  const emailMutation = useMutation({
    mutationFn: (data: EmailFormData) => apiRequest("POST", "/api/admin/test-email", { 
      email: data.to,
      subject: data.subject,
      message: data.message 
    }),
    onSuccess: () => {
      toast({
        title: "이메일 전송 완료",
        description: "테스트 이메일이 성공적으로 전송되었습니다.",
      });
      setIsEmailDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "이메일 전송 실패",
        description: "이메일 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const complianceAnalysisMutation = useMutation({
    mutationFn: (data: ComplianceEmailFormData) => 
      apiRequest("POST", "/api/admin/compliance-analysis", data),
    onSuccess: () => {
      toast({
        title: "AI 분석 및 이메일 전송 완료",
        description: "법규 준수 분석이 완료되고 이메일이 전송되었습니다.",
      });
      setIsComplianceEmailDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "AI 분석 실패",
        description: "AI 분석 또는 이메일 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const monthlyAnalysisMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/monthly-analysis"),
    onSuccess: () => {
      toast({
        title: "월간 분석 완료",
        description: "월간 법규 분석이 성공적으로 완료되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "월간 분석 실패",
        description: "월간 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const sendgridTestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/test-email-service"),
    onSuccess: () => {
      toast({
        title: "이메일 테스트 성공",
        description: "이메일 서비스 연결이 성공했습니다.",
      });
    },
    onError: () => {
      toast({
        title: "이메일 테스트 실패",
        description: "이메일 서비스 연결에 실패했습니다. 설정을 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const emailLogsMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/admin/email-logs"),
    onSuccess: (data: any) => {
      setEmailLogs(data.logs || "로그가 없습니다.");
      setIsLogDialogOpen(true);
      toast({
        title: "로그 불러오기 성공",
        description: `총 ${data.totalLines || 0}줄의 로그를 불러왔습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "로그 불러오기 실패",
        description: "로그 파일을 불러올 수 없습니다.",
        variant: "destructive",
      });
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/admin/email-logs"),
    onSuccess: () => {
      setEmailLogs("");
      toast({
        title: "로그 삭제 완료",
        description: "이메일 로그가 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "로그 삭제 실패",
        description: "로그 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const monthlyUpcomingEmailTestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/test-monthly-upcoming-email"),
    onSuccess: () => {
      toast({
        title: "월간 시행 예정 법규 이메일 테스트 완료",
        description: "모든 부서에 시행 예정 법규 이메일이 발송되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "월간 시행 예정 법규 이메일 테스트 실패",
        description: "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const customMonthlyEmailMutation = useMutation({
    mutationFn: (data: DepartmentEmailFormData) => 
      apiRequest("POST", "/api/admin/test-monthly-upcoming-email", data),
    onSuccess: () => {
      toast({
        title: "부서별 월간 시행 예정 법규 이메일 전송 완료",
        description: "지정된 부서들에 시행 예정 법규 이메일이 발송되었습니다.",
      });
      setIsMonthlyEmailDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "부서별 월간 시행 예정 법규 이메일 전송 실패",
        description: "이메일 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Excel 데이터에서 통계 계산
  const adminStats = regulations ? {
    totalRegulations: regulations.length,
    analyzedRegulations: regulations.filter(r => 
      r['AI 주요 개정 정리'] && r['AI 주요 개정 정리'] !== '- [개정이유]: 없음\n\n- [주요내용]: 없음'
    ).length,
    pendingReviews: regulations.filter(r => 
      r['AI 후속 조치 사항'] === '내용/조치사항 없음'
    ).length,
    departments: Array.from(new Set(regulations.map(r => r.담당부서).filter(d => d && d !== 'None'))).length,
    upcomingRegulations: regulations.filter(r => {
      if (!r.시행일자 || r.시행일자 === 'None') return false;
      const effectiveDate = new Date(r.시행일자);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return effectiveDate > now && effectiveDate <= thirtyDaysFromNow;
    }).length
  } : {
    totalRegulations: 0,
    analyzedRegulations: 0,
    pendingReviews: 0,
    departments: 0,
    upcomingRegulations: 0
  };

  // Email form handlers
  const onEmailSubmit = (data: EmailFormData) => {
    emailMutation.mutate(data);
  };

  const handleSync = async () => {
    setSyncInProgress(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 동기화 시뮬레이션
      queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
      toast({
        title: "동기화 완료",
        description: "Excel 데이터가 성공적으로 새로고침되었습니다.",
      });
    } catch (error) {
      toast({
        title: "동기화 실패",
        description: "데이터 동기화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleAnalysis = async () => {
    setAnalysisInProgress(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // 분석 시뮬레이션
      toast({
        title: "AI 분석 완료",
        description: "모든 법규에 대한 AI 분석이 완료되었습니다.",
      });
    } catch (error) {
      toast({
        title: "분석 실패",
        description: "AI 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setAnalysisInProgress(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "이메일 주소 필요",
        description: "테스트 이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 이메일 전송 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "테스트 이메일 전송 완료",
        description: `${testEmail}로 테스트 이메일이 전송되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "이메일 전송 실패",
        description: "테스트 이메일 전송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const exportData = () => {
    if (!regulations) return;
    
    // CSV 형태로 데이터 변환
    const headers = ['번호', '법률명', '법령종류', '담당부서', '시행일자', '제정·개정구분'];
    const csvContent = [
      headers.join(','),
      ...regulations.map(reg => [
        reg.번호,
        `"${reg.법률명}"`,
        reg.법령종류,
        reg.담당부서,
        reg.시행일자,
        reg['제정·개정구분']
      ].join(','))
    ].join('\n');

    // 다운로드
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `legal_regulations_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "데이터 내보내기 완료",
      description: "법규 데이터가 CSV 파일로 다운로드되었습니다.",
    });
  };

  const getDepartmentColor = (deptName: string) => {
    const colors = {
      "인사문화그룹": "bg-blue-500",
      "환경기획그룹": "bg-green-500", 
      "안전보건기획그룹": "bg-orange-500",
      "정보보호사무국": "bg-purple-500",
      "회계세무그룹": "bg-indigo-500",
      "법무실": "bg-red-500",
      "노사협력그룹": "bg-yellow-500",
      "윤리경영사무국": "bg-pink-500",
    };
    return colors[deptName as keyof typeof colors] || "bg-gray-500";
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">관리자 페이지</h2>
            <p className="text-slate-600 mt-1">시스템 관리 및 설정을 수행합니다</p>
          </div>
          <div className="flex space-x-4">
            <Button onClick={handleSync} disabled={syncInProgress}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
              {syncInProgress ? '동기화 중...' : '데이터 새로고침'}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Email Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                이메일 시스템 테스트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">이메일 서비스 상태</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Gmail SMTP 및 SendGrid API 하이브리드 이메일 발송 서비스가 대기 중입니다.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    발송 대기열: 0건
                  </span>
                  <Badge className="bg-green-100 text-green-800">대기</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => sendgridTestMutation.mutate()}
                  disabled={sendgridTestMutation.isPending}
                  className="w-full" 
                  variant="secondary"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {sendgridTestMutation.isPending ? "테스트 중..." : "이메일 서비스 연결 테스트"}
                </Button>
                
                <Button 
                  onClick={() => emailLogsMutation.mutate()}
                  disabled={emailLogsMutation.isPending}
                  className="w-full" 
                  variant="outline"
                >
                  <FileSearch className="h-4 w-4 mr-2" />
                  {emailLogsMutation.isPending ? "로그 로딩 중..." : "이메일 로그 확인"}
                </Button>
                
                <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      테스트 이메일 발송
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>테스트 이메일 발송</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>받는 사람</FormLabel>
                            <FormControl>
                              <Input placeholder="테스트@예시.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>제목</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>메시지</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEmailDialogOpen(false)}
                        >
                          취소
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={emailMutation.isPending}
                        >
                          {emailMutation.isPending ? "발송 중..." : "이메일 발송"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                AI 분석 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">월간 자동 분석</h4>
                <p className="text-sm text-slate-600 mb-3">
                  매월 1일 오전 9시에 전체 부서에 대한 법규 준수 분석을 자동으로 실행합니다.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    다음 실행: 2025년 1월 1일 09:00
                  </span>
                  <Badge className="bg-green-100 text-green-800">활성화</Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => monthlyAnalysisMutation.mutate()}
                  disabled={monthlyAnalysisMutation.isPending}
                  className="w-full"
                  variant="secondary"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {monthlyAnalysisMutation.isPending ? "분석 중..." : "월간 분석 수동 실행"}
                </Button>

                <Button 
                  onClick={() => monthlyUpcomingEmailTestMutation.mutate()}
                  disabled={monthlyUpcomingEmailTestMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {monthlyUpcomingEmailTestMutation.isPending ? "발송 중..." : "월간 시행 예정 법규 이메일 테스트 (기본)"}
                </Button>

                <Dialog open={isMonthlyEmailDialogOpen} onOpenChange={setIsMonthlyEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Mail className="h-4 w-4 mr-2" />
                      월간 시행 예정 법규 이메일 테스트 (부서별 이메일 지정)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Mail className="h-5 w-5 mr-2" />
                        부서별 월간 시행 예정 법규 이메일 테스트
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="text-sm text-slate-600 mb-4">
                      종합현황에서 집계된 부서별 적용 법규 개정 현황 ({new Date().getMonth() + 1}월)의 상세보기 내용 중 시행예정 정보들을 
                      아래 지정된 이메일 주소로 전송합니다.
                    </div>

                    <Form {...departmentEmailForm}>
                      <form className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {departmentEmailForm.watch("departmentEmails").map((_, index) => (
                            <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <div className={`w-3 h-3 rounded-full ${getDepartmentColor(departmentEmailForm.watch(`departmentEmails.${index}.department`))}`}></div>
                                <h4 className="font-medium text-slate-900">
                                  {departmentEmailForm.watch(`departmentEmails.${index}.department`)}
                                </h4>
                              </div>
                              
                              <FormField
                                control={departmentEmailForm.control}
                                name={`departmentEmails.${index}.email`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">이메일 주소</FormLabel>
                                    <FormControl>
                                      <Input 
                                        {...field} 
                                        placeholder={`${departmentEmailForm.watch(`departmentEmails.${index}.department`)}@company.com`}
                                        className="text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-200 pt-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-2">📋 이메일 내용 미리보기</h4>
                            <p className="text-sm text-blue-800 mb-2">
                              • 제목: 📋 [부서명] {new Date().getMonth() + 1}월 시행 예정 법규 안내
                            </p>
                            <p className="text-sm text-blue-800 mb-2">
                              • 내용: {new Date().getMonth() + 1}월에 시행 예정인 부서별 법규들의 상세 정보
                            </p>
                            <p className="text-sm text-blue-800">
                              • AI 주요 개정 정리 및 후속 조치 사항 포함
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsMonthlyEmailDialogOpen(false)}
                          >
                            취소
                          </Button>
                          <Button 
                            type="button"
                            onClick={() => {
                              const formData = departmentEmailForm.getValues();
                              // 이메일이 입력된 부서만 필터링
                              const validDepartmentEmails = formData.departmentEmails.filter(de => de.email.trim() !== "");
                              if (validDepartmentEmails.length === 0) {
                                toast({
                                  title: "이메일 주소 필요",
                                  description: "최소 1개 부서의 이메일 주소를 입력해주세요.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              customMonthlyEmailMutation.mutate({ departmentEmails: validDepartmentEmails });
                            }}
                            disabled={customMonthlyEmailMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {customMonthlyEmailMutation.isPending ? "전송 중..." : `이메일 발송 (${departmentEmailForm.watch("departmentEmails").filter(de => de.email.trim() !== "").length}개 부서)`}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isComplianceEmailDialogOpen} onOpenChange={setIsComplianceEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <Bot className="h-4 w-4 mr-2" />
                      AI 법규 분석 & 이메일 전송
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center">
                        <Bot className="h-5 w-5 mr-2" />
                        AI 후속조치사항 이메일 발송
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="text-sm text-slate-600 mb-4">
                      엑셀 데이터의 AI 후속조치사항을 분석하여 담당 부서에 맞춤형 이메일을 발송합니다.
                    </div>

                    <Form {...complianceForm}>
                      <form className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={complianceForm.control}
                            name="senderEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>발신자 이메일</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={complianceForm.control}
                            name="recipientEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>수신자 이메일</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="수신자@예시.com"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="border rounded-lg p-4 bg-slate-50">
                          <h3 className="font-medium mb-3">테스트 이메일 내용 미리보기</h3>
                          <div className="text-sm space-y-2">
                            <div className="font-medium">제목: 🚨 긴급 [고위험] 안전관리 법규 준수 알림: 산업안전보건법령 시행규칙</div>
                            
                            <div className="bg-white p-4 rounded border text-xs">
                              <div className="text-red-600 font-bold mb-2">🔴 안전관리 긴급 알림 (D-15일)</div>
                              <div className="mb-2">시행일자: 2024-07-01 | 위험도: 고위험 | 필수 대응: 즉시 조치 필요</div>
                              
                              <div className="bg-blue-50 p-3 rounded mb-3">
                                <div className="font-bold text-blue-800 mb-1">💡 산업안전보건법 위험성 평가 결과</div>
                                <div className="text-blue-700">위험요인 식별: 중대재해처벌법 강화에 따른 안전관리체계 재정비 필요</div>
                              </div>
                              
                              <div className="bg-green-50 p-3 rounded">
                                <div className="font-bold text-green-800 mb-2">📋 안전관리 이행 조치사항 (액션 아이템)</div>
                                <div className="text-green-700">
                                  <div className="font-bold mb-1">🔧 즉시 조치사항 (7일 이내):</div>
                                  <ul className="list-disc list-inside space-y-1">
                                    <li>안전보건관리책임자 지정 및 교육 이수 확인</li>
                                    <li>작업환경측정 실시 현황 점검</li>
                                    <li>위험성평가 실시 및 개선대책 수립</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsComplianceEmailDialogOpen(false)}
                          >
                            취소
                          </Button>
                          <Button 
                            type="button"
                            onClick={() => {
                              const formData = complianceForm.getValues();
                              complianceAnalysisMutation.mutate(formData);
                            }}
                            disabled={complianceAnalysisMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            {complianceAnalysisMutation.isPending ? "전송 중..." : "이메일 발송"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                <p className="text-xs text-slate-500 text-center">
                  AI 분석을 통해 법규 준수 보고서를 생성하고 하이브리드 이메일 서비스로 전송합니다.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Email Logs Dialog */}
        <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileSearch className="h-5 w-5 mr-2" />
                  이메일 로그 확인
                </span>
                <Button
                  onClick={() => clearLogsMutation.mutate()}
                  disabled={clearLogsMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {clearLogsMutation.isPending ? "삭제 중..." : "로그 삭제"}
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto">
              <div className="p-4 bg-slate-900 text-green-400 rounded font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                {emailLogs || "로그가 없습니다."}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-slate-600">
                최근 50줄의 로그를 표시합니다. 전체 로그는 서버의 logging.txt 파일에서 확인할 수 있습니다.
              </div>
              <Button
                onClick={() => setIsLogDialogOpen(false)}
                variant="outline"
              >
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>최근 업데이트된 법규</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regulationsLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 animate-pulse">
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded w-16"></div>
                  </div>
                ))
              ) : (
                regulations?.slice(0, 10).map((regulation, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {regulation.법률명}
                      </p>
                      <p className="text-xs text-slate-500">
                        {regulation.담당부서} • {regulation.법령종류} • {regulation['제정·개정구분']}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={regulation['제정·개정구분'] === '일부개정' ? 'default' : 'outline'}>
                        {regulation['제정·개정구분']}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}