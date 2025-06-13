import { ExcelService } from './server/excelService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDepartments() {
  try {
    console.log('🔍 Excel 파일에서 부서 정보를 조회합니다...\n');
    
    // ExcelService 인스턴스 생성
    const excelService = ExcelService.getInstance();
    
    // 모든 규정 데이터 가져오기
    const regulations = await excelService.getAllRegulations();
    console.log(`📊 총 ${regulations.length}개의 법규 데이터를 로드했습니다.\n`);
    
    // 담당부서 필드에서 모든 고유한 부서명 추출
    const departmentSet = new Set();
    const departmentCounts = {};
    
    regulations.forEach(regulation => {
      const department = regulation.담당부서;
      if (department && department !== 'None' && department.trim() !== '') {
        departmentSet.add(department);
        departmentCounts[department] = (departmentCounts[department] || 0) + 1;
      }
    });
    
    // 정렬된 부서 목록
    const allDepartments = Array.from(departmentSet).sort();
    
    console.log('📋 Excel 파일에서 발견된 모든 부서 목록:');
    console.log('='.repeat(50));
    allDepartments.forEach((dept, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${dept} (${departmentCounts[dept]}건)`);
    });
    
    console.log(`\n총 ${allDepartments.length}개의 고유한 부서가 있습니다.\n`);
    
    // admin.tsx에 정의된 8개 부서 목록
    const adminDepartments = [
      "인사문화그룹",
      "환경기획그룹", 
      "안전보건기획그룹",
      "정보보호사무국",
      "회계세무그룹",
      "법무실",
      "노사협력그룹",
      "윤리경영사무국"
    ];
    
    console.log('🏢 admin.tsx에 정의된 부서 목록:');
    console.log('='.repeat(50));
    adminDepartments.forEach((dept, index) => {
      const count = departmentCounts[dept] || 0;
      const exists = allDepartments.includes(dept);
      console.log(`${index + 1}. ${dept} ${exists ? '✅' : '❌'} (${count}건)`);
    });
    
    console.log('\n');
    
    // Excel에는 있지만 admin.tsx에 없는 부서들
    const missingInAdmin = allDepartments.filter(dept => !adminDepartments.includes(dept));
    
    if (missingInAdmin.length > 0) {
      console.log('⚠️  Excel에는 있지만 admin.tsx에 없는 부서들:');
      console.log('='.repeat(50));
      missingInAdmin.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept} (${departmentCounts[dept]}건)`);
      });
    } else {
      console.log('✅ Excel의 모든 부서가 admin.tsx에 정의되어 있습니다.');
    }
    
    console.log('\n');
    
    // admin.tsx에는 있지만 Excel에 없는 부서들
    const missingInExcel = adminDepartments.filter(dept => !allDepartments.includes(dept));
    
    if (missingInExcel.length > 0) {
      console.log('⚠️  admin.tsx에는 있지만 Excel에 없는 부서들:');
      console.log('='.repeat(50));
      missingInExcel.forEach((dept, index) => {
        console.log(`${index + 1}. ${dept}`);
      });
    } else {
      console.log('✅ admin.tsx의 모든 부서가 Excel에 존재합니다.');
    }
    
    console.log('\n📈 부서별 법규 건수 Top 10:');
    console.log('='.repeat(50));
    const sortedDepartments = Object.entries(departmentCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedDepartments.forEach(([dept, count], index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${dept}: ${count}건`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

// 실행
checkDepartments();