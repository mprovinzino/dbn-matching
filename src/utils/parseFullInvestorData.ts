import * as XLSX from 'xlsx';

export interface ExcelInvestorRow {
  'Company Name': string;
  'HS Company URL': string;
  'Offer Types': string;
  'Investor Tags': string;
  'Reason for Freeze': string;
  'Tier': number;
  'Weekly Cap': number;
  'Buy Box': string;
  'Direct Purchase': string;
  'Primary Markets': string;
  'Secondary Markets': string;
  'Cold': string;
  'Main POC': string;
  'ID': number;
  'Coverage Type': string;
}

export interface ParsedInvestorData {
  companyName: string;
  hubspotUrl: string;
  offerTypes: string[];
  tags: string[];
  freezeReason: string | null;
  tier: number;
  weeklyCap: number;
  coldAccepts: boolean;
  mainPoc: string;
  coverageType: 'national' | 'multi_state' | 'state' | 'local';
  buyBox: {
    propertyTypes: string[];
    onMarketStatus: string[];
    yearBuiltMin: number | null;
    yearBuiltMax: number | null;
    priceMin: number | null;
    priceMax: number | null;
    conditionTypes: string[];
    timeframe: string[];
    leadTypes: string[];
    notes: string | null;
  };
  markets: {
    primary: {
      states: string[];
      zipCodes: string[];
    };
    secondary: {
      states: string[];
      zipCodes: string[];
    };
    tertiary: {
      states: string[];
      zipCodes: string[];
    };
  };
}

function extractMainPocName(pocString: string): string {
  // Extract name from "[Name](url)" format or return as-is
  const match = pocString.match(/\[([^\]]+)\]/);
  return match ? match[1] : pocString;
}

function parseBuyBoxField(buyBoxString: string): ParsedInvestorData['buyBox'] {
  const lines = buyBoxString.split('\n');
  const buyBox: ParsedInvestorData['buyBox'] = {
    propertyTypes: [],
    onMarketStatus: [],
    yearBuiltMin: null,
    yearBuiltMax: null,
    priceMin: null,
    priceMax: null,
    conditionTypes: [],
    timeframe: [],
    leadTypes: [],
    notes: null,
  };

  lines.forEach(line => {
    const cleanLine = line.replace(/<br\/?>/g, '').trim();
    
    if (cleanLine.startsWith('Property Type:')) {
      const types = cleanLine.replace('Property Type:', '').trim();
      buyBox.propertyTypes = types.split(',').map(t => t.trim()).filter(Boolean);
    } else if (cleanLine.startsWith('On-Market Status:')) {
      const statuses = cleanLine.replace('On-Market Status:', '').trim();
      buyBox.onMarketStatus = statuses.split(',').map(s => s.trim()).filter(Boolean);
    } else if (cleanLine.startsWith('Year Built:')) {
      const yearRange = cleanLine.replace('Year Built:', '').trim();
      const yearMatch = yearRange.match(/(\d{4})[+-]?(?:-(\d{4}))?/);
      if (yearMatch) {
        buyBox.yearBuiltMin = parseInt(yearMatch[1]);
        buyBox.yearBuiltMax = yearMatch[2] ? parseInt(yearMatch[2]) : null;
      }
    } else if (cleanLine.startsWith('Property Condition:')) {
      const conditions = cleanLine.replace('Property Condition:', '').trim();
      buyBox.conditionTypes = conditions.split(',').map(c => c.trim()).filter(Boolean);
    } else if (cleanLine.startsWith('Minimum/Maximum Purchase Price:')) {
      const priceRange = cleanLine.replace('Minimum/Maximum Purchase Price:', '').trim();
      const priceMatch = priceRange.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
      if (priceMatch) {
        buyBox.priceMin = parseInt(priceMatch[1].replace(/,/g, ''));
        buyBox.priceMax = parseInt(priceMatch[2].replace(/,/g, ''));
      } else {
        // Handle single values or ranges without $ signs
        const numbers = priceRange.match(/(\d[\d,]*)/g);
        if (numbers && numbers.length >= 2) {
          buyBox.priceMin = parseInt(numbers[0].replace(/,/g, ''));
          buyBox.priceMax = parseInt(numbers[1].replace(/,/g, ''));
        }
      }
    } else if (cleanLine.startsWith('Timeframe:')) {
      const timeframes = cleanLine.replace('Timeframe:', '').trim();
      buyBox.timeframe = timeframes.split(',').map(t => t.trim()).filter(Boolean);
    } else if (cleanLine.startsWith('Lead Types:')) {
      const leads = cleanLine.replace('Lead Types:', '').trim();
      buyBox.leadTypes = leads.split(',').map(l => l.trim()).filter(Boolean);
    } else if (cleanLine.startsWith('Other Notes:')) {
      const notes = cleanLine.replace('Other Notes:', '').trim();
      buyBox.notes = notes || null;
    }
  });

  return buyBox;
}

