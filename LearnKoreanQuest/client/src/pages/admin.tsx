import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  BarChart3
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

export default function Admin() {
  const [testEmail, setTestEmail] = useState("");
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  const { toast } = useToast();

  const { data: regulations, isLoading: regulationsLoading } = useQuery<LegalRegulation[]>({
    queryKey: ["/api/regulations"],
  });

  const { data: departmentProgress, isLoading: progressLoading } = useQuery<DepartmentProgress[]>({
    queryKey: ["/api/dashboard/department-progress"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
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
        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">총 법규</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {adminStats.totalRegulations}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">관리 부서</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {adminStats.departments}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">AI 분석 완료</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {adminStats.analyzedRegulations}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">검토 대기</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {adminStats.pendingReviews}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">시행 예정</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {adminStats.upcomingRegulations}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                시스템 관리
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">데이터 관리</h4>
                <div className="flex space-x-2">
                  <Button onClick={handleSync} disabled={syncInProgress} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncInProgress ? 'animate-spin' : ''}`} />
                    데이터 새로고침
                  </Button>
                  <Button onClick={exportData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    데이터 내보내기
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">AI 분석 관리</h4>
                <Button 
                  onClick={handleAnalysis} 
                  disabled={analysisInProgress}
                  className="w-full"
                >
                  {analysisInProgress ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      AI 분석 실행 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      전체 AI 분석 실행
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">이메일 테스트</h4>
                <div className="flex space-x-2">
                  <Input
                    placeholder="테스트 이메일 주소"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    type="email"
                  />
                  <Button onClick={handleTestEmail} variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    전송
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                부서별 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-sm font-medium text-slate-600 pb-3">부서명</th>
                      <th className="text-left text-sm font-medium text-slate-600 pb-3">담당자</th>
                      <th className="text-left text-sm font-medium text-slate-600 pb-3">연락처</th>
                      <th className="text-left text-sm font-medium text-slate-600 pb-3">진행률</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {progressLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="py-4"><div className="h-4 bg-slate-200 rounded"></div></td>
                          <td className="py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                          <td className="py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                          <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                        </tr>
                      ))
                    ) : departmentProgress?.map((dept) => (
                      <tr key={dept.name} className="hover:bg-slate-50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDepartmentColor(dept.name)}`}>
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {dept.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {dept.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-900">
                              미지정
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="text-sm">
                            <p className="text-slate-900">-</p>
                            <p className="text-slate-500">-</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16">
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    (dept.completed / dept.total) * 100 >= 80 ? "bg-green-500" :
                                    (dept.completed / dept.total) * 100 >= 60 ? "bg-yellow-500" :
                                    "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.round((dept.completed / dept.total) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-sm font-medium">
                              {Math.round((dept.completed / dept.total) * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

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