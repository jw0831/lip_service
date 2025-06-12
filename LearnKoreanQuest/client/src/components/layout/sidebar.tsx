import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Building2, 
  TrendingUp, 
  Settings, 
  User,
  FileText
} from "lucide-react";

const navigation = [
  { name: "종합 현황", href: "/dashboard", icon: BarChart3 },
  { name: "부서별 진행률", href: "/departments", icon: Building2 },
  { name: "법규 모니터링", href: "/regulations", icon: FileText },
  { name: "법규 분석 센터", href: "/analysis", icon: TrendingUp },
  { name: "관리자 페이지", href: "/admin", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo Header */}
      <div className="p-4 border-b border-slate-200">
        <h1 className="text-sm font-bold text-primary leading-snug">AI기반 법규 개정<br/>모니터링 솔루션</h1>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-blue-50 text-primary font-medium"
                  : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">관리자</p>
            <p className="text-xs text-slate-500">admin@company.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
