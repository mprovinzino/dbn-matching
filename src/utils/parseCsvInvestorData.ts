import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';

export interface ParsedCsvRow {
  data: {
    companyName: string;
    hubspotUrl?: string;
    offerTypes: string[];
    investorTags: string[];
    statusReason?: string;
    tier: number;
    weeklyCap: number;
    buyBox: {
      propertyTypes?: string[];
      onMarketStatus?: string[];
      yearBuiltMin?: number;
      yearBuiltMax?: number;
      conditionTypes?: string[];
      priceMin?: number;
      priceMax?: number;
      timeframe?: string[];
      leadTypes?: string[];
      notes?: string;
    };
    markets: {
      type: 'direct_purchase' | 'primary' | 'secondary';
      states?: string[];
      zipCodes?: string[];
    }[];
    mainPoc: string;
    coverageType: string;
  };
  status: 'valid' | 'warning' | 'error';
  messages: string[];
  existingInvestorId?: string;
}

interface CsvRow {
  'Company Name': string;
  'HS Company URL': string;
  'Offer Types': string;
  'Investor Tags': string;
  'Reason for Freeze': string;
  'Tier': string;
  'Weekly Cap': string;
  'Buy Box': string;
  'Direct Purchase': string;
  'Primary Markets': string;
  'Secondary Markets': string;
  'Main POC': string;
  'Coverage Type': string;
}

