import { supabase } from '@/integrations/supabase/client';
import { readInvestorExcel, ParsedInvestorData } from './parseFullInvestorData';

export interface MigrationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ investor: string; error: string }>;
}

export async function migrateInvestorsToDatabase(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalProcessed: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
  };

  try {
    // Step 1: Read Excel file
    console.log('Reading Excel file...');
    const investors = await readInvestorExcel('/src/data/current_investors.xlsx');
    result.totalProcessed = investors.length;
    console.log(`Found ${investors.length} investors in Excel file`);

    // Step 2: Clear existing investors for this user
    console.log('Clearing existing sample data...');
    const { error: deleteError } = await supabase
      .from('investors')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      throw deleteError;
    }

    // Step 3: Insert each investor with their buy_box and markets
    for (const investor of investors) {
      try {
        // Insert investor
        const { data: investorData, error: investorError } = await supabase
          .from('investors')
          .insert({
            user_id: userId,
            company_name: investor.companyName,
            main_poc: investor.mainPoc,
            hubspot_url: investor.hubspotUrl,
            tier: investor.tier,
            weekly_cap: investor.weeklyCap,
            coverage_type: investor.coverageType,
            cold_accepts: investor.coldAccepts,
            offer_types: investor.offerTypes,
            tags: investor.tags,
            freeze_reason: investor.freezeReason,
          })
          .select()
          .single();

        if (investorError) throw investorError;

        // Insert buy_box
        const { error: buyBoxError } = await supabase
          .from('buy_box')
          .insert({
            investor_id: investorData.id,
            property_types: investor.buyBox.propertyTypes,
            on_market_status: investor.buyBox.onMarketStatus,
            year_built_min: investor.buyBox.yearBuiltMin,
            year_built_max: investor.buyBox.yearBuiltMax,
            price_min: investor.buyBox.priceMin,
            price_max: investor.buyBox.priceMax,
            condition_types: investor.buyBox.conditionTypes,
            timeframe: investor.buyBox.timeframe,
            lead_types: investor.buyBox.leadTypes,
            notes: investor.buyBox.notes,
          });

        if (buyBoxError) throw buyBoxError;

        // Insert primary markets if they exist
        if (investor.markets.primary.states.length > 0 || investor.markets.primary.zipCodes.length > 0) {
          const { error: primaryMarketError } = await supabase
            .from('markets')
            .insert({
              investor_id: investorData.id,
              market_type: 'primary',
              states: investor.markets.primary.states,
              zip_codes: investor.markets.primary.zipCodes,
            });

          if (primaryMarketError) throw primaryMarketError;
        }

        // Insert secondary markets if they exist
        if (investor.markets.secondary.states.length > 0 || investor.markets.secondary.zipCodes.length > 0) {
          const { error: secondaryMarketError } = await supabase
            .from('markets')
            .insert({
              investor_id: investorData.id,
              market_type: 'secondary',
              states: investor.markets.secondary.states,
              zip_codes: investor.markets.secondary.zipCodes,
            });

          if (secondaryMarketError) throw secondaryMarketError;
        }

        result.successCount++;
        console.log(`✓ Successfully imported: ${investor.companyName}`);

      } catch (error: any) {
        result.failedCount++;
        const errorMessage = error.message || 'Unknown error';
        result.errors.push({
          investor: investor.companyName,
          error: errorMessage,
        });
        console.error(`✗ Failed to import ${investor.companyName}:`, errorMessage);
      }
    }

    result.success = result.failedCount === 0;
    console.log(`Migration complete: ${result.successCount} succeeded, ${result.failedCount} failed`);
    
    return result;

  } catch (error: any) {
    console.error('Migration failed:', error);
    result.errors.push({
      investor: 'Migration Process',
      error: error.message || 'Unknown error',
    });
    return result;
  }
}
