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
