import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ProgressCircle from "@/components/charts/progress-circle";
import { 
  FileText, 
  FileCheck, 
  AlertTriangle, 
  Bot,
  RefreshCw,
  Upload,
  Search,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  Building2,
  Calendar
} from "lucide-react";
import { formatDate, formatDateTime, getDepartmentColor, getStatusColor, getPriorityColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DashboardStats {
  totalRegulations: number;
  totalDepartments: number;
  riskItems: number;
  yearlyAmendments: number;
}

interface DepartmentProgress {
  name: string;
  completed: number;
  total: number;
}

interface MonthlyAmendment {
  name: string;
  type: string;
  effectiveDate: string;
  department: string;
}

interface YearlyAmendmentData {
  year: number;
  totalCount: number;
  amendments: MonthlyAmendment[];
}


interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: departmentProgress, isLoading: progressLoading } = useQuery<DepartmentProgress[]>({
    queryKey: ["/api/dashboard/department-progress"],
  });

  const { data: regulations, isLoading: regulationsLoading } = useQuery({
    queryKey: ["/api/regulations"],
  });

  const { data: monthlyAmendments, isLoading: amendmentsLoading } = useQuery<MonthlyAmendment[]>({
    queryKey: ["/api/dashboard/monthly-amendments"],
  });

  const { data: yearlyAmendments, isLoading: yearlyAmendmentsLoading } = useQuery<YearlyAmendmentData>({
    queryKey: ["/api/dashboard/yearly-amendments"],
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const handleSync = async () => {
    try {
      await apiRequest("POST", "/api/admin/sync");
      toast({
        title: "동기화 완료",
        description: "법규 동기화가 성공적으로 완료되었습니다.",
      });
    } catch (error) {
      toast({
        title: "동기화 실패",
        description: "법규 동기화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const recentNotifications = notifications?.slice(0, 5) || [];

  const openDepartmentDetail = (departmentName: string) => {
    setSelectedDepartment(departmentName);
    setIsDetailDialogOpen(true);
  };

  // 선택된 부서의 상세 법규 정보
  const selectedDepartmentRegulations = regulations && selectedDepartment ? 
    regulations.filter(r => r.담당부서 === selectedDepartment) : [];

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // 선택된 부서의 현재 월 시행 예정 법규
  const currentMonthRegulations = selectedDepartmentRegulations.filter(r => {
    if (!r.시행일자 || r.시행일자 === 'None') return false;
    if (!r.시행일자.includes('2025')) return false;
    
    const dateMatch = r.시행일자.match(/2025-(\d{2})/);
    if (!dateMatch) return false;
    
    const month = parseInt(dateMatch[1]);
    return month === currentMonth;
  });

  // 선택된 부서의 2025년 연간 시행 예정 법규
  const yearlyUpcomingRegulations = selectedDepartmentRegulations.filter(r => {
    if (!r.시행일자 || r.시행일자 === 'None') return false;
    return r.시행일자.includes('2025');
  });

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">종합 현황</h2>
            <p className="text-slate-600 mt-1">실시간 법규 개정 현황을 확인하세요</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-500">
              마지막 동기화: <span className="font-medium">{formatDateTime(new Date())}</span>
            </div>
            <Button onClick={handleSync} className="bg-primary hover:bg-blue-800">
              <RefreshCw className="h-4 w-4 mr-2" />
              수동 동기화
            </Button>
          </div>
        </div>
      </header>
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">당사 전체 적용 법규</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {statsLoading ? "..." : stats?.totalRegulations || 0}
                    <span className="text-lg text-slate-500 ml-1">건</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                <span className="text-blue-600 font-medium">법률 시행령 시행규칙</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">시행 예정 법규(25년)</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {yearlyAmendmentsLoading ? "..." : yearlyAmendments?.totalCount || 0}
                    <span className="text-lg text-slate-500 ml-1">건</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">
                <span className="text-orange-600 font-medium">2025년</span> 연간 시행 예정
              </div>
            </CardContent>
          </Card>

          
        </div>

        {/* Department Regulations Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>부서별 적용 법규 개정 현황 ({new Date().getMonth() + 1}월)</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllDepartments(!showAllDepartments)}
                className="flex items-center space-x-2"
              >
                <span className="text-sm text-slate-600">
                  {showAllDepartments ? "주요 부서만" : "전체 부서"}
                </span>
                {showAllDepartments ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {/* Department Cards Section */}
            <div className={`grid gap-6 mt-6 ${showAllDepartments ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
              {regulations ? (
                (() => {
                  // Excel 데이터에서 부서별 통계 계산
                  const departmentStats = Array.from(new Set(regulations.map(r => r.담당부서).filter(d => d && d !== 'None')))
                    .map(deptName => {
                      const deptRegulations = regulations.filter(r => r.담당부서 === deptName);
                      
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth() + 1; // 1-12
                      
                      // 2025년 연간 시행 예정 법규
                      const yearlyUpcomingRegulations = deptRegulations.filter(r => {
                        if (!r.시행일자 || r.시행일자 === 'None') return false;
                        return r.시행일자.includes('2025');
                      });
                      
                      // 현재 월에 시행 예정인 법규 (6월이면 6월)
                      const currentMonthRegulations = deptRegulations.filter(r => {
                        if (!r.시행일자 || r.시행일자 === 'None') return false;
                        if (!r.시행일자.includes('2025')) return false;
                        
                        const dateMatch = r.시행일자.match(/2025-(\d{2})/);
                        if (!dateMatch) return false;
                        
                        const month = parseInt(dateMatch[1]);
                        return month === currentMonth; // 현재 월
                      });

                      // 1월부터 현재 월 직전까지 완료된 법규 (6월이면 1~5월)
                      const monthlyCompletedRegulations = deptRegulations.filter(r => {
                        if (!r.시행일자 || r.시행일자 === 'None') return false;
                        if (!r.시행일자.includes('2025')) return false;
                        
                        const dateMatch = r.시행일자.match(/2025-(\d{2})/);
                        if (!dateMatch) return false;
                        
                        const month = parseInt(dateMatch[1]);
                        return month >= 1 && month < currentMonth; // 현재 월 직전까지
                      });
                      
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

                      const getDisplayName = (deptName: string) => {
                        const nameMap: Record<string, string> = {
                          "인사문화그룹": "인사문화그룹",
                          "환경기획그룹": "환경기획그룹", 
                          "안전보건기획그룹": "안전보건기획그룹",
                          "정보보호사무국": "정보보호사무국",
                          "회계세무그룹": "회계세무그룹",
                          "법무실": "법무실",
                          "노사협력그룹": "노사협력그룹",
                          "윤리경영사무국": "윤리경영사무국",
                        };
                        return nameMap[deptName] || deptName;
                      };

                      return {
                        name: deptName,
                        totalRegulations: deptRegulations.length,
                        yearlyUpcomingRegulations: yearlyUpcomingRegulations.length,
                        currentMonthRegulations: currentMonthRegulations.length,
                        monthlyCompletedRegulations: monthlyCompletedRegulations.length,
                        progressPercentage: yearlyUpcomingRegulations.length > 0 ? 
                          Math.round((monthlyCompletedRegulations.length / yearlyUpcomingRegulations.length) * 100) : 0,
                        color: getDepartmentColor(deptName),
                        displayName: getDisplayName(deptName)
                      };
                    })
                    .sort((a, b) => b.totalRegulations - a.totalRegulations);

                  // 주요 4개 부서 우선 정렬
                  const priorityDepts = ["환경기획그룹", "안전보건기획그룹", "정보보호사무국", "인사문화그룹"];
                  
                  // 부서를 우선순위에 따라 정렬
                  const sortedDepts = [...departmentStats].sort((a, b) => {
                    const aDisplayName = a.displayName;
                    const bDisplayName = b.displayName;
                    const aIndex = priorityDepts.indexOf(aDisplayName);
                    const bIndex = priorityDepts.indexOf(bDisplayName);
                    
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return 0;
                  });
                  
                  // 표시할 부서 선택
                  const displayDepts = showAllDepartments ? sortedDepts : sortedDepts.slice(0, 4);
                  
                  return displayDepts.map((dept) => (
                    <Card key={dept.name} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {dept.displayName}
                          </h3>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dept.color}`}>
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        <div className="flex justify-center mb-4">
                          <div className="relative">
                            <ProgressCircle 
                              percentage={dept.progressPercentage}
                              size={80}
                              color={
                                dept.progressPercentage >= 80 ? "hsl(142, 76%, 36%)" :
                                dept.progressPercentage >= 60 ? "hsl(32, 95%, 44%)" :
                                "hsl(0, 84%, 60%)"
                              }
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-sm font-bold text-slate-700">
                                  {dept.monthlyCompletedRegulations}/{dept.yearlyUpcomingRegulations}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {dept.progressPercentage}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">관리 법규</span>
                            <span className="text-sm font-medium">
                              {dept.totalRegulations}건
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className="font-bold">{new Date().getMonth() + 1}월 시행 예정</span>
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {dept.currentMonthRegulations}건
                            </Badge>  
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span className="font-medium">25년 시행 예정</span>
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {dept.yearlyUpcomingRegulations}건
                            </Badge>
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-4"
                          onClick={() => openDepartmentDetail(dept.name)}
                        >
                          상세보기
                        </Button>
                      </CardContent>
                    </Card>
                  ));
                })()
              ) : (
                [...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-6 bg-slate-200 rounded w-24"></div>
                        <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
                      </div>
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-slate-200 rounded-full"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-slate-200 rounded"></div>
                        <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardHeader>
        </Card>




        {/* Monthly Upcoming Regulations */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>이번 달 시행 예정 법규</CardTitle>
              <Link href="/regulations">
                <Button variant="ghost" className="text-primary">
                  전체 보기
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {amendmentsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded flex-1"></div>
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-6 bg-slate-200 rounded w-16"></div>
                    <div className="h-6 bg-slate-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : monthlyAmendments && monthlyAmendments.length > 0 ? (
              <div className="space-y-3">
                {monthlyAmendments.slice(0, 10).map((amendment, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {amendment.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {amendment.department} • {amendment.type}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        시행일: {amendment.effectiveDate}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                이번 달 시행 예정인 법규가 없습니다.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>{selectedDepartment} 상세 현황</span>
              </DialogTitle>
            </DialogHeader>
            
            {selectedDepartment && (
              <div className="space-y-6">
                {/* 요약 통계 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedDepartmentRegulations.length}
                        </p>
                        <p className="text-sm text-slate-600">총 관리 법규</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {currentMonthRegulations.length}
                        </p>
                        <p className="text-sm text-slate-600">{currentMonth}월 시행 예정</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {yearlyUpcomingRegulations.length}
                        </p>
                        <p className="text-sm text-slate-600">2025년 연간 예정</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 현재 월 시행 예정 법규 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{currentMonth}월 시행 예정 법규</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentMonthRegulations.length > 0 ? (
                      <div className="space-y-3">
                        {currentMonthRegulations.map((regulation, index) => (
                          <div key={index} className="border border-slate-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium text-slate-900 flex-1">
                                {regulation.법률명}
                              </h4>
                              <Badge variant="outline" className="ml-2">
                                {regulation.법령종류}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-600">시행일자: </span>
                                <span className="font-medium">{regulation.시행일자}</span>
                              </div>
                              <div>
                                <span className="text-slate-600">구분: </span>
                                <span className="font-medium">{regulation['제정·개정구분']}</span>
                              </div>
                            </div>

                            {regulation['개정 법률 조항'] && 
                             regulation['개정 법률 조항'] !== 'None' && (
                              <div className="mt-3 p-3 bg-blue-50 rounded">
                                <p className="text-sm font-medium text-blue-900 mb-1">개정 법률 조항</p>
                                <p className="text-sm text-blue-800 whitespace-pre-line">
                                  {regulation['개정 법률 조항']}
                                </p>
                              </div>
                            )}

                            {regulation['AI 후속 조치 사항'] && 
                             regulation['AI 후속 조치 사항'] !== '내용/조치사항 없음' && (
                              <div className="mt-3 p-3 bg-green-50 rounded">
                                <p className="text-sm font-medium text-green-900 mb-1">AI 후속 조치 사항</p>
                                <p className="text-sm text-green-800 whitespace-pre-line">
                                  {regulation['AI 후속 조치 사항']}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        {currentMonth}월에 시행 예정인 법규가 없습니다.
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
