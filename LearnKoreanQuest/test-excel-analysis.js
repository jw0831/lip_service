import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 엑셀 파일 분석 함수
function analyzeExcelFile() {
  try {
    const filePath = path.join(__dirname, 'attached_assets', 'law_list2ai_1749727941667.xlsx');
    console.log('엑셀 파일 경로:', filePath);
    
    // 파일 존재 확인
    if (!fs.existsSync(filePath)) {
      console.log('파일이 존재하지 않습니다.');
      return;
    }
    
    const workbook = XLSX.readFile(filePath);
    console.log('시트 이름들:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 헤더 정보 확인
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log('총 행 수:', data.length);
    
    if (data.length > 0) {
      console.log('헤더 행:', data[0]);
      console.log('첫 번째 데이터 행:', data[1]);
      
      // D열(3), F열(5), J열(9) 확인
      if (data.length > 1) {
        const row = data[1];
        console.log('D열 (시행일자):', row[3]);
        console.log('F열 (법률명):', row[5]);
        console.log('J열 (부서):', row[9]);
      }
      
      // 처음 5개 행의 D, F, J 열 데이터 확인
      console.log('\n처음 5개 데이터 행의 주요 열:');
      for (let i = 1; i < Math.min(6, data.length); i++) {
        const row = data[i];
        console.log(`행 ${i}: D열=${row[3]}, F열=${row[5]}, J열=${row[9]}`);
      }
    }
    
  } catch (error) {
    console.error('엑셀 분석 오류:', error);
  }
}

analyzeExcelFile();