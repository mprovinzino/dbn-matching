import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { validateBuyBox, validateMarkets, checkDuplicateBuyBoxes, DataQualityIssue } from "@/utils/dataQualityValidation";

export const useDataQualityChecks = () => {
  return useQuery({
    queryKey: ["data-quality-checks"],
    queryFn: async () => {
      const issues: DataQualityIssue[] = [];
      
      // Fetch all active investors with their buy_boxes and markets
      const { data: investors, error: investorsError } = await supabase
        .from("investors")
        .select("*")
        .eq("status", "active");

      if (investorsError) throw investorsError;

      // Fetch all buy_boxes
      const { data: buyBoxes, error: buyBoxError } = await supabase
        .from("buy_box")
        .select("*");

      if (buyBoxError) throw buyBoxError;

      // Fetch all markets
      const { data: markets, error: marketsError } = await supabase
        .from("markets")
        .select("*");

      if (marketsError) throw marketsError;

      // Group buy_boxes by investor_id
      const buyBoxesByInvestor = new Map<string, any[]>();
      buyBoxes?.forEach((bb) => {
        const existing = buyBoxesByInvestor.get(bb.investor_id) || [];
        buyBoxesByInvestor.set(bb.investor_id, [...existing, bb]);
      });

      // Group markets by investor_id
      const marketsByInvestor = new Map<string, any[]>();
      markets?.forEach((m) => {
        const existing = marketsByInvestor.get(m.investor_id) || [];
        marketsByInvestor.set(m.investor_id, [...existing, m]);
      });

      // Check each investor
      investors?.forEach((investor) => {
        const investorBuyBoxes = buyBoxesByInvestor.get(investor.id) || [];
        const investorMarkets = marketsByInvestor.get(investor.id) || [];

        // Check for duplicate buy boxes
        const duplicateIssue = checkDuplicateBuyBoxes(investorBuyBoxes, investor.company_name);
        if (duplicateIssue) {
          issues.push(duplicateIssue);
        }

        // Check buy box completeness (use first buy box if multiple exist)
        const buyBoxIssues = validateBuyBox(
          investorBuyBoxes[0] || null,
          investor.company_name
        );
        issues.push(...buyBoxIssues);

        // Check markets
        const marketIssues = validateMarkets(
          investorMarkets,
          investor,
          investor.company_name
        );
        issues.push(...marketIssues);
      });

      // Calculate summary stats
      const stats = {
        totalActiveInvestors: investors?.length || 0,
        duplicateBuyBoxes: issues.filter((i) => i.issue_type === 'duplicate_buybox').length,
        incompleteBuyBoxes: issues.filter((i) => i.issue_type === 'incomplete_buybox' || i.issue_type === 'missing_buybox').length,
        noMarkets: issues.filter((i) => i.issue_type === 'no_markets').length,
        invalidCoverage: issues.filter((i) => i.issue_type === 'invalid_coverage').length,
        criticalIssues: issues.filter((i) => i.issue_severity === 'critical').length,
        warningIssues: issues.filter((i) => i.issue_severity === 'warning').length,
      };

      return {
        issues,
        stats,
      };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });
};
