// Utility to parse Buy Box string into structured data
export function parseBuyBox(buyBoxString: string) {
  const lines = buyBoxString.split('\n').filter(line => line.trim());
  const data: Record<string, string> = {};
  
  lines.forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      data[key] = value;
    }
  });

  return {
    propertyTypes: data['Property Type']?.split(',').map(t => t.trim()) || [],
    onMarketStatus: data['On-Market Status']?.split(',').map(t => t.trim()) || [],
    yearBuiltMin: extractYearRange(data['Year Built'])?.min || null,
    yearBuiltMax: extractYearRange(data['Year Built'])?.max || null,
    priceMin: extractPriceRange(data['Minimum/Maximum Purchase Price'])?.min || null,
    priceMax: extractPriceRange(data['Minimum/Maximum Purchase Price'])?.max || null,
    conditionTypes: data['Property Condition']?.split(',').map(t => t.trim()) || [],
    timeframe: data['Timeframe']?.split(',').map(t => t.trim()) || [],
    leadTypes: data['Lead Types']?.split(',').map(t => t.trim()) || [],
    notes: data['Other Notes'] || ''
  };
}

function extractYearRange(yearString?: string): { min: number; max: number } | null {
  if (!yearString) return null;
  
  const match = yearString.match(/(\d{4})[+\-]?(\d{4})?/);
  if (match) {
    const year1 = parseInt(match[1]);
    const year2 = match[2] ? parseInt(match[2]) : year1;
    return {
      min: Math.min(year1, year2),
      max: Math.max(year1, year2)
    };
  }
  return null;
}

function extractPriceRange(priceString?: string): { min: number; max: number } | null {
  if (!priceString) return null;
  
  // Remove $ and commas, then extract numbers
  const cleaned = priceString.replace(/[$,]/g, '');
  const match = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/);
  
  if (match) {
    return {
      min: parseInt(match[1]),
      max: parseInt(match[2])
    };
  }
  
  // Handle formats like "$50,000+" or "0+"
  const singleMatch = cleaned.match(/(\d+)\+?/);
  if (singleMatch) {
    const value = parseInt(singleMatch[1]);
    return { min: value, max: value * 10 }; // Default max multiplier
  }
  
  return null;
}

export interface InvestorData {
  companyName: string;
  hubspotUrl: string;
  coverageType: string;
  tags: string[];
  tier: number;
  weeklyCapacity: number;
  buyBox: string;
  acceptsCold: boolean;
  mainPoc: string;
  marketType: 'direct_purchase' | 'primary' | 'secondary';
  freezeReason?: string;
  offerTypes?: string[];
}

export function normalizeInvestorData(raw: any): InvestorData {
  return {
    companyName: raw['Company Name'] || raw['companyName'] || '',
    hubspotUrl: raw['HS Company URL'] || raw['hubspotUrl'] || '',
    coverageType: normalizeCoverageType(raw['Coverage Type (AI)'] || raw['coverageType'] || 'National'),
    tags: parseTags(raw['Investor Tags'] || raw['tags'] || ''),
    tier: parseInt(raw['Tier'] || raw['tier'] || '5'),
    weeklyCapacity: parseInt(raw['Weekly Cap'] || raw['weeklyCapacity'] || '0'),
    buyBox: raw['Buy Box'] || raw['buyBox'] || '',
    acceptsCold: parseBoolean(raw['Cold'] || raw['acceptsCold'] || 'NO'),
    mainPoc: raw['Main POC'] || raw['mainPoc'] || 'Not Specified',
    marketType: raw.marketType || 'direct_purchase',
    freezeReason: raw['Reason for Freeze'] || raw['freezeReason'],
    offerTypes: raw['Offer Types'] ? raw['Offer Types'].split(',').map((t: string) => t.trim()) : []
  };
}

function normalizeCoverageType(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes('national')) return 'national';
  if (normalized.includes('multi') && normalized.includes('state') && normalized.includes('local')) return 'local';
  if (normalized.includes('multi') && normalized.includes('state')) return 'multi_state';
  if (normalized.includes('state')) return 'state';
  return 'national';
}

function parseTags(tagString: string): string[] {
  if (!tagString) return [];
  return tagString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

function parseBoolean(value: string): boolean {
  return value.toUpperCase() === 'YES' || value.toUpperCase() === 'TRUE';
}