function parseBuyBox(buyBoxText: string) {
  const buyBox: ParsedCsvRow['data']['buyBox'] = {};
  
  if (!buyBoxText || buyBoxText.trim() === '') {
    return buyBox;
  }

  const lines = buyBoxText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Property Type
    if (line.startsWith('Property Type:')) {
      const value = line.substring('Property Type:'.length).trim();
      if (value && value !== '') {
        buyBox.propertyTypes = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // On-Market Status
    if (line.startsWith('On-Market Status:')) {
      const value = line.substring('On-Market Status:'.length).trim();
      if (value && value !== '') {
        buyBox.onMarketStatus = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Year Built
    if (line.startsWith('Year Built:')) {
      const value = line.substring('Year Built:'.length).trim();
      if (value && value !== '') {
        const yearMatch = value.match(/(\d{4})\s*[-to]*\s*(\d{4})?/);
        if (yearMatch) {
          buyBox.yearBuiltMin = parseInt(yearMatch[1]);
          if (yearMatch[2]) {
            buyBox.yearBuiltMax = parseInt(yearMatch[2]);
          }
        } else if (value.includes('+') || value.toLowerCase().includes('current')) {
          const minYear = value.match(/(\d{4})/);
          if (minYear) {
            buyBox.yearBuiltMin = parseInt(minYear[1]);
            buyBox.yearBuiltMax = new Date().getFullYear();
          }
        } else if (value.toLowerCase().includes('no') && value.toLowerCase().includes('after')) {
          const maxYear = value.match(/(\d{4})/);
          if (maxYear) {
            buyBox.yearBuiltMax = parseInt(maxYear[1]);
          }
        }
      }
    }
    
    // Property Condition
    if (line.startsWith('Property Condition:')) {
      const value = line.substring('Property Condition:'.length).trim();
      if (value && value !== '') {
        buyBox.conditionTypes = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Price Range
    if (line.startsWith('Minimum/Maximum Purchase Price:')) {
      const value = line.substring('Minimum/Maximum Purchase Price:'.length).trim();
      if (value && value !== '') {
        const priceMatch = value.match(/\$?([\d,]+)\s*[-to]*\s*\$?([\d,]+)?/);
        if (priceMatch) {
          buyBox.priceMin = parseInt(priceMatch[1].replace(/,/g, ''));
          if (priceMatch[2]) {
            buyBox.priceMax = parseInt(priceMatch[2].replace(/,/g, ''));
          }
        }
      }
    }
    
    // Timeframe
    if (line.startsWith('Timeframe:')) {
      const value = line.substring('Timeframe:'.length).trim();
      if (value && value !== '') {
        buyBox.timeframe = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Lead Types
    if (line.startsWith('Lead Types:')) {
      const value = line.substring('Lead Types:'.length).trim();
      if (value && value !== '') {
        buyBox.leadTypes = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
    
    // Other Notes
    if (line.startsWith('Other Notes:')) {
      const value = line.substring('Other Notes:'.length).trim();
      if (value && value !== '') {
        buyBox.notes = value;
      }
    }
  }
  
  return buyBox;
}

function parseMarketData(marketText: string): { states: string[], zipCodes: string[] } {
  const result = { states: [] as string[], zipCodes: [] as string[] };
  
  if (!marketText || marketText.trim() === '' || marketText.includes('---')) {
    return result;
  }

  const lines = marketText.split('\n').map(l => l.trim());
  
  let inStatesSection = false;
  let inZipSection = false;
  
  for (const line of lines) {
    if (line.startsWith('Full States:')) {
      inStatesSection = true;
      inZipSection = false;
      const statesLine = line.substring('Full States:'.length).trim();
      if (statesLine && statesLine !== '---') {
        // Handle states on the same line
        const states = statesLine.split(',').map(s => s.trim()).filter(s => s.length === 2);
        result.states.push(...states);
      }
    } else if (line.startsWith('Zip Codes:')) {
      inStatesSection = false;
      inZipSection = true;
      const zipLine = line.substring('Zip Codes:'.length).trim();
      if (zipLine && zipLine !== '---') {
        // Handle zips on the same line
        const zips = zipLine.split(',').map(z => z.trim()).filter(z => /^\d{5}$/.test(z));
        result.zipCodes.push(...zips);
      }
    } else if (inStatesSection && line && line !== '---') {
      // State abbreviation (2 letters)
      if (line.length === 2 && /^[A-Z]{2}$/.test(line)) {
        result.states.push(line);
      }
    } else if (inZipSection && line && line !== '---') {
      // Zip codes (comma-separated or individual)
      const zips = line.split(',').map(z => z.trim()).filter(z => /^\d{5}$/.test(z));
      result.zipCodes.push(...zips);
    }
  }
  
  return result;
}

function determineCoverageType(markets: ParsedCsvRow['data']['markets'], coverageTypeColumn?: string): string {
  // Use the Coverage Type column if provided
  if (coverageTypeColumn && coverageTypeColumn.trim() !== '') {
    const type = coverageTypeColumn.trim().toLowerCase();
    if (type === 'national') return 'national';
    if (type === 'state') return 'state';
    if (type === 'multi-state') return 'multi_state';
    if (type === 'local') return 'local';
  }
  
  // Fallback: determine from markets
  const allStates = new Set<string>();
  markets.forEach(m => m.states?.forEach(s => allStates.add(s)));
  
  if (allStates.size >= 48) return 'national';
  if (allStates.size > 1) return 'multi_state';
  if (allStates.size === 1) return 'state';
  
  return 'local';
}

function determineStatus(investorTags: string[]): { status: string, reason?: string } {
  const tagsLower = investorTags.map(t => t.toLowerCase());
  
  if (tagsLower.includes('paused') || tagsLower.includes('frozen')) {
    return { status: 'frozen' };
  }
  
  if (tagsLower.includes('active')) {
    return { status: 'active' };
  }
  
  return { status: 'active' };
}

export async function parseCsvInvestorData(csvText: string, userId: string): Promise<ParsedCsvRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedRows: ParsedCsvRow[] = [];
        
        for (const row of results.data) {
          const messages: string[] = [];
          let status: ParsedCsvRow['status'] = 'valid';
          
          // Skip rows without company name
          if (!row['Company Name'] || row['Company Name'].trim() === '') {
            continue;
          }
          
          const companyName = row['Company Name'].trim();
          
          // Parse offer types
          const offerTypes = row['Offer Types'] 
            ? row['Offer Types'].split(',').map(t => t.trim()).filter(Boolean)
            : [];
          
          // Parse investor tags
          const investorTags = row['Investor Tags']
            ? row['Investor Tags'].split(',').map(t => t.trim()).filter(Boolean)
            : [];
          
          // Determine status
          const statusInfo = determineStatus(investorTags);
          const investorStatus = statusInfo.status;
          const statusReason = row['Reason for Freeze']?.trim() || statusInfo.reason;
          
          // Parse tier
          const tier = parseInt(row['Tier']) || 5;
          if (tier < 1 || tier > 10) {
            messages.push('Tier must be between 1 and 10');
            status = 'warning';
          }
          
          // Parse weekly cap
          const weeklyCap = parseInt(row['Weekly Cap']) || 0;
          
          // Parse buy box
          const buyBox = parseBuyBox(row['Buy Box'] || '');
          
          // Parse markets
          const markets: ParsedCsvRow['data']['markets'] = [];
          
          const directPurchase = parseMarketData(row['Direct Purchase'] || '');
          if (directPurchase.states.length > 0 || directPurchase.zipCodes.length > 0) {
            markets.push({
              type: 'direct_purchase',
              states: directPurchase.states,
              zipCodes: directPurchase.zipCodes
            });
          }
          
          const primaryMarkets = parseMarketData(row['Primary Markets'] || '');
          if (primaryMarkets.states.length > 0 || primaryMarkets.zipCodes.length > 0) {
            markets.push({
              type: 'primary',
              states: primaryMarkets.states,
              zipCodes: primaryMarkets.zipCodes
            });
          }
          
          const secondaryMarkets = parseMarketData(row['Secondary Markets'] || '');
          if (secondaryMarkets.states.length > 0 || secondaryMarkets.zipCodes.length > 0) {
            markets.push({
              type: 'secondary',
              states: secondaryMarkets.states,
              zipCodes: secondaryMarkets.zipCodes
            });
          }
          
          if (markets.length === 0) {
            messages.push('No markets specified');
            status = 'error';
          }
          
          // Determine coverage type
          const coverageType = determineCoverageType(markets, row['Coverage Type']);
          
          // Main POC
          const mainPoc = row['Main POC']?.trim() || '';
          if (!mainPoc) {
            messages.push('Main POC is required');
            status = 'error';
          }
          
          // Check for existing investor
          let existingInvestorId: string | undefined;
          try {
            const { data: existing } = await supabase
              .from('investors')
              .select('id')
              .eq('company_name', companyName)
              .eq('user_id', userId)
              .maybeSingle();
            
            if (existing) {
              existingInvestorId = existing.id;
              messages.push('Investor exists - will update');
              status = status === 'error' ? 'error' : 'warning';
            }
          } catch (error) {
            console.error('Error checking for existing investor:', error);
          }
          
          parsedRows.push({
            data: {
              companyName,
              hubspotUrl: row['HS Company URL']?.trim(),
              offerTypes,
              investorTags,
              statusReason,
              tier,
              weeklyCap,
              buyBox,
              markets,
              mainPoc,
              coverageType
            },
            status,
            messages,
            existingInvestorId
          });
        }
        
        resolve(parsedRows);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
