import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LegalRegulation {
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

export class ExcelService {
  private static instance: ExcelService;
  private data: LegalRegulation[] = [];
  private lastLoadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      ExcelService.instance = new ExcelService();
    }
    return ExcelService.instance;
  }

  private shouldReloadData(): boolean {
    return Date.now() - this.lastLoadTime > this.CACHE_DURATION;
  }

  public async loadData(): Promise<LegalRegulation[]> {
    if (this.data.length > 0 && !this.shouldReloadData()) {
      return this.data;
    }

    try {
      const excelPath = path.join(__dirname, '../../data/law_list2ai.xlsx');
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as LegalRegulation[];
      
      // Filter out empty rows and validate data
      this.data = jsonData.filter(row => 
        row.번호 && row.법률명 && row.번호 !== '번호'
      );
      
      this.lastLoadTime = Date.now();
      console.log(`Loaded ${this.data.length} legal regulations from Excel file`);
      
      return this.data;
    } catch (error) {
      console.error('Error loading Excel data:', error);
      throw new Error('Failed to load legal regulation data');
    }
  }

  public async getAllRegulations(): Promise<LegalRegulation[]> {
    return await this.loadData();
  }

  public async getRegulationsByDepartment(department: string): Promise<LegalRegulation[]> {
    const data = await this.loadData();
    return data.filter(reg => 
      reg.담당부서 && reg.담당부서.toLowerCase().includes(department.toLowerCase())
    );
  }

  public async getRegulationsByType(type: string): Promise<LegalRegulation[]> {
    const data = await this.loadData();
    return data.filter(reg => 
      reg.법령종류 && reg.법령종류.toLowerCase().includes(type.toLowerCase())
    );
  }

  public async getRegulationById(id: string): Promise<LegalRegulation | null> {
    const data = await this.loadData();
    return data.find(reg => reg.번호 === id) || null;
  }

  public async searchRegulations(query: string): Promise<LegalRegulation[]> {
    const data = await this.loadData();
    const searchTerm = query.toLowerCase();
    
    return data.filter(reg => 
      reg.법률명?.toLowerCase().includes(searchTerm) ||
      reg['법령(약칭)']?.toLowerCase().includes(searchTerm) ||
      reg.소관부처?.toLowerCase().includes(searchTerm) ||
      reg.담당부서?.toLowerCase().includes(searchTerm) ||
      reg['AI 주요 개정 정리']?.toLowerCase().includes(searchTerm)
    );
  }

  public async getDepartments(): Promise<string[]> {
    const data = await this.loadData();
    const departments = new Set<string>();
    
    data.forEach(reg => {
      if (reg.담당부서 && reg.담당부서 !== 'None') {
        departments.add(reg.담당부서);
      }
    });
    
    return Array.from(departments).sort();
  }

  public async getRegulationTypes(): Promise<string[]> {
    const data = await this.loadData();
    const types = new Set<string>();
    
    data.forEach(reg => {
      if (reg.법령종류 && reg.법령종류 !== 'None') {
        types.add(reg.법령종류);
      }
    });
    
    return Array.from(types).sort();
  }
}