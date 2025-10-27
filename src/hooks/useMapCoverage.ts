import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DmaCoverageData {
  dma: string;
  state: string;
  investor_count: number;
  primary_count: number;
  secondary_count: number;
  direct_count: number;
  full_coverage_count: number;
  total_zip_codes: number;
  investor_ids: string[];
}

export interface MapFilters {
  marketType: string;
  minInvestors: number;
  searchQuery: string;
}

export function useMapCoverage(filters: MapFilters) {
  return useQuery({
    queryKey: ['map-coverage', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dma_coverage_density');
      
      if (error) throw error;
      
      let filtered = data as DmaCoverageData[];
      
      // Apply market type filter
      if (filters.marketType !== 'all') {
        filtered = filtered.filter(dma => {
          if (filters.marketType === 'primary') return dma.primary_count > 0;
          if (filters.marketType === 'secondary') return dma.secondary_count > 0;
          if (filters.marketType === 'direct_purchase') return dma.direct_count > 0;
          if (filters.marketType === 'full_coverage') return dma.full_coverage_count > 0;
          return true;
        });
      }
      
      // Apply minimum investor filter
      filtered = filtered.filter(dma => dma.investor_count >= filters.minInvestors);
      
      return filtered;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDmaInvestors(dmaName: string | null) {
  return useQuery({
    queryKey: ['dma-investors', dmaName],
    queryFn: async () => {
      if (!dmaName) return [];
      
      const { data, error } = await supabase.rpc('get_investors_by_dma', {
        dma_name: dmaName
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!dmaName,
  });
}

export interface InvestorDetail {
  id: string;
  company_name: string;
  market_type: string;
  coverage_type: string;
  tier: number;
}

export function useInvestorsByState(state: string | null) {
  return useQuery({
    queryKey: ['investors-by-state', state],
    queryFn: async () => {
      if (!state) return { national: [], dmaSpecific: [] };
      
      // Get national (full coverage) investors
      const { data: marketIds, error: marketError } = await supabase
        .from('markets')
        .select('investor_id')
        .eq('market_type', 'full_coverage');
      
      if (marketError) throw marketError;
      
      const nationalInvestorIds = marketIds?.map(m => m.investor_id) || [];
      
      const { data: nationalData, error: nationalError } = await supabase
        .from('investors')
        .select('id, company_name, coverage_type, tier')
        .eq('status', 'active')
        .in('id', nationalInvestorIds);
      
      if (nationalError) throw nationalError;
      
      // Get DMA-specific investors for this state
      const { data: stateData, error: stateError } = await supabase
        .from('investors')
        .select(`
          id,
          company_name,
          coverage_type,
          tier,
          markets!inner(market_type, zip_codes)
        `)
        .eq('status', 'active')
        .neq('markets.market_type', 'full_coverage');
      
      if (stateError) throw stateError;
      
      // Filter state-specific investors by checking if their zip codes are in this state
      const { data: stateZips, error: zipError } = await supabase
        .from('zip_code_reference')
        .select('zip_code')
        .eq('state', state);
      
      if (zipError) throw zipError;
      
      const stateZipSet = new Set(stateZips?.map(z => z.zip_code) || []);
      
      const dmaSpecificInvestors = stateData
        ?.filter((investor: any) => {
          return investor.markets?.some((market: any) => 
            market.zip_codes?.some((zip: string) => stateZipSet.has(zip))
          );
        })
        .map((investor: any) => ({
          id: investor.id,
          company_name: investor.company_name,
          market_type: investor.markets?.[0]?.market_type || 'primary',
          coverage_type: investor.coverage_type,
          tier: investor.tier
        })) || [];
      
      return {
        national: nationalData?.map(inv => ({
          id: inv.id,
          company_name: inv.company_name,
          market_type: 'full_coverage',
          coverage_type: inv.coverage_type,
          tier: inv.tier
        })) || [],
        dmaSpecific: dmaSpecificInvestors
      };
    },
    enabled: !!state,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useNationalCoverageCount() {
  return useQuery({
    queryKey: ['national-coverage-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('investors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('coverage_type', 'national');
      
      if (error) throw error;
      return { count: count || 0 };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
