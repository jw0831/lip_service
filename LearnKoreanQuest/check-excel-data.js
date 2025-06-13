// 6월 시행 예정 법규의 "개정 법률 조항" 필드 데이터 확인 스크립트
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkExcelData() {
    try {
        // Excel 파일 경로 - attached_assets 디렉토리에서 찾기
        const excelPath = path.join(__dirname, 'attached_assets/law_list2ai_1749727941667.xlsx');
        console.log('Excel 파일 경로:', excelPath);
        
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Filter out empty rows
        const data = jsonData.filter(row => 
            row['번호'] && row['법률명'] && row['번호'] !== '번호'
        );
        
        console.log(`\n총 ${data.length}개의 법규 데이터 로드됨`);
        
        // 6월 시행 예정 법규 필터링
        const juneRegulations = data.filter(row => {
            const 시행일자 = row['시행일자'];
            if (!시행일자) return false;
            
            // 2025.06 또는 2025-06으로 시작하는 날짜 찾기
            const dateStr = String(시행일자);
            return dateStr.includes('2025.06') || dateStr.includes('2025-06') || dateStr.includes('25.06');
        });
        
        console.log(`\n=== 6월 시행 예정 법규: ${juneRegulations.length}개 ===`);
        
        if (juneRegulations.length === 0) {
            console.log('6월 시행 예정 법규가 없습니다.');
            
            // 모든 시행일자 샘플 확인
            console.log('\n=== 시행일자 샘플 (처음 10개) ===');
            data.slice(0, 10).forEach((row, index) => {
                console.log(`${index + 1}. ${row['법률명']}: ${row['시행일자']}`);
            });
            
            return;
        }
        
        // 부서별로 그룹화
        const departmentGroups = {};
        juneRegulations.forEach(reg => {
            const dept = reg['담당부서'] || 'Unknown';
            if (!departmentGroups[dept]) {
                departmentGroups[dept] = [];
            }
            departmentGroups[dept].push(reg);
        });
        
        console.log(`\n=== 부서별 6월 시행 예정 법규 ===`);
        for (const [dept, regulations] of Object.entries(departmentGroups)) {
            console.log(`\n📋 ${dept}: ${regulations.length}개`);
            
            regulations.forEach((reg, index) => {
                console.log(`\n${index + 1}. ${reg['법률명']}`);
                console.log(`   시행일자: ${reg['시행일자']}`);
                console.log(`   개정 법률 조항: "${reg['개정 법률 조항'] || 'EMPTY'}"`);
                console.log(`   AI 주요 개정 정리: "${reg['AI 주요 개정 정리'] || 'EMPTY'}"`);
                console.log(`   주요 개정 내용: "${reg['주요 개정 내용'] || 'EMPTY'}"`);
            });
        }
        
        // 개정 법률 조항 필드 분석
        console.log(`\n=== "개정 법률 조항" 필드 분석 ===`);
        let emptyCount = 0;
        let noneCount = 0;
        let validCount = 0;
        
        juneRegulations.forEach(reg => {
            const 개정조항 = reg['개정 법률 조항'];
            if (!개정조항 || 개정조항 === '') {
                emptyCount++;
            } else if (개정조항 === 'None' || 개정조항 === 'none') {
                noneCount++;
            } else {
                validCount++;
            }
        });
        
        console.log(`- 비어있음: ${emptyCount}개`);
        console.log(`- 'None' 값: ${noneCount}개`);
        console.log(`- 유효한 데이터: ${validCount}개`);
        
        // AI 주요 개정 정리 필드 분석
        console.log(`\n=== "AI 주요 개정 정리" 필드 분석 ===`);
        let aiEmptyCount = 0;
        let aiNoneCount = 0;
        let aiValidCount = 0;
        
        juneRegulations.forEach(reg => {
            const ai정리 = reg['AI 주요 개정 정리'];
            if (!ai정리 || ai정리 === '') {
                aiEmptyCount++;
            } else if (ai정리 === 'None' || ai정리 === 'none') {
                aiNoneCount++;
            } else {
                aiValidCount++;
            }
        });
        
        console.log(`- 비어있음: ${aiEmptyCount}개`);
        console.log(`- 'None' 값: ${aiNoneCount}개`);
        console.log(`- 유효한 데이터: ${aiValidCount}개`);
        
        // 회계세무그룹 특별 분석
        const 회계세무그룹 = juneRegulations.filter(reg => 
            reg['담당부서'] && reg['담당부서'].includes('회계세무')
        );
        
        if (회계세무그룹.length > 0) {
            console.log(`\n=== 회계세무그룹 특별 분석 (${회계세무그룹.length}개) ===`);
            회계세무그룹.forEach((reg, index) => {
                console.log(`\n${index + 1}. ${reg['법률명']}`);
                console.log(`   개정 법률 조항: "${reg['개정 법률 조항'] || 'EMPTY'}"`);
                console.log(`   AI 주요 개정 정리: "${reg['AI 주요 개정 정리'] || 'EMPTY'}"`);
                console.log(`   주요 개정 내용: "${reg['주요 개정 내용'] || 'EMPTY'}"`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkExcelData();