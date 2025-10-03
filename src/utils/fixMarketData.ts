import { supabase } from "@/integrations/supabase/client";

/**
 * Utility to fix market data where states/zip codes are stored as single space-separated strings
 * instead of individual array elements.
 * 
 * This will split "AL AK AZ AR" into ["AL", "AK", "AZ", "AR"]
 */
export async function fixMarketData() {
  try {
    console.log("Starting market data migration...");

    // Fetch all markets
    const { data: markets, error: fetchError } = await supabase
      .from('markets')
      .select('*');

    if (fetchError) throw fetchError;

    if (!markets || markets.length === 0) {
      console.log("No markets found to fix");
      return { success: true, fixed: 0 };
    }

    let fixedCount = 0;

    // Process each market
    for (const market of markets) {
      let needsUpdate = false;
      const updates: any = {};

      // Fix states array
      if (market.states && market.states.length > 0) {
        const hasSpaceSeparatedString = market.states.some((s: string) => 
          typeof s === 'string' && s.includes(' ')
        );

        if (hasSpaceSeparatedString) {
          // Split all state strings by spaces and flatten
          const fixedStates = market.states
            .flatMap((s: string) => s.split(/\s+/))
            .filter((s: string) => s.length > 0);
          
          updates.states = fixedStates;
          needsUpdate = true;
        }
      }

      // Fix zip codes array
      if (market.zip_codes && market.zip_codes.length > 0) {
        const hasSpaceSeparatedString = market.zip_codes.some((z: string) => 
          typeof z === 'string' && z.includes(' ')
        );

        if (hasSpaceSeparatedString) {
          // Split all zip code strings by spaces and flatten
          const fixedZipCodes = market.zip_codes
            .flatMap((z: string) => z.split(/\s+/))
            .filter((z: string) => z.length > 0);
          
          updates.zip_codes = fixedZipCodes;
          needsUpdate = true;
        }
      }

      // Update the market if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('markets')
          .update(updates)
          .eq('id', market.id);

        if (updateError) {
          console.error(`Error updating market ${market.id}:`, updateError);
        } else {
          fixedCount++;
          console.log(`Fixed market ${market.id}`);
        }
      }
    }

    console.log(`Migration complete. Fixed ${fixedCount} markets.`);
    return { success: true, fixed: fixedCount };

  } catch (error) {
    console.error("Error during market data migration:", error);
    return { success: false, error };
  }
}
