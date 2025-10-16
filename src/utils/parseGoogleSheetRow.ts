export interface ParsedSheetRow {
  // Basic Info (columns 1-5)
  timestamp: string;
  company_name: string;
  poc_name: string;
  poc_email: string;
  poc_phone: string;
  
  // Markets (column 6) - Complex parsing
  markets_raw: string;
  primary_states: string[];
  secondary_states: string[];
  direct_purchase_states: string[];
  
  // Tier & Cap (columns 7-8)
  tier: number;
  weekly_cap: number;
  
  // Document Links (columns 9-10)
  primary_zip_sheet_urls: string[];
  past_experience_urls: string[];
  
  // Buy Box (columns 11-16)
  property_types: string[];
  lead_types: string[];
  year_built_min: number | null;
  year_built_max: number | null;
  condition_types: string[];
  price_min: number | null;
  price_max: number | null;
  timeframe: string[];
  
  // Additional Notes (column 17)
  notes: string;
  
  // Metadata
  cold_accepts: boolean;
  coverage_type: 'national' | 'multi_state' | 'state' | 'local';
}

// Extract URLs from a text field
function extractUrls(text: string): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s,]+/g;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.trim()).filter(Boolean);
}

// Parse comma-separated list
function parseList(text: string): string[] {
  if (!text) return [];
  return text
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

// Parse year range like "1920 - 2005"
function parseYearRange(text: string): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const match = text.match(/(\d{4})\s*-\s*(\d{4})/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { min: null, max: null };
}

// Parse price range like "$20,000 - $5,000,000+"
function parsePriceRange(text: string): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const cleaned = text.replace(/[\$,+]/g, '');
  const match = cleaned.match(/(\d+)\s*-\s*(\d+)/);
  if (match) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) };
  }
  return { min: null, max: null };
}

// Parse complex market text
function parseMarkets(marketText: string): {
  primary: string[];
  secondary: string[];
  directPurchase: string[];
} {
  const primary: string[] = [];
  const secondary: string[] = [];
  const directPurchase: string[] = [];

  if (!marketText) {
    return { primary, secondary, directPurchase };
  }

  const lines = marketText.split('\n').map(line => line.trim()).filter(Boolean);

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    if (lowerLine.includes('primary market')) {
      // Extract states after the colon
      const match = line.match(/:\s*(.+)/);
      if (match) {
        const states = parseList(match[1]);
        primary.push(...states);
      }
    } else if (lowerLine.includes('secondary') || lowerLine.includes('all other states')) {
      // Extract states after the colon
      const match = line.match(/:\s*(.+)/);
      if (match) {
        const statesText = match[1];
        if (statesText.toLowerCase().includes('all other states')) {
          secondary.push('ALL_OTHER_STATES');
        } else {
          const states = parseList(statesText);
          secondary.push(...states);
        }
      }
    } else if (lowerLine.includes('direct purchase') || lowerLine.includes('wholesale')) {
      // Extract states after the colon
      const match = line.match(/:\s*(.+)/);
      if (match) {
        const states = parseList(match[1]);
        directPurchase.push(...states);
      }
    }
  }

  return { primary, secondary, directPurchase };
}

// Determine coverage type based on market spread
function determineCoverageType(
  primary: string[],
  secondary: string[],
  directPurchase: string[]
): 'national' | 'multi_state' | 'state' | 'local' {
  const allStates = [...new Set([...primary, ...secondary, ...directPurchase])];
  
  if (secondary.includes('ALL_OTHER_STATES') || allStates.length >= 40) {
    return 'national';
  } else if (allStates.length > 1) {
    return 'multi_state';
  } else if (allStates.length === 1) {
    return 'state';
  }
  return 'local';
}

export function parseGoogleSheetRow(rowText: string): ParsedSheetRow {
  // Split by tab character
  const columns = rowText.split('\t').map(col => col.trim());

  // Parse markets
  const markets = parseMarkets(columns[5] || '');
  
  // Parse year range
  const yearRange = parseYearRange(columns[12] || '');
  
  // Parse price range
  const priceRange = parsePriceRange(columns[14] || '');

  // Extract document URLs
  const primaryZipSheetUrls = extractUrls(columns[8] || '');
  const pastExperienceUrls = extractUrls(columns[9] || '');

  return {
    // Basic Info
    timestamp: columns[0] || '',
    company_name: columns[1] || '',
    poc_name: columns[2] || '',
    poc_email: columns[3] || '',
    poc_phone: columns[4] || '',
    
    // Markets
    markets_raw: columns[5] || '',
    primary_states: markets.primary,
    secondary_states: markets.secondary,
    direct_purchase_states: markets.directPurchase,
    
    // Tier & Cap
    tier: parseInt(columns[6]) || 1,
    weekly_cap: parseInt(columns[7]) || 0,
    
    // Document Links
    primary_zip_sheet_urls: primaryZipSheetUrls,
    past_experience_urls: pastExperienceUrls,
    
    // Buy Box
    property_types: parseList(columns[10] || ''),
    lead_types: parseList(columns[11] || ''),
    year_built_min: yearRange.min,
    year_built_max: yearRange.max,
    condition_types: parseList(columns[13] || ''),
    price_min: priceRange.min,
    price_max: priceRange.max,
    timeframe: parseList(columns[15] || ''),
    
    // Additional Notes
    notes: columns[16] || '',
    
    // Metadata
    cold_accepts: (columns[17] || '').toLowerCase().includes('yes'),
    coverage_type: determineCoverageType(
      markets.primary,
      markets.secondary,
      markets.directPurchase
    ),
  };
}
