import { supabase } from "@/integrations/supabase/client";
import { normalizeInvestorData, parseBuyBox, InvestorData } from "./parseInvestorData";
import * as XLSX from 'xlsx';

// Sample investor data from your Excel file
const investorDataSample: InvestorData[] = [
  {
    companyName: "Summercrest Capital LLC",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/849038051",
    coverageType: "national",
    tags: ["Active", "Direct Purchase", "Wholesaler"],
    tier: 3,
    weeklyCapacity: 100,
    buyBox: `Property Type: Single Family Residence, Land, Mobile Home (with Land), Manufactured Home, Multi-Family Residential (Duplex - Quadplex), Multi-Family Commercial (Fiveplex+)
On-Market Status: Off Market Only
Year Built: 1850-2015
Property Condition: Move in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: 0-400,000
Timeframe: 1 - 7 Days, 1 to 4 Weeks, 3 to 6 Months
Lead Types: Warm, Autohunt, Cold
Other Notes: No 55+, No Co-op`,
    acceptsCold: true,
    mainPoc: "John Smith",
    marketType: "primary"
  },
  {
    companyName: "HLT Buyers",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/921723351",
    coverageType: "multi_state",
    tags: ["Direct Purchase", "Active", "Wholesaler"],
    tier: 1,
    weeklyCapacity: 75,
    buyBox: `Property Type: Single Family & Condominiums.
On-Market Status: Off market, FSBO
Year Built: 1950+
Property Condition: Move-in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: $50k-$600k
Timeframe: Any
Lead Types: Warm, Autohunt, Cold
Other Notes:`,
    acceptsCold: true,
    mainPoc: "Sarah Johnson",
    marketType: "direct_purchase"
  },
  {
    companyName: "Real Deal Homes",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/11908883459",
    coverageType: "national",
    tags: ["Active"],
    tier: 7,
    weeklyCapacity: 25,
    buyBox: `Property Type: Single Family Residence, Land, Mobile Home (with Land), Manufactured Home, Multi-Family Residential (Duplex - Quadplex), Multi-Family Commercial (Fiveplex+), Townhomes, Condominiums
On-Market Status: Listed on the MLS with a Full service agent, Flat Fee MLS or Limited Service Listings, FSBO
Year Built: 1950+
Property Condition: Move in Ready with Modern Finishes, Move in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: 1 - 2,000,000
Timeframe: 1 to 4 Weeks, 3 to 6 Months, 6 to 12 Months, 12+ Months
Other Notes:`,
    acceptsCold: false,
    mainPoc: "Mike Davis",
    marketType: "secondary"
  },
  {
    companyName: "HomeGo + New Western",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/8314362997",
    coverageType: "local",
    tags: ["Active"],
    tier: 2,
    weeklyCapacity: 50,
    buyBox: `Property Type: Single family, multi family up to 10 units
On-Market Status: NO LISTED DEALS
Year Built: Built before 2015
Property Condition: No New Build, or recently remodeled
Minimum/Maximum Purchase Price:
Timeframe:
Lead Types: Warm, Autohunt
Other Notes: 1 bed, 1 bath minimum`,
    acceptsCold: true,
    mainPoc: "Emily Chen",
    marketType: "primary"
  },
  {
    companyName: "Maximized Home Offer / Spark Capital USA",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/38890486037",
    coverageType: "national",
    tags: ["Active"],
    tier: 2,
    weeklyCapacity: 100,
    buyBox: `Property Type: Single Family Residence, Land, Commercial (Retail), Mobile Home (with Land), Manufactured Home, Multi-Family Residential (Duplex - Quadplex), Multi-Family Commercial (Fiveplex+), Townhomes, Condominiums, Farm
*On-Market Status: FSBO, Off Market Only
Year Built: 1920+
Property Condition: Move-in Ready with Modern Finishes, Move-in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: $50,000-$2,000,000
Timeframe: 1 - 7 Days, 1 to 4 Weeks, 3 to 6 Months, 6 to 12 Months, 12+ Months
Other Notes:`,
    acceptsCold: false,
    mainPoc: "David Wilson",
    marketType: "secondary"
  },
  {
    companyName: "Vallejo Capital",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-1/899058301",
    coverageType: "multi_state",
    tags: ["Wholesaler"],
    tier: 3,
    weeklyCapacity: 50,
    buyBox: `Property Type: SFH, No Land
On-Market Status:
Year Built: 1910+
Property Condition: Move in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: 30,000-1,000,000
Timeframe: ,
Other Notes:`,
    acceptsCold: false,
    mainPoc: "Lisa Anderson",
    marketType: "primary"
  },
  {
    companyName: "Local Home Buying LLC",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-2/32865135451",
    coverageType: "local",
    tags: ["TEST"],
    tier: 5,
    weeklyCapacity: 30,
    buyBox: `Property Type: Single Family Residence
On-Market Status: FSBO, Off Market Only
Year Built: 1970+
Property Condition: Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: $100,000 - $600,000
Timeframe: 1 to 4 Weeks, 3 to 6 Months
Other Notes: 1,100+ sqft, 3+ Bed, 2+ Bath, No 55+ communities; No rural areas; No flood zones; No homes fronting/backing RR tracks, gas stations, or 4-lane highways; No new construction`,
    acceptsCold: false,
    mainPoc: "Tom Martinez",
    marketType: "primary"
  },
  {
    companyName: "Newcastle Partners LLC",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-2/34704950070",
    coverageType: "multi_state",
    tags: ["TEST"],
    tier: 5,
    weeklyCapacity: 30,
    buyBox: `Property Type: Single Family Residence, Townhomes, Condominiums
On-Market Status: Off Market Only
Year Built: 1950+
Property Condition: Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: 30,000 - 1,000,000
Timeframe: 1 - 7 Days, 1 to 4 Weeks, 3 to 6 Months
Lead Types: Warm and Autohunt
Other Notes:`,
    acceptsCold: false,
    mainPoc: "Rachel Brown",
    marketType: "primary"
  },
  {
    companyName: "Miles Buys Homes",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-2/39895735971/",
    coverageType: "multi_state",
    tags: ["TEST"],
    tier: 5,
    weeklyCapacity: 30,
    buyBox: `Property Type: Single Family Residence
On-Market Status:Off Market Only
Year Built: 1920+
Property Condition: Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: $250,000 - $2,000,000
Timeframe: 1 - 7 Days, 1 to 4 Weeks, 3 to 6 Months, 6 to 12 Months, 12+ Months
Lead Types: Warm and Autohunt
Other Notes: No 55+, I'm only interested in distressed properties`,
    acceptsCold: false,
    mainPoc: "Chris Taylor",
    marketType: "primary"
  },
  {
    companyName: "Cash Offer Or Terms LLC",
    hubspotUrl: "https://app.hubspot.com/contacts/3298701/record/0-2/37821342302/",
    coverageType: "multi_state",
    tags: ["TEST"],
    tier: 5,
    weeklyCapacity: 30,
    buyBox: `Property Type: Single Family Residence, Land, Commercial (Retail), Mobile Home (with Land), Multi-Family Residential (Duplex - Quadplex), Multi-Family Commercial (Fiveplex+), Farm
On-Market Status: FSBO, Off Market Only
Year Built: 1900+
Property Condition: Move in Ready with Modern Finishes, Move in Ready with Older Finishes, Needs Few Repairs, Needs Major Repairs
Minimum/Maximum Purchase Price: 0+
Timeframe: 1 - 7 Days, 1 to 4 Weeks, 3 to 6 Months, 6 to 12 Months, 12+ Months
Lead Types: Warm and Autohunt
Other Notes: N/A`,
    acceptsCold: false,
    mainPoc: "Amanda White",
    marketType: "secondary"
  }
];

