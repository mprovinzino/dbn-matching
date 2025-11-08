import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useInvestorWithRelations = (investorId: string | null) => {
  return useQuery({
    queryKey: ["investor-relations", investorId],
    queryFn: async () => {
      if (!investorId) return null;

      const [investorRes, buyBoxRes, marketsRes] = await Promise.all([
        supabase.from("investors").select("*").eq("id", investorId).single(),
        supabase.from("buy_box").select("*").eq("investor_id", investorId).single(),
        supabase.from("markets").select("*").eq("investor_id", investorId),
      ]);

      if (investorRes.error && investorRes.error.code !== "PGRST116") {
        throw investorRes.error;
      }
      if (marketsRes.error) throw marketsRes.error;

      return {
        investor: investorRes.data,
        buyBox: buyBoxRes.data || null,
        markets: marketsRes.data || [],
      };
    },
    enabled: !!investorId,
  });
};

export const useAllInvestors = () => {
  return useQuery({
    queryKey: ["all-investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("id, company_name, tier, status, coverage_type, main_poc")
        .order("company_name");

      if (error) throw error;
      return data;
    },
  });
};
