import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProgressCircle from "@/components/charts/progress-circle";
import { Building2, Users, Calendar, FileText, AlertTriangle, ChevronRight, ChevronLeft } from "lucide-react";

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

export default function Departments() {
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  
  const { data: regulations, isLoading: regulationsLoading } = useQuery<LegalRegulation[]>({
    queryKey: ["/api/regulations"],
  });

  const { data: departmentProgress, isLoading: progressLoading } = useQuery<DepartmentProgress[]>({
    queryKey: ["/api/dashboard/department-progress"],
  });

  // Excel 데이터에서 부서별 통계 계산
  const departmentStats = regulations ? 
    Array.from(new Set(regulations.map(r => r.담당부서).filter(d => d && d !== 'None')))
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
        
        const analyzedRegulations = deptRegulations.filter(r => 
          r['AI 주요 개정 정리'] && r['AI 주요 개정 정리'] !== '- [개정이유]: 없음\n\n- [주요내용]: 없음'
        );
        
        const completedAnalysis = analyzedRegulations.filter(r => 
          r['AI 후속 조치 사항'] !== '내용/조치사항 없음'
        );

        return {
          name: deptName,
          totalRegulations: deptRegulations.length,
          yearlyUpcomingRegulations: yearlyUpcomingRegulations.length,
          currentMonthRegulations: currentMonthRegulations.length,
          monthlyCompletedRegulations: monthlyCompletedRegulations.length,
          analyzedRegulations: analyzedRegulations.length,
          completedAnalysis: completedAnalysis.length,
          progressPercentage: yearlyUpcomingRegulations.length > 0 ? 
            Math.round((monthlyCompletedRegulations.length / yearlyUpcomingRegulations.length) * 100) : 0
        };
      })
      .sort((a, b) => b.totalRegulations - a.totalRegulations)
    : [];

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


  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">부서별 적용 법규 개정 현황 (6월)</h2>
            <p className="text-slate-600 mt-1">각 부서별 법규 관리 현황을 확인하세요</p>
          </div>
        </div>
      </header>

      <div className="p-6">

        {/* Department Detail Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>부서별 적용 법규 개정 현황 (6월)</CardTitle>
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
          {regulationsLoading ? (
            [...Array(8)].map((_, i) => (
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
          ) : (
            (() => {
              // 주요 4개 부서 우선 정렬
              const priorityDepts = ["환경기획그룹", "안전보건기획그룹", "정보보호사무국", "인사문화그룹"];
              
              // 부서를 우선순위에 따라 정렬
              const sortedDepts = [...departmentStats].sort((a, b) => {
                const aDisplayName = getDisplayName(a.name);
                const bDisplayName = getDisplayName(b.name);
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
                      {getDisplayName(dept.name)}
                    </h3>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDepartmentColor(dept.name)}`}>
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
                        <span className="font-bold">6월 시행 예정</span>
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
                  >
                    상세보기
                  </Button>
                </CardContent>
              </Card>
            ));
            })()
          )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">부서명</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">담당자</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">연락처</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">관리 법규</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">진행률</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departmentStats.map((dept) => (
                    <tr key={dept.name} className="hover:bg-slate-50">
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDepartmentColor(dept.name)}`}>
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {getDisplayName(dept.name)}
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
                            담당자 미지정
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
                        <div className="text-sm">
                          <p className="text-slate-900 font-medium">{dept.totalRegulations}건</p>
                          <p className="text-slate-500">6월: {dept.currentMonthRegulations}건 / 25년: {dept.yearlyUpcomingRegulations}건</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-16">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  dept.progressPercentage >= 80 ? "bg-green-500" :
                                  dept.progressPercentage >= 60 ? "bg-yellow-500" :
                                  "bg-red-500"
                                }`}
                                style={{ width: `${dept.progressPercentage}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm font-medium">
                            {dept.progressPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            상세보기
                          </Button>
                          <Button size="sm">
                            관리
                          </Button>
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
    </div>
  );
}