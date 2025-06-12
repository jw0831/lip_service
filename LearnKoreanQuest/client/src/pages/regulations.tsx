import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface LegalRegulation {
  번호: string;
  공포번호: string;
  공포일자: string;
  시행일자: string;
  '법령(약칭)': string;
  법률명: string;
  법령종류: string;
  소관부처: string;
  예정: string;
  담당부서: string;
  담당자: string;
  '제/개정일(시행일)': string;
  '개정 법률 조항': string;
  '주요 개정 내용': string;
  '제정·개정구분': string;
  '신구법비교_URL': string;
  '제정/개정 이유_URL': string;
  'AI 주요 개정 정리': string;
  'AI 후속 조치 사항': string;
}

export default function Regulations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedRegulation, setSelectedRegulation] = useState<LegalRegulation | null>(null);

  const { data: regulations, isLoading } = useQuery<LegalRegulation[]>({
    queryKey: ["/api/regulations"],
  });

  const { data: departments } = useQuery<string[]>({
    queryKey: ["/api/regulation-types"],
    select: (data) => data || [],
  });

  const { data: types } = useQuery<string[]>({
    queryKey: ["/api/regulation-types"],
    select: (data) => data || [],
  });

  // Filter regulations based on search and filters
  const filteredRegulations = regulations?.filter((regulation) => {
    const matchesSearch = 
      regulation.법률명?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regulation['법령(약칭)']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regulation.소관부처?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regulation.담당부서?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === "all" || regulation.담당부서 === departmentFilter;
    const matchesType = typeFilter === "all" || regulation.법령종류 === typeFilter;
    
    return matchesSearch && matchesDepartment && matchesType;
  }) || [];

  // Get unique departments and types for filters
  const uniqueDepartments = Array.from(new Set(regulations?.map(r => r.담당부서).filter(d => d && d !== 'None') || []));
  const uniqueTypes = Array.from(new Set(regulations?.map(r => r.법령종류).filter(t => t && t !== 'None') || []));

  // Statistics
  const stats = regulations ? {
    total: regulations.length,
    법률: regulations.filter(r => r.법령종류 === "법률").length,
    대통령령: regulations.filter(r => r.법령종류 === "대통령령").length,
    시행규칙: regulations.filter(r => 
      r.법령종류?.includes("규칙") || 
      r.법령종류?.includes("시행규칙") || 
      r.법률명?.includes("시행규칙") ||
      r.법률명?.endsWith("규칙")
    ).length,
  } : { total: 0, 법률: 0, 대통령령: 0, 시행규칙: 0 };

  const formatKoreanDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'None') return '-';
    if (dateStr.includes('.')) return dateStr; // Already formatted
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">법규 모니터링</h2>
            <p className="text-slate-600 mt-1">법규 제개정 사항을 실시간으로 모니터링하고 분석합니다</p>
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
                  <p className="text-slate-600 text-sm font-medium">총 법규</p>
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
                  <p className="text-slate-600 text-sm font-medium">법률</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.법률}
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
                  <p className="text-slate-600 text-sm font-medium">대통령령</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.대통령령}
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
                  <p className="text-slate-600 text-sm font-medium">시행규칙</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {stats.시행규칙}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
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
                    placeholder="법률명, 약칭, 소관부처, 담당부서로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
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

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="법령종류" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 종류</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Regulations Table */}
        <Card>
          <CardHeader>
            <CardTitle>법규 목록 ({filteredRegulations.length}개)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">법률명</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">법령종류</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">담당부서</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">시행일자</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">개정구분</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                        <td className="py-4"><div className="h-6 bg-slate-200 rounded w-16"></div></td>
                        <td className="py-4"><div className="h-8 bg-slate-200 rounded w-20"></div></td>
                      </tr>
                    ))
                  ) : filteredRegulations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        {searchTerm || departmentFilter !== "all" || typeFilter !== "all" 
                          ? "검색 조건에 맞는 법규가 없습니다."
                          : "등록된 법규가 없습니다."
                        }
                      </td>
                    </tr>
                  ) : (
                    filteredRegulations.map((regulation, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {regulation.법률명}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {regulation['법령(약칭)']} • {regulation.소관부처}
                            </p>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="secondary" className="text-xs">
                            {regulation.법령종류}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-900">
                            {regulation.담당부서 || '-'}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-600">
                            {formatKoreanDate(regulation.시행일자)}
                          </span>
                        </td>
                        <td className="py-4">
                          <Badge variant={regulation['제정·개정구분'] === '일부개정' ? 'default' : 'outline'}>
                            {regulation['제정·개정구분'] || '-'}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedRegulation(regulation)}
                            >
                              상세보기
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredRegulations.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-600">
                  총 {filteredRegulations.length}개의 법규가 표시되고 있습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRegulation} onOpenChange={() => setSelectedRegulation(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedRegulation?.법률명}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRegulation && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">공포번호</label>
                  <p className="text-sm text-slate-900 mt-1">{selectedRegulation.공포번호}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">공포일자</label>
                  <p className="text-sm text-slate-900 mt-1">{formatKoreanDate(selectedRegulation.공포일자)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">시행일자</label>
                  <p className="text-sm text-slate-900 mt-1">{formatKoreanDate(selectedRegulation.시행일자)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">법령종류</label>
                  <p className="text-sm text-slate-900 mt-1">{selectedRegulation.법령종류}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">소관부처</label>
                  <p className="text-sm text-slate-900 mt-1">{selectedRegulation.소관부처}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">담당부서</label>
                  <p className="text-sm text-slate-900 mt-1">{selectedRegulation.담당부서}</p>
                </div>
              </div>

              {/* AI Analysis */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">AI 주요 개정 정리</label>
                  <div className="bg-blue-50 p-4 rounded-lg mt-2">
                    <pre className="text-sm text-slate-900 whitespace-pre-wrap">
                      {selectedRegulation['AI 주요 개정 정리'] || '정보 없음'}
                    </pre>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-600">AI 후속 조치 사항</label>
                  <div className="bg-green-50 p-4 rounded-lg mt-2">
                    <pre className="text-sm text-slate-900 whitespace-pre-wrap">
                      {selectedRegulation['AI 후속 조치 사항'] || '조치사항 없음'}
                    </pre>
                  </div>
                </div>
              </div>

              {/* URLs */}
              {(selectedRegulation['신구법비교_URL'] && selectedRegulation['신구법비교_URL'] !== 'None') && (
                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(selectedRegulation['신구법비교_URL'], '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    신구법 비교
                  </Button>
                  {selectedRegulation['제정/개정 이유_URL'] && selectedRegulation['제정/개정 이유_URL'] !== 'None' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(selectedRegulation['제정/개정 이유_URL'], '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      제정/개정 이유
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}