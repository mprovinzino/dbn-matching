import { supabase } from '@/integrations/supabase/client';
import { readInvestorExcel, ParsedInvestorData } from './parseFullInvestorData';
import investorsXlsxUrl from '@/data/full_investors.xlsx?url';

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
    // Step 1: Read and validate Excel file BEFORE deleting anything
    console.log('Reading Excel file from:', investorsXlsxUrl);
    const investors = await readInvestorExcel(investorsXlsxUrl);
    result.totalProcessed = investors.length;
    
    if (investors.length === 0) {
      throw new Error('Excel file contains no investor data - aborting migration');
    }
    
    console.log(`Found ${investors.length} investors in Excel file`);

    // Step 2: Test insert ONE investor first to catch schema errors
    console.log('Testing schema compatibility...');
    const testInvestor = investors[0];
    const { error: testError } = await supabase
      .from('investors')
      .insert({
        user_id: userId,
        company_name: `TEST_${testInvestor.companyName}`,
        main_poc: testInvestor.mainPoc,
        hubspot_url: testInvestor.hubspotUrl,
        tier: testInvestor.tier,
        weekly_cap: testInvestor.weeklyCap,
        coverage_type: testInvestor.coverageType,
        cold_accepts: testInvestor.coldAccepts,
        offer_types: testInvestor.offerTypes,
        tags: testInvestor.tags,
        freeze_reason: testInvestor.freezeReason,
        status: testInvestor.status,
      })
      .select()
      .single();

    if (testError) {
      console.error('Schema compatibility test failed:', testError);
      throw new Error(`Database schema incompatible: ${testError.message}. Data NOT deleted.`);
    }

    // Delete test record
    await supabase
      .from('investors')
      .delete()
      .eq('company_name', `TEST_${testInvestor.companyName}`)
      .eq('user_id', userId);

    console.log('Schema test passed - proceeding with migration');

    // Step 3: Now safe to clear existing investors
    console.log('Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('investors')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      throw deleteError;
    }

    // Step 4: Insert each investor with their buy_box and markets
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
            status: investor.status,
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
