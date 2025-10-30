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

  const overview = {
    total: unionIds.size,
    national: nationalIds.size,
    stateLevel: unionIds.size - nationalIds.size,
  };

  console.log(`📊 Side Panel ${stateCode} counts:`, {
    total: overview.total,
    national: overview.national,
    stateLevel: overview.stateLevel,
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

// For per-DMA lists, exclude national (full_coverage) investors
const nationalIdsSet = nationalIds;

const dmaToInvestorIds: Record<string, string[]> = useMemo(() => {
  const map: Record<string, Set<string>> = {};
  dmas.forEach((d) => {
    const ids = (d.investor_ids || []).filter((id: string) => !nationalIdsSet.has(id));
    if (!map[d.dma]) map[d.dma] = new Set<string>();
    ids.forEach((id: string) => map[d.dma].add(id));
  });
  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [k, Array.from(v)])
  );
}, [dmas, nationalIdsSet]);

const allInvestorIds = useMemo(() => {
  const s = new Set<string>();
  Object.values(dmaToInvestorIds).forEach((arr) => arr.forEach((id) => s.add(id)));
  return Array.from(s);
}, [dmaToInvestorIds]);

// Fetch details for needed investors in one query
const { data: investorDetails, isLoading: isLoadingInvestors } = useQuery({
  queryKey: ['investors-detail-by-state-dmas', stateCode, allInvestorIds],
  enabled: allInvestorIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase
      .from('investors')
      .select(`
        id,
        company_name,
        main_poc,
        tier,
        status,
        coverage_type,
        markets!inner(
          market_type
        )
      `)
      .eq('status', 'active')
      .in('id', allInvestorIds)
      .neq('markets.market_type', 'full_coverage');

    if (error) throw error;

    return (
      data?.map((inv: any) => ({
        id: inv.id,
        company_name: inv.company_name,
        main_poc: inv.main_poc,
        tier: inv.tier,
        status: inv.status,
        coverage_type: inv.coverage_type,
        market_type: inv.markets?.[0]?.market_type || 'dma_level',
      })) || []
    );
  },
});

// Build DMA -> investor objects map
const dmaInvestors: Record<string, any[]> = useMemo(() => {
  const map: Record<string, any[]> = {};
  const byId = new Map((investorDetails || []).map((i: any) => [i.id, i]));
  Object.entries(dmaToInvestorIds).forEach(([dma, ids]) => {
    map[dma] = ids.map((id) => byId.get(id)).filter(Boolean) as any[];
  });
  return map;
}, [investorDetails, dmaToInvestorIds]);

const isLoading = isLoadingInvestors;

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
                const investors = dmaInvestors?.[dma.dma] || [];
                
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
              <CardContent className="p-8 text-center">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No DMAs found in this state
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
