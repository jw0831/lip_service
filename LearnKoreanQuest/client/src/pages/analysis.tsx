import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

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

export default function Analysis() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: regulations, isLoading } = useQuery<LegalRegulation[]>({
    queryKey: ["/api/regulations"],
  });

  // Filter regulations that have AI analysis
  const analyzedRegulations = regulations?.filter(r => 
    r['AI 주요 개정 정리'] && r['AI 주요 개정 정리'] !== '- [개정이유]: 없음\n\n- [주요내용]: 없음'
  ) || [];

  // Apply filters
  const filteredRegulations = analyzedRegulations.filter((regulation) => {
    const matchesSearch = 
      regulation.법률명?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regulation.담당부서?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || regulation.담당부서 === departmentFilter;
    
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "completed") {
        matchesStatus = regulation['AI 후속 조치 사항'] !== '내용/조치사항 없음';
      } else if (statusFilter === "pending") {
        matchesStatus = regulation['AI 후속 조치 사항'] === '내용/조치사항 없음';
      }
    }
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Get unique departments
  const uniqueDepartments = Array.from(new Set(analyzedRegulations.map(r => r.담당부서).filter(d => d && d !== 'None')));

  // Statistics
  const stats = {
    total: analyzedRegulations.length,
    completed: analyzedRegulations.filter(r => r['AI 후속 조치 사항'] !== '내용/조치사항 없음').length,
    pending: analyzedRegulations.filter(r => r['AI 후속 조치 사항'] === '내용/조치사항 없음').length,
    highPriority: analyzedRegulations.filter(r => r['제정·개정구분'] === '일부개정').length,
  };

  const getAnalysisStatus = (regulation: LegalRegulation) => {
    if (regulation['AI 후속 조치 사항'] === '내용/조치사항 없음') {
      return { status: '검토 필요', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { status: '분석 완료', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">법규 분석 센터</h2>
            <p className="text-slate-600 mt-1">AI 기반 법규 분석 결과를 확인하고 관리하세요</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">총 분석 법규</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.total}
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
                  <p className="text-slate-600 text-sm font-medium">분석 완료</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">검토 필요</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">중요 개정</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {stats.highPriority}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="법률명 또는 담당부서로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="담당부서" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 부서</SelectItem>
                  {uniqueDepartments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="분석 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 상태</SelectItem>
                  <SelectItem value="completed">분석 완료</SelectItem>
                  <SelectItem value="pending">검토 필요</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle>분석 결과 ({filteredRegulations.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse p-6 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded w-20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </div>
                ))
              ) : filteredRegulations.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  {searchTerm || departmentFilter !== "all" || statusFilter !== "all" 
                    ? "검색 조건에 맞는 분석 결과가 없습니다."
                    : "분석된 법규가 없습니다."
                  }
                </div>
              ) : (
                filteredRegulations.map((regulation, index) => {
                  const analysisStatus = getAnalysisStatus(regulation);
                  return (
                    <div key={index} className="p-6 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {regulation.법률명}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-slate-600">
                            <span>{regulation.담당부서}</span>
                            <span>•</span>
                            <span>{regulation.법령종류}</span>
                            <span>•</span>
                            <span>{regulation['제정·개정구분']}</span>
                          </div>
                        </div>
                        <Badge className={analysisStatus.color}>
                          {analysisStatus.status}
                        </Badge>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">AI 주요 개정 정리</h4>
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <pre className="text-sm text-slate-800 whitespace-pre-wrap">
                              {regulation['AI 주요 개정 정리']}
                            </pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">AI 후속 조치 사항</h4>
                          <div className="bg-green-50 p-4 rounded-lg">
                            <pre className="text-sm text-slate-800 whitespace-pre-wrap">
                              {regulation['AI 후속 조치 사항']}
                            </pre>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end mt-4 space-x-2">
                        <Button variant="outline" size="sm">
                          상세 보기
                        </Button>
                        <Button size="sm">
                          검토 완료
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}