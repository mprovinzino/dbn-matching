import { X, Building2, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

interface CoverageInfoPanelProps {
  stateCode: string;
  stateData: {
    investorIds: string[];
    coverage: any[];
    stateLevelData: any[];
  };
  onClose: () => void;
}

export function CoverageInfoPanel({ stateCode, stateData, onClose }: CoverageInfoPanelProps) {
  const navigate = useNavigate();

  // Calculate overview from the passed state data (unified union of DMA + state-level)
  const dmaIds = new Set(stateData.investorIds);
  const stateLevelIds = new Set(stateData.stateLevelData.map(s => s.investor_id));
  const unionIds = new Set([...dmaIds, ...stateLevelIds]);

  const nationalIds = new Set(
      stateData.stateLevelData
        .filter(s => s.market_type === 'full_coverage')
        .map(s => s.investor_id)
    );

    // Base overview before fetching per-DMA lists; will be refined after data load
    const baseOverview = {
      total: unionIds.size,
      national: nationalIds.size,
      stateLevel: unionIds.size - nationalIds.size,
    };

    console.log(`📊 Side Panel ${stateCode} base counts:`, {
      total: baseOverview.total,
      national: baseOverview.national,
      stateLevel: baseOverview.stateLevel,
      dmaIds: Array.from(dmaIds),
      stateLevelIds: Array.from(stateLevelIds),
      unionIds: Array.from(unionIds),
    });

// Build DMA list from coverage passed in from the map (no extra queries)
const dmas = useMemo(() => {
  const list = (stateData.coverage || []).map((d: any) => ({
    dma: d.dma,
    investor_ids: Array.from(new Set(d.investor_ids || [])),
  }));
  // Ensure unique by DMA name
  const seen = new Set<string>();
  return list.filter((d) => {
    if (seen.has(d.dma)) return false;
    seen.add(d.dma);
    return true;
  });
}, [stateData.coverage]);

// For per-DMA investor lists, fetch via RPC to bypass RLS
const { data: dmaInvestorsMap, isLoading: isLoadingDmaInvestors } = useQuery({
  queryKey: ['state-dma-investors', stateCode, dmas.map(d => d.dma), stateData.stateLevelData],
  enabled: dmas.length > 0,
  queryFn: async () => {
    console.log('🧭 State', stateCode, 'DMAs:', dmas.map(d => d.dma));
    
    // Fetch zip-code-based investors per DMA via RPC
    const dmaSpecificEntries = await Promise.all(
      dmas.map(async (d) => {
        const { data, error } = await supabase.rpc('get_investors_by_dma', { dma_name: d.dma });
        if (error) throw error;
        const rows = (data || []).map((row: any) => ({
            id: row.investor_id,
            company_name: row.company_name,
            main_poc: row.main_poc,
            market_type: row.market_type,
            tier: row.tier,
            coverage_type: row.coverage_type,
            zip_count: row.zip_count,
            status: row.status,
          }));
        return [d.dma, rows] as const;
      })
    );
    
    const dmaSpecificMap: Record<string, any[]> = Object.fromEntries(dmaSpecificEntries);
    
    // Add state-level investors to EVERY DMA in this state
    // (They cover the entire state, so they apply to all DMAs)
    const stateLevelInvestors = stateData.stateLevelData
      .filter((s: any) => s.market_type !== 'full_coverage') // Exclude national from DMA lists
      .map((s: any) => ({
        id: s.investor_id,
        company_name: s.investor_name,
        main_poc: '', // Not available in state-level data
        market_type: s.market_type,
        tier: s.tier,
        coverage_type: 'state_level',
        zip_count: 0,
        status: 'active',
      }));

    // Also include national (full_coverage) investors so DMA counts are never zero
    const nationalInvestors = stateData.stateLevelData
      .filter((s: any) => s.market_type === 'full_coverage')
      .map((s: any) => ({
        id: s.investor_id,
        company_name: s.investor_name,
        main_poc: '',
        market_type: s.market_type,
        tier: s.tier,
        coverage_type: 'national',
        zip_count: 0,
        status: 'active',
      }));

    // Merge: For each DMA, combine zip-code-based + state-level + national investors
    const finalMap: Record<string, any[]> = {};
    dmas.forEach((d) => {
      const zipCodeInvestors = dmaSpecificMap[d.dma] || [];
      const investorMap = new Map();
      zipCodeInvestors.forEach(inv => investorMap.set(inv.id, inv));
      stateLevelInvestors.forEach(inv => {
        if (!investorMap.has(inv.id)) investorMap.set(inv.id, inv);
      });
      nationalInvestors.forEach(inv => {
        if (!investorMap.has(inv.id)) investorMap.set(inv.id, inv);
      });
      finalMap[d.dma] = Array.from(investorMap.values());
    });

    console.log('🧾 Per-DMA counts (with state + national):',
      Object.fromEntries(Object.entries(finalMap).map(([k, v]) => [k, v.length]))
    );
    console.log('🧩 Merge sources:', {
      state: stateCode,
      stateLevel: stateLevelInvestors.length,
      national: nationalInvestors.length,
      dmas: dmas.length,
    });

    return finalMap;
  },
  staleTime: 30_000,
});

// Report loading state
const isLoading = isLoadingDmaInvestors;

// Compute final overview from what the user will actually see (deduped across DMA lists)
const overview = useMemo(() => {
  if (dmaInvestorsMap) {
    const allInvestors = Object.values(dmaInvestorsMap).flat();
    const byId = new Map<string, any>();
    allInvestors.forEach((inv: any) => byId.set(inv.id, inv));
    const unique = Array.from(byId.values());
    const nationalCount = unique.filter((inv: any) => inv.market_type === 'full_coverage' || inv.coverage_type === 'national').length;
    return { total: unique.length, national: nationalCount, stateLevel: unique.length - nationalCount };
  }
  return baseOverview;
}, [dmaInvestorsMap]);

console.log(`📊 Side Panel ${stateCode} final counts (from UI data):`, overview);

  const getTierColor = (tier: number) => {
    if (tier === 1) return "bg-amber-500";
    if (tier === 2) return "bg-blue-500";
    return "bg-gray-500";
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'test') return 'bg-blue-500';
    if (status === 'paused') return 'bg-amber-500';
    return 'bg-gray-500';
  };

  return (
    <div className="w-96 border-l bg-sidebar-background overflow-y-auto">
      <div className="sticky top-0 bg-sidebar-background border-b p-4 flex items-center justify-between z-10">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {stateCode}
          </h3>
          <p className="text-sm text-muted-foreground">
            {overview.total} investor{overview.total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* State Overview */}
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
                <div className="text-2xl font-bold">{overview.total}</div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">National Coverage</CardTitle>
                <div className="text-2xl font-bold">{overview.national}</div>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-medium">State-Level</CardTitle>
                <div className="text-2xl font-bold">{overview.stateLevel}</div>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* DMA Breakdown */}
        <div>
          <h4 className="text-sm font-semibold mb-2">DMAs in {stateCode}</h4>
          
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full mb-2" />
              <Skeleton className="h-16 w-full mb-2" />
            </>
          ) : dmas && dmas.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {dmas.map((dma: any) => {
                const investors = dmaInvestorsMap?.[dma.dma] || [];
                
                return (
                  <AccordionItem key={dma.dma} value={dma.dma} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-sm font-medium">{dma.dma}</span>
                        <Badge variant="secondary" className="ml-2">
                          {investors.length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {investors.length > 0 ? (
                        <div className="space-y-2">
                          {investors.map((investor: any) => (
                            <Card 
                              key={investor.id}
                              className="cursor-pointer hover:shadow-md transition-all"
                              onClick={() => navigate(`/?investor=${investor.id}`)}
                            >
                              <CardHeader className="p-3 pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <CardTitle className="text-xs truncate">
                                      {investor.company_name}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {investor.main_poc}
                                    </p>
                                  </div>
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getTierColor(investor.tier)}`} />
                                </div>
                              </CardHeader>
                              <CardContent className="p-3 pt-0 space-y-1">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Tier {investor.tier}
                                  </Badge>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getStatusColor(investor.status)} text-white border-0`}
                                  >
                                    {investor.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {investor.market_type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>{investor.zip_count} zip codes</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No investors in this DMA</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <h5 className="text-sm font-medium">Statewide Coverage</h5>
                </div>
                {stateData.stateLevelData && stateData.stateLevelData.length > 0 ? (
                  <div className="space-y-2">
                    {stateData.stateLevelData
                      .filter((s: any) => s.market_type === 'full_coverage')
                      .map((investor: any) => (
                        <Card 
                          key={investor.investor_id}
                          className="cursor-pointer hover:shadow-md transition-all"
                          onClick={() => navigate(`/?investor=${investor.investor_id}`)}
                        >
                          <CardHeader className="p-3 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-xs truncate">
                                  {investor.investor_name}
                                </CardTitle>
                              </div>
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getTierColor(investor.tier)}`} />
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 pt-0 space-y-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                Tier {investor.tier}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                National Coverage
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No coverage data available for this state
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
