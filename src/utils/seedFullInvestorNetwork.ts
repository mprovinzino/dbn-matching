import { supabase } from "@/integrations/supabase/client";
import { readInvestorExcel, ParsedInvestorData } from "./parseFullInvestorData";

export interface SeedResult {
  success: boolean;
  companyName: string;
  error?: string;
}

export async function seedFullInvestorNetwork(userId: string): Promise<SeedResult[]> {
  const results: SeedResult[] = [];
  
  try {
    // Read the Excel file from the data directory
    const investors = await readInvestorExcel('/src/data/full_investors.xlsx');
    
    console.log(`Starting to seed ${investors.length} investors...`);
    
    for (const investor of investors) {
      try {
        // Insert investor
        const { data: investorData, error: investorError } = await supabase
          .from('investors')
          .insert([{
            user_id: userId,
            company_name: investor.companyName,
            hubspot_url: investor.hubspotUrl,
            main_poc: investor.mainPoc,
            offer_types: investor.offerTypes,
            tags: investor.tags,
            freeze_reason: investor.freezeReason,
            tier: investor.tier,
            weekly_cap: investor.weeklyCap,
            cold_accepts: investor.coldAccepts,
            coverage_type: investor.coverageType,
            status: investor.status,
          }])
          .select()
          .single();

        if (investorError) {
          results.push({
            success: false,
            companyName: investor.companyName,
            error: investorError.message,
          });
          continue;
        }

        // Insert buy box
        const { error: buyBoxError } = await supabase
          .from('buy_box')
          .insert([{
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
          }]);

        if (buyBoxError) {
          results.push({
            success: false,
            companyName: investor.companyName,
            error: `Buy box error: ${buyBoxError.message}`,
          });
          continue;
        }

        // Insert markets
        const marketsToInsert = [];
        
        if (investor.markets.primary.states.length > 0 || investor.markets.primary.zipCodes.length > 0) {
          marketsToInsert.push({
            investor_id: investorData.id,
            market_type: 'primary' as const,
            states: investor.markets.primary.states,
            zip_codes: investor.markets.primary.zipCodes,
            dmas: [],
          });
        }

        if (investor.markets.secondary.states.length > 0 || investor.markets.secondary.zipCodes.length > 0) {
          marketsToInsert.push({
            investor_id: investorData.id,
            market_type: 'secondary' as const,
            states: investor.markets.secondary.states,
            zip_codes: investor.markets.secondary.zipCodes,
            dmas: [],
          });
        }

        if (investor.markets.tertiary.states.length > 0 || investor.markets.tertiary.zipCodes.length > 0) {
          marketsToInsert.push({
            investor_id: investorData.id,
            market_type: 'tertiary' as const,
            states: investor.markets.tertiary.states,
            zip_codes: investor.markets.tertiary.zipCodes,
            dmas: [],
          });
        }

        if (marketsToInsert.length > 0) {
          const { error: marketsError } = await supabase
            .from('markets')
            .insert(marketsToInsert);

          if (marketsError) {
            results.push({
              success: false,
              companyName: investor.companyName,
              error: `Markets error: ${marketsError.message}`,
            });
            continue;
          }
        }

        results.push({
          success: true,
          companyName: investor.companyName,
        });

        console.log(`✓ Seeded: ${investor.companyName}`);
      } catch (error) {
        results.push({
          success: false,
          companyName: investor.companyName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error seeding investors:', error);
    throw error;
  }
}
