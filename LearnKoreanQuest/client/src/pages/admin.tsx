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
const departmentEmailSchema = z.object({
  departmentEmails: z.array(z.object({
    department: z.string().min(1, "부서명을 선택해주세요"),
    email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  })).min(1, "최소 1개 부서의 이메일을 입력해주세요"),
});

type DepartmentEmailFormData = z.infer<typeof departmentEmailSchema>;

export default function Admin() {
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isMonthlyEmailDialogOpen, setIsMonthlyEmailDialogOpen] = useState(false);
  const [emailLogs, setEmailLogs] = useState("");
  const { toast } = useToast();


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
        { department: "IP전략센터", email: "" },
        { department: "경영전략그룹", email: "" },
        { department: "내부회계관리섹션", email: "" },
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



  const monthlyAnalysisMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/monthly-analysis"),
    onSuccess: (data: any) => {
      console.log("월간 분석 결과:", data);
      
      if (data.result && data.result.departmentStats) {
        const stats = data.result;
        const deptCount = Object.keys(stats.departmentStats).length;
        toast({
          title: "월간 분석 완료",
          description: `${deptCount}개 부서, 총 ${stats.totalRegulations}건의 법규 분석이 완료되었습니다.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "월간 분석 완료",
          description: data.message || "분석이 성공적으로 완료되었습니다.",
        });
      }
    },
    onError: (error: any) => {
      console.error("월간 분석 오류:", error);
      toast({
        title: "월간 분석 실패",
        description: error?.error || error?.message || "월간 분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });


  const emailLogsMutation = useMutation({
    mutationFn: () => apiRequest("GET", "/api/admin/email-logs"),
    onSuccess: (data: any) => {
      console.log("이메일 로그 데이터:", data);
      const logContent = data.logs || "로그가 없습니다.";
      setEmailLogs(logContent);
      setIsLogDialogOpen(true);
      toast({
        title: "로그 불러오기 성공",
        description: `총 ${data.totalLines || 0}줄의 로그를 불러왔습니다. (최근 50줄 표시)`,
      });
    },
    onError: (error: any) => {
      console.error("로그 불러오기 오류:", error);
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

        {/* AI Analysis Control */}
        <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                이메일 알림 서비스
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">AI 기반 법규 분석 및 이메일 시스템</h4>
                <p className="text-sm text-slate-600 mb-3">
                  종합현황 데이터를 기반으로 부서별 맞춤형 법규 이메일을 발송하고 AI 분석 결과를 전달합니다.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Gmail SMTP 연결 상태
                  </span>
                  <Badge className="bg-green-100 text-green-800">연결됨</Badge>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Dialog open={isMonthlyEmailDialogOpen} onOpenChange={setIsMonthlyEmailDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full max-w-md bg-green-600 hover:bg-green-700 h-16 flex items-center justify-center">
                      <Bot className="h-5 w-5 mr-2" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm">월간 시행 예정 법규 부서별 이메일 전송</span>
                        <span className="text-xs opacity-90">(맞춤형 분석 리포트)</span>
                      </div>
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
              </div>
            </CardContent>
          </Card>

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
              <div className="p-4 bg-slate-900 text-green-400 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
                {emailLogs ? (
                  emailLogs.split('\n').map((line, index) => (
                    <div key={index} className={`
                      ${line.includes('SUCCESS') ? 'text-green-300' : ''}
                      ${line.includes('ERROR') || line.includes('실패') ? 'text-red-300' : ''}
                      ${line.includes('EMAIL') ? 'text-blue-300' : ''}
                      ${line.includes('=========') ? 'text-yellow-300 font-bold' : ''}
                    `}>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">로그가 없습니다.</div>
                )}
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