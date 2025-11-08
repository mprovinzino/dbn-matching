export interface DataQualityIssue {
  investor_id: string;
  company_name: string;
  issue_type: 'duplicate_buybox' | 'incomplete_buybox' | 'no_markets' | 'invalid_coverage' | 'missing_buybox';
  issue_severity: 'critical' | 'warning' | 'info';
  issue_description: string;
  fix_action: string;
}

export const validateBuyBox = (buyBox: any, investorName: string): DataQualityIssue[] => {
  const issues: DataQualityIssue[] = [];

  if (!buyBox) {
    issues.push({
      investor_id: '',
      company_name: investorName,
      issue_type: 'missing_buybox',
      issue_severity: 'critical',
      issue_description: 'No buy box record exists',
      fix_action: 'Create a buy box record'
    });
    return issues;
  }

  // Check for missing critical fields
  if (!buyBox.property_types || buyBox.property_types.length === 0) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'critical',
      issue_description: 'Missing property types',
      fix_action: 'Add property types to buy box'
    });
  }

  if (!buyBox.price_min || !buyBox.price_max) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'critical',
      issue_description: 'Missing price range',
      fix_action: 'Set price min and max values'
    });
  }

  if (!buyBox.year_built_min || !buyBox.year_built_max) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'critical',
      issue_description: 'Missing year built range',
      fix_action: 'Set year built min and max values'
    });
  }

  // Check for invalid ranges
  if (buyBox.price_min && buyBox.price_max && Number(buyBox.price_min) > Number(buyBox.price_max)) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'warning',
      issue_description: 'Invalid price range (min > max)',
      fix_action: 'Correct price range values'
    });
  }

  if (buyBox.year_built_min && buyBox.year_built_max && buyBox.year_built_min > buyBox.year_built_max) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'warning',
      issue_description: 'Invalid year range (min > max)',
      fix_action: 'Correct year built range values'
    });
  }

  // Check for missing optional but important fields
  if (!buyBox.condition_types || buyBox.condition_types.length === 0) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'warning',
      issue_description: 'Missing condition types',
      fix_action: 'Add condition types to buy box'
    });
  }

  if (!buyBox.lead_types || buyBox.lead_types.length === 0) {
    issues.push({
      investor_id: buyBox.investor_id,
      company_name: investorName,
      issue_type: 'incomplete_buybox',
      issue_severity: 'warning',
      issue_description: 'Missing lead types',
      fix_action: 'Add lead types to buy box'
    });
  }

  return issues;
};

export const validateMarkets = (
  markets: any[],
  investor: any,
  investorName: string
): DataQualityIssue[] => {
  const issues: DataQualityIssue[] = [];

  if (!markets || markets.length === 0) {
    issues.push({
      investor_id: investor.id,
      company_name: investorName,
      issue_type: 'no_markets',
      issue_severity: 'critical',
      issue_description: 'No market records exist',
      fix_action: 'Add market coverage areas'
    });
    return issues;
  }

  markets.forEach((market) => {
    // Check full coverage markets
    if (market.market_type === 'full_coverage') {
      if (!market.states || market.states.length === 0) {
        issues.push({
          investor_id: investor.id,
          company_name: investorName,
          issue_type: 'invalid_coverage',
          issue_severity: 'critical',
          issue_description: 'Full coverage market missing states',
          fix_action: 'Add states to full coverage market'
        });
      }
    } else {
      // Check non-full coverage markets
      if (!market.zip_codes || market.zip_codes.length === 0) {
        issues.push({
          investor_id: investor.id,
          company_name: investorName,
          issue_type: 'invalid_coverage',
          issue_severity: 'critical',
          issue_description: `${market.market_type} market missing zip codes`,
          fix_action: 'Add zip codes to market'
        });
      }
    }

    // Validate state codes format
    if (market.states && market.states.length > 0) {
      const invalidStates = market.states.filter((s: string) => !/^[A-Z]{2}$/.test(s));
      if (invalidStates.length > 0) {
        issues.push({
          investor_id: investor.id,
          company_name: investorName,
          issue_type: 'invalid_coverage',
          issue_severity: 'warning',
          issue_description: `Invalid state codes: ${invalidStates.join(', ')}`,
          fix_action: 'Use 2-letter uppercase state codes'
        });
      }
    }

    // Validate zip codes format
    if (market.zip_codes && market.zip_codes.length > 0) {
      const invalidZips = market.zip_codes.filter((z: string) => !/^\d{5}$/.test(z));
      if (invalidZips.length > 0) {
        issues.push({
          investor_id: investor.id,
          company_name: investorName,
          issue_type: 'invalid_coverage',
          issue_severity: 'warning',
          issue_description: `Invalid zip codes found (${invalidZips.length} codes)`,
          fix_action: 'Use 5-digit zip codes'
        });
      }
    }
  });

  return issues;
};

export const checkDuplicateBuyBoxes = (buyBoxes: any[], investorName: string): DataQualityIssue | null => {
  if (buyBoxes.length > 1) {
    return {
      investor_id: buyBoxes[0].investor_id,
      company_name: investorName,
      issue_type: 'duplicate_buybox',
      issue_severity: 'critical',
      issue_description: `${buyBoxes.length} buy box records found`,
      fix_action: 'Remove duplicate buy boxes'
    };
  }
  return null;
};