export async function seedInvestors(userId: string) {
  const results = [];
  
  // Try to load from Excel file first, fallback to sample data
  let investorsList = investorDataSample;
  
  try {
    const response = await fetch('/src/data/investors.xlsx');
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      const parsedInvestors: InvestorData[] = [];
      
      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Determine market type from sheet name
        let marketType: 'direct_purchase' | 'primary' | 'secondary' = 'direct_purchase';
        if (sheetName.toLowerCase().includes('primary')) {
          marketType = 'primary';
        } else if (sheetName.toLowerCase().includes('secondary')) {
          marketType = 'secondary';
        }
        
        for (const row of jsonData) {
          try {
            const investorData = normalizeInvestorData({ ...(row as Record<string, any>), marketType });
            parsedInvestors.push(investorData);
          } catch (error) {
            console.error('Error parsing row:', error, row);
          }
        }
      }
      
      if (parsedInvestors.length > 0) {
        investorsList = parsedInvestors;
      }
    }
  } catch (error) {
    console.log('Using sample data - could not load Excel file:', error);
  }
  
  for (const investorData of investorsList) {
    try {
      // Parse buy box data
      const buyBoxParsed = parseBuyBox(investorData.buyBox);
      
      // Insert investor (using dummy UUID since auth is removed)
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .insert([{
          user_id: userId,
          company_name: investorData.companyName,
          main_poc: investorData.mainPoc,
          hubspot_url: investorData.hubspotUrl,
          coverage_type: investorData.coverageType as 'national' | 'multi_state' | 'local' | 'state',
          tier: investorData.tier,
          weekly_cap: investorData.weeklyCapacity,
          cold_accepts: investorData.acceptsCold,
          tags: investorData.tags,
          offer_types: investorData.offerTypes || [],
          freeze_reason: investorData.freezeReason
        }])
        .select()
        .single();

      if (investorError) {
        console.error(`Error inserting investor ${investorData.companyName}:`, investorError);
        continue;
      }

      // Insert buy box
      const { error: buyBoxError } = await supabase
        .from('buy_box')
        .insert({
          investor_id: investor.id,
          property_types: buyBoxParsed.propertyTypes,
          on_market_status: buyBoxParsed.onMarketStatus,
          year_built_min: buyBoxParsed.yearBuiltMin,
          year_built_max: buyBoxParsed.yearBuiltMax,
          price_min: buyBoxParsed.priceMin,
          price_max: buyBoxParsed.priceMax,
          condition_types: buyBoxParsed.conditionTypes,
          timeframe: buyBoxParsed.timeframe,
          lead_types: buyBoxParsed.leadTypes,
          notes: buyBoxParsed.notes
        });

      if (buyBoxError) {
        console.error(`Error inserting buy box for ${investorData.companyName}:`, buyBoxError);
      }

      // Insert markets - create a default market for each
      const { error: marketError } = await supabase
        .from('markets')
        .insert([{
          investor_id: investor.id,
          market_type: investorData.marketType === 'secondary' ? 'primary' : investorData.marketType,
          states: ['TX', 'FL', 'GA'], // Default sample states
          zip_codes: [],
          dmas: []
        }]);

      if (marketError) {
        console.error(`Error inserting markets for ${investorData.companyName}:`, marketError);
      }

      results.push({
        success: true,
        investor: investorData.companyName
      });
    } catch (error) {
      console.error(`Error processing investor ${investorData.companyName}:`, error);
      results.push({
        success: false,
        investor: investorData.companyName,
        error
      });
    }
  }

  return results;
}
