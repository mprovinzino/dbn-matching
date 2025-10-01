import { supabase } from "@/integrations/supabase/client";

// Parsed investor data from the Word document
export const actualInvestorData = [
  {
    company_name: "Key Flip",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/933930351",
    main_poc: "",
    offer_types: ["Direct Purchase", "Novation", "Creative / Seller Finance"],
    coverage_type: "national" as const,
    tags: ["PAUSED"],
    freeze_reason: "Poor Performance",
    tier: 10,
    weekly_cap: 25,
    cold_accepts: false,
    buy_box: {
      property_types: [],
      on_market_status: [],
      year_built_min: null,
      year_built_max: 2020,
      condition_types: [],
      price_min: null,
      price_max: null,
      timeframe: [],
      lead_types: [],
      notes: "NO properties built AFTER 2020",
    },
    markets: {
      primary: {
        states: ["TN"],
        zip_codes: ["37042","37040","37043","42223","37010","37191","37051","37079","37052","37050","37171","37142","42254","37044","37041","37013","37211","37027","37115","37221","37207","37086","37076","37209","37217","37072","37214","37138","37205","37206","37215","37203","37216","37212","37208","37204","37210","37218","37080","37220","37189","37143","37248","37245","37228","37247","37237","37213","37201","37219","37232","37246","37243","37249","37202","37011","37024","37070","37116","37222","37227","37224","37229","37230","37235","37234","37236","37240","37238","37242","37241","37244","37250","37918","37920","37922","37931","37923","37921","37919","37849","37934","37917","37912","37914","37932","37938","37909","37924","37721","37916","37764","37871","37915","37754","37806","37902","37990","37996","37901","37928","37927","37930","37929","37933","37939","37950","37940","37995","37997","37998","37421","37343","37363","37379","37415","37412","37405","37411","37377","37416","37406","37341","37404","37407","37403","37419","37353","37336","37402","37302","37373","37338","37409","37410","37408","37308","37350","37351","37315","37384","37401","37414","37424","37422","37450","37304","38017","38109","38128","38002","38125","38134","38016","38116","38127","38111","38018","38115","38118","38135","38117","38138","38122","38119","38053","38106","38141"],
      },
    },
  },
  {
    company_name: "Summercrest Capital LLC",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/849038051",
    main_poc: "Dontre Doxley",
    offer_types: ["Direct Purchase", "Creative / Seller Finance", "Novation"],
    coverage_type: "local" as const,
    tags: ["Active", "Direct Purchase", "Wholesaler"],
    freeze_reason: null,
    tier: 3,
    weekly_cap: 100,
    cold_accepts: false,
    buy_box: {
      property_types: ["Single Family Residence", "Land", "Mobile Home (with Land)", "Manufactured Home", "Multi-Family Residential (Duplex - Quadplex)", "Multi-Family Commercial (Fiveplex+)"],
      on_market_status: ["Off Market Only"],
      year_built_min: 1850,
      year_built_max: 2015,
      condition_types: ["Move in Ready with Older Finishes", "Needs Few Repairs", "Needs Major Repairs"],
      price_min: 0,
      price_max: 400000,
      timeframe: ["1 - 7 Days", "1 to 4 Weeks", "3 to 6 Months"],
      lead_types: ["Warm", "Autohunt", "Cold"],
      notes: "No 55+, No Co-op",
    },
    markets: {
      primary: {
        states: ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE"],
        zip_codes: ["38104","38114","38133","38108","38139","38107","38112","38103","38120","38004","38028","38105","38126","38129","38140","38143","38146","38195","38165","38142","38132","38137","38152","38188","38136","38110","38147","38113","38131","38130","38014","38027","38029","38055","38054","38088","38083","38101","38124","38145","38148","38151","38150","38157","38161","38159","38163","38167","38166","38173","38168","38175","38174","38181","38177","38183","38182","38186","38184","38187","38193","38190","38194","38197","37501","37544"],
      },
    },
  },
  {
    company_name: "HLT Buyers",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/921723351",
    main_poc: "Efrain Lopez",
    offer_types: ["Direct Purchase", "Creative / Seller Finance", "Novation"],
    coverage_type: "multi_state" as const,
    tags: ["Direct Purchase", "Active", "Wholesaler"],
    freeze_reason: null,
    tier: 1,
    weekly_cap: 75,
    cold_accepts: true,
    buy_box: {
      property_types: ["Single Family", "Condominiums"],
      on_market_status: ["Off market", "FSBO"],
      year_built_min: 1950,
      year_built_max: null,
      condition_types: ["Move-in Ready with Older Finishes", "Needs Few Repairs", "Needs Major Repairs"],
      price_min: 50000,
      price_max: 600000,
      timeframe: ["Any"],
      lead_types: ["Warm", "Autohunt", "Cold"],
      notes: "",
    },
    markets: {
      primary: {
        states: ["AZ", "FL", "NV", "GA", "CA", "SC", "NC", "TX", "AL", "OH"],
        zip_codes: [],
      },
    },
  },
  {
    company_name: "Real Deal Homes",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/11908883459",
    main_poc: "Brian Harbour",
    offer_types: ["Direct Purchase", "Creative / Seller Finance", "Novation"],
    coverage_type: "multi_state" as const,
    tags: ["Active"],
    freeze_reason: null,
    tier: 7,
    weekly_cap: 25,
    cold_accepts: false,
    buy_box: {
      property_types: ["Single Family Residence", "Land", "Mobile Home (with Land)", "Manufactured Home", "Multi-Family Residential (Duplex - Quadplex)", "Multi-Family Commercial (Fiveplex+)", "Townhomes", "Condominiums"],
      on_market_status: ["Listed on the MLS with a Full service agent", "Flat Fee MLS or Limited Service Listings", "FSBO"],
      year_built_min: 1950,
      year_built_max: null,
      condition_types: ["Move in Ready with Modern Finishes", "Move in Ready with Older Finishes", "Needs Few Repairs", "Needs Major Repairs"],
      price_min: 1,
      price_max: 2000000,
      timeframe: ["1 to 4 Weeks", "3 to 6 Months", "6 to 12 Months", "12+ Months"],
      lead_types: [],
      notes: "",
    },
    markets: {
      primary: {
        states: ["TX", "VA", "FL", "GA", "NC", "AZ", "IN", "OH", "AL", "MI", "CA", "NV"],
        zip_codes: [],
      },
      secondary: {
        states: ["AL", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"],
        zip_codes: [],
      },
    },
  },
  {
    company_name: "Upward Properties",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/863821401",
    main_poc: "Scott Winkelman",
    offer_types: ["Direct Purchase", "Creative / Seller Finance", "Novation"],
    coverage_type: "multi_state" as const,
    tags: ["PAUSED"],
    freeze_reason: "Poor Performance",
    tier: 7,
    weekly_cap: 25,
    cold_accepts: false,
    buy_box: {
      property_types: [],
      on_market_status: [],
      year_built_min: null,
      year_built_max: null,
      condition_types: [],
      price_min: null,
      price_max: null,
      timeframe: [],
      lead_types: [],
      notes: "",
    },
    markets: {
      primary: {
        states: [],
        zip_codes: ["62001","62002","62006","62010","62012","62013","62014","62018","62021","62022","62024","62025","62026","62028","62030","62031","62034","62035","62036","62037","62040","62045","62046","62047","62048","62052","62054","62058","62059","62060","62061","62062","62065","62067","62070","62071","62074","62079","62084","62087","62090","62095","62097","62201","62202","62203","62204","62205","62206","62207","62208","62214","62215","62216","62217","62218","62219","62220","62221","62222","62223","62225","62226","62230","62232","62233","62234","62236","62237","62239","62240","62241","62242","62243","62244","62245","62248","62249","62254","62255","62256","62257","62258","62259","62260","62261","62264","62265","62266","62268","62269","62271","62272","62273","62275","62277","62278","62279","62280","62281","62282","62285","62286","62288","62289","62292","62293","62294","62295","62297","62298","62916","63005","63006","63010","63011","63012","63013","63014","63015","63016","63017","63019","63020","63021","63022","63023","63024","63025","63026","63028","63030","63031","63032","63033","63034","63036","63037","63038","63039","63040","63041","63042","63043","63044","63045","63047","63048","63049","63050","63051","63052","63053","63055","63056","63057","63060","63061","63065","63066","63068","63069","63070","63071","63072","63073","63074","63077","63079","63080","63084","63087","63088","63089","63090","63091","63099","63101","63102","63103","63104","63105","63106","63107","63108","63109","63110","63111","63112","63113","63114","63115","63116","63117","63118","63119","63120","63121","63122","63123","63124","63125","63126","63127","63128","63129","63130","63131","63132","63133","63134","63135","63136","63137","63138","63139","63140","63141","63143","63144","63145","63146","63147","63150","63151","63155","63156","63157","63158","63160","63163","63164","63166","63167","63169","63171","63177","63178","63179","63180","63188","63195","63197","63199","63301","63302","63303","63304","63330","63332","63333","63334","63336","63338","63339","63341","63342","63343","63344","63345","63346","63347","63348","63349","63350","63351","63352","63353","63357","63359","63361","63362","63363","63365","63366","63367","63368","63369","63370","63373","63376","63377","63378","63379","63380","63381","63382","63383","63384","63385","63386","63387","63388","63389","63390","63431","63436","63437","63441","63443","63450","63456","63459","63462","63468","63532","63534","63552","63558","63601","63620","63621","63622","63623","63624","63625","63626","63627","63628","63629","63630","63631","63632"],
      },
    },
  },
  {
    company_name: "Glacier Bay",
    hubspot_url: "https://app.hubspot.com/contacts/3298701/record/0-1/938142701",
    main_poc: "",
    offer_types: ["Direct Purchase"],
    coverage_type: "multi_state" as const,
    tags: ["PAUSED"],
    freeze_reason: "Poor Performance",
    tier: 6,
    weekly_cap: 50,
    cold_accepts: true,
    buy_box: {
      property_types: ["Single Family Residence", "Land", "Commercial (Retail)", "Mobile Home (with Land)", "Mobile Home (without Land)", "Manufactured Home", "Multi-Family Residential (Duplex - Quadplex)", "Multi-Family Commercial (Fiveplex+)", "Townhomes", "Condominiums", "Farm"],
      on_market_status: ["Listed on the MLS with a Full service agent", "Flat Fee MLS or Limited Service Listings", "FSBO", "Off Market Only"],
      year_built_min: 1870,
      year_built_max: null,
      condition_types: ["Move in Ready with Modern Finishes", "Move in Ready with Older Finishes", "Needs Few Repairs", "Needs Major Repairs"],
      price_min: 5000,
      price_max: 2000000,
      timeframe: ["1 - 7 Days", "1 to 4 Weeks", "3 to 6 Months", "6 to 12 Months"],
      lead_types: ["Warm", "Autohunt", "Cold"],
      notes: "",
    },
    markets: {
      primary: {
        states: ["IL", "WI"],
        zip_codes: [],
      },
    },
  },
];

export async function seedActualInvestors(userId: string) {
  const results = [];

  for (const investorData of actualInvestorData) {
    try {
      // Insert investor
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .insert([{
          user_id: userId,
          company_name: investorData.company_name,
          main_poc: investorData.main_poc,
          hubspot_url: investorData.hubspot_url,
          coverage_type: investorData.coverage_type,
          tier: investorData.tier,
          weekly_cap: investorData.weekly_cap,
          cold_accepts: investorData.cold_accepts,
          offer_types: investorData.offer_types,
          tags: investorData.tags,
          freeze_reason: investorData.freeze_reason,
        }])
        .select()
        .single();

      if (investorError) {
        console.error(`Error inserting investor ${investorData.company_name}:`, investorError);
        results.push({ success: false, company: investorData.company_name, error: investorError });
        continue;
      }

      // Insert buy box
      await supabase.from('buy_box').insert({
        investor_id: investor.id,
        property_types: investorData.buy_box.property_types,
        on_market_status: investorData.buy_box.on_market_status,
        year_built_min: investorData.buy_box.year_built_min,
        year_built_max: investorData.buy_box.year_built_max,
        price_min: investorData.buy_box.price_min,
        price_max: investorData.buy_box.price_max,
        condition_types: investorData.buy_box.condition_types,
        timeframe: investorData.buy_box.timeframe,
        lead_types: investorData.buy_box.lead_types,
        notes: investorData.buy_box.notes,
      });

      // Insert primary markets
      if (investorData.markets.primary) {
        const primaryZips: string[] = Array.isArray(investorData.markets.primary.zip_codes) 
          ? investorData.markets.primary.zip_codes 
          : [];

        await supabase.from('markets').insert([{
          investor_id: investor.id,
          market_type: 'primary',
          states: investorData.markets.primary.states,
          zip_codes: primaryZips,
        }]);
      }

      // Insert secondary markets
      if (investorData.markets.secondary) {
        const secondaryZips: string[] = Array.isArray(investorData.markets.secondary.zip_codes) 
          ? investorData.markets.secondary.zip_codes 
          : [];

        await supabase.from('markets').insert([{
          investor_id: investor.id,
          market_type: 'secondary',
          states: investorData.markets.secondary.states,
          zip_codes: secondaryZips,
        }]);
      }

      results.push({ success: true, company: investorData.company_name });
    } catch (error) {
      console.error(`Error processing investor ${investorData.company_name}:`, error);
      results.push({ success: false, company: investorData.company_name, error });
    }
  }

  return results;
}
