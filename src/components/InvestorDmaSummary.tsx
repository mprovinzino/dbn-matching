import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface InvestorDmaSummaryProps {
  investorId: string;
  coverageType: string;
  marketData?: {
    market_type: string;
    zip_codes?: string[];
    states?: string[];
  }[];
  compact?: boolean;
}

export function InvestorDmaSummary({ 
  investorId, 
  coverageType, 
  marketData,
  compact = false 
}: InvestorDmaSummaryProps) {
  const [summary, setSummary] = useState<{ dmaCount: number; stateCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateSummary = async () => {
      if (coverageType === 'full_coverage') {
        setSummary({ dmaCount: 0, stateCount: 50 });
        setLoading(false);
        return;
      }

      try {
        let markets = marketData;
        
        // Fetch markets if not provided
        if (!markets) {
          const { data } = await supabase
            .from('markets')
            .select('market_type, zip_codes, states')
            .eq('investor_id', investorId);
          markets = data || [];
        }

        // Collect all zip codes and states
        const allZipCodes: string[] = [];
        const allStates = new Set<string>();

        markets?.forEach(market => {
          if (market.zip_codes) {
            allZipCodes.push(...market.zip_codes);
          }
          if (market.states) {
            market.states.forEach(state => allStates.add(state));
          }
        });

        // If we have zip codes, calculate DMAs
        if (allZipCodes.length > 0) {
          const { data: dmaData } = await supabase
            .rpc('get_dma_coverage', { market_zip_codes: allZipCodes });
          
          const dmaCount = dmaData?.length || 0;
          setSummary({ dmaCount, stateCount: allStates.size });
        } else if (allStates.size > 0) {
          setSummary({ dmaCount: 0, stateCount: allStates.size });
        } else {
          setSummary({ dmaCount: 0, stateCount: 0 });
        }
      } catch (error) {
        console.error('Error calculating DMA summary:', error);
        setSummary({ dmaCount: 0, stateCount: 0 });
      } finally {
        setLoading(false);
      }
    };

    calculateSummary();
  }, [investorId, coverageType, marketData]);

  if (loading) {
    return (
      <span className="text-xs text-muted-foreground">
        {compact ? '...' : 'Calculating coverage...'}
      </span>
    );
  }

  if (!summary) return null;

  // Full coverage display
  if (coverageType === 'full_coverage') {
    return (
      <Badge variant="secondary" className="text-xs">
        National Coverage
      </Badge>
    );
  }

  // DMA/State summary
  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        {summary.dmaCount > 0 && `${summary.dmaCount} DMAs`}
        {summary.dmaCount > 0 && summary.stateCount > 0 && ', '}
        {summary.stateCount > 0 && `${summary.stateCount} States`}
      </span>
    );
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {summary.dmaCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {summary.dmaCount} DMAs
        </Badge>
      )}
      {summary.stateCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {summary.stateCount} States
        </Badge>
      )}
      {summary.dmaCount === 0 && summary.stateCount === 0 && (
        <span className="text-xs text-muted-foreground">No coverage data</span>
      )}
    </div>
  );
}
