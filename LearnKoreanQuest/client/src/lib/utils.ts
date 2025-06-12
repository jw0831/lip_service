import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getDepartmentColor(code: string): string {
  const colors: Record<string, string> = {
    HR: "bg-dept-hr",
    SAFETY: "bg-dept-safety",
    ENV: "bg-dept-env",
    IT: "bg-dept-it",
    LEGAL: "bg-dept-legal",
    FINANCE: "bg-dept-finance",
    OPERATIONS: "bg-dept-operations",
  };
  return colors[code] || "bg-gray-500";
}



export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    "완료": "bg-green-100 text-green-800",
    "분석중": "bg-yellow-100 text-yellow-800",
    "대기중": "bg-blue-100 text-blue-800",
    "오류": "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    "높음": "bg-red-100 text-red-800",
    "중간": "bg-yellow-100 text-yellow-800",
    "낮음": "bg-green-100 text-green-800",
    "긴급": "bg-red-500 text-white",
  };
  return colors[priority] || "bg-gray-100 text-gray-800";
}
