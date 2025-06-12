import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDepartmentSchema } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Edit, 
  Phone, 
  Mail, 
  User, 
  Building2,
  Users
} from "lucide-react";
import { getDepartmentColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Department {
  id: number;
  name: string;
  code: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

type FormData = z.infer<typeof insertDepartmentSchema>;

export default function Contacts() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const { toast } = useToast();

  const { data: departments, isLoading } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const addForm = useForm<FormData>({
    resolver: zodResolver(insertDepartmentSchema),
    defaultValues: {
      name: "",
      code: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(insertDepartmentSchema),
    defaultValues: {
      name: "",
      code: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "부서 추가 완료",
        description: "새로운 부서가 성공적으로 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "부서 추가 실패",
        description: "부서 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FormData> }) => 
      apiRequest("PUT", `/api/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      editForm.reset();
      toast({
        title: "부서 수정 완료",
        description: "부서 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "부서 수정 실패",
        description: "부서 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onAddSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    if (editingDepartment) {
      updateMutation.mutate({ id: editingDepartment.id, data });
    }
  };

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department);
    editForm.reset({
      name: department.name,
      code: department.code,
      contactName: department.contactName || "",
      contactEmail: department.contactEmail || "",
      contactPhone: department.contactPhone || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">부서 연락처 관리</h2>
            <p className="text-slate-600 mt-1">부서별 담당자 정보를 관리하세요</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-blue-800">
                <Plus className="h-4 w-4 mr-2" />
                새 부서 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 부서 추가</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>부서명</FormLabel>
                          <FormControl>
                            <Input placeholder="예: IT보안팀" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>부서 코드</FormLabel>
                          <FormControl>
                            <Input placeholder="예: IT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addForm.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>담당자명</FormLabel>
                        <FormControl>
                          <Input placeholder="담당자 이름을 입력하세요" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>이메일</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="example@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addForm.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>전화번호</FormLabel>
                        <FormControl>
                          <Input placeholder="02-1234-5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      취소
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "추가 중..." : "부서 추가"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Summary */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    총 {departments?.length || 0}개 부서
                  </h3>
                  <p className="text-sm text-slate-600">
                    연락처 정보가 등록된 부서: {departments?.filter(d => d.contactEmail).length || 0}개
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                연락처 관리 활성화
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Department Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                      <div>
                        <div className="h-5 bg-slate-200 rounded w-20 mb-2"></div>
                        <div className="h-4 bg-slate-200 rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-8 w-8 bg-slate-200 rounded"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                    <div className="h-4 bg-slate-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : departmentContacts.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    등록된 부서가 없습니다
                  </h3>
                  <p className="text-slate-500 mb-4">
                    Excel 데이터에서 부서 정보를 불러옵니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            departmentContacts.map((department) => (
              <Card key={department.name} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getDepartmentColor(department.name)}`}>
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {department.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {department.totalRegulations}건 관리
                        </Badge>
                      </div>
                    </div>
                    <Badge className={
                      department.status === "완료" ? "bg-green-100 text-green-800" :
                      department.status === "부분" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {department.status}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {department.contactName}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {department.contactEmail}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        {department.contactPhone}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex space-x-2">
                      {department.contactEmail !== '-' && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Mail className="h-3 w-3 mr-1" />
                          이메일
                        </Button>
                      )}
                      {department.contactPhone !== '-' && (
                        <Button size="sm" variant="outline" className="flex-1">
                          <Phone className="h-3 w-3 mr-1" />
                          전화
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>부서별 연락처 상세정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">부서</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">담당자</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">이메일</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">전화번호</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">상태</th>
                    <th className="text-left text-sm font-medium text-slate-600 pb-3">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                        <td className="py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                        <td className="py-4"><div className="h-6 bg-slate-200 rounded w-16"></div></td>
                        <td className="py-4"><div className="h-8 bg-slate-200 rounded w-16"></div></td>
                      </tr>
                    ))
                  ) : departmentContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        등록된 부서가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    departmentContacts.map((department) => (
                      <tr key={department.name} className="hover:bg-slate-50">
                        <td className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getDepartmentColor(department.name)}`}>
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {department.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {department.totalRegulations}건 총 관리
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-900">
                            {department.contactName}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-900">
                            {department.contactEmail}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="text-sm text-slate-900">
                            {department.contactPhone}
                          </span>
                        </td>
                        <td className="py-4">
                          <Badge className={
                            department.status === "완료" ? "bg-green-100 text-green-800" :
                            department.status === "부분" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }>
                            {department.status}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            연락
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>부서 정보 수정</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>부서명</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>부서 코드</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>담당자명</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>이메일</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>전화번호</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    취소
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "수정 중..." : "수정 완료"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