function parseMarketField(marketString: string): { states: string[]; zipCodes: string[] } {
  const lines = marketString.split('\n').map(l => l.replace(/<br\/?>/g, '').trim());
  const states: string[] = [];
  const zipCodes: string[] = [];
  
  let inStates = false;
  let inZipCodes = false;

  lines.forEach(line => {
    if (line.startsWith('Full States:')) {
      inStates = true;
      inZipCodes = false;
      const statesStr = line.replace('Full States:', '').trim();
      if (statesStr && statesStr !== '---') {
        states.push(...statesStr.split(',').map(s => s.trim()).filter(Boolean));
      }
    } else if (line.startsWith('Zip Codes:')) {
      inStates = false;
      inZipCodes = true;
      const zipStr = line.replace('Zip Codes:', '').trim();
      if (zipStr && zipStr !== '---') {
        zipCodes.push(...zipStr.split(',').map(z => z.trim()).filter(Boolean));
      }
    } else if (line && line !== '---') {
      if (inStates) {
        states.push(...line.split(',').map(s => s.trim()).filter(Boolean));
      } else if (inZipCodes) {
        zipCodes.push(...line.split(',').map(z => z.trim()).filter(Boolean));
      }
    }
  });

  return { states, zipCodes };
}

function normalizeCoverageType(coverageType: string): 'national' | 'multi_state' | 'state' | 'local' {
  const normalized = coverageType.toLowerCase().trim().replace(/[-\s]/g, '_');
  if (normalized === 'national') return 'national';
  if (normalized === 'multi_state') return 'multi_state';
  if (normalized === 'state' || normalized === 'single_state') return 'state';
  return 'local';
}

export function parseExcelInvestorData(row: ExcelInvestorRow): ParsedInvestorData {
  const primaryMarkets = row['Primary Markets'] ? parseMarketField(row['Primary Markets']) : { states: [], zipCodes: [] };
  const secondaryMarkets = row['Secondary Markets'] ? parseMarketField(row['Secondary Markets']) : { states: [], zipCodes: [] };
  
  return {
    companyName: row['Company Name'] || '',
    hubspotUrl: row['HS Company URL'] || '',
    offerTypes: row['Offer Types'] ? row['Offer Types'].split(',').map(t => t.trim()).filter(Boolean) : [],
    tags: row['Investor Tags'] ? row['Investor Tags'].split(',').map(t => t.trim()).filter(Boolean) : [],
    freezeReason: row['Reason for Freeze'] || null,
    tier: row['Tier'] || 1,
    weeklyCap: row['Weekly Cap'] || 0,
    coldAccepts: row['Cold'] === 'YES',
    mainPoc: extractMainPocName(row['Main POC'] || ''),
    coverageType: normalizeCoverageType(row['Coverage Type'] || 'single-state'),
    buyBox: parseBuyBoxField(row['Buy Box'] || ''),
    markets: {
      primary: primaryMarkets,
      secondary: secondaryMarkets,
      tertiary: { states: [], zipCodes: [] }, // Not in Excel, but schema supports it
    },
  };
}

export async function readInvestorExcel(fileUrl: string): Promise<ParsedInvestorData[]> {
  try {
    console.log('Fetching Excel file from:', fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json<ExcelInvestorRow>(worksheet);
    
    console.log(`Successfully parsed ${jsonData.length} rows from Excel file`);
    return jsonData.map(row => parseExcelInvestorData(row));
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}
