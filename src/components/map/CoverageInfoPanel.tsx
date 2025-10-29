import { X, Building2, MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

  // Calculate overview from the passed state data (same data the map uses)
  const overview = {
    total: stateData.investorIds.length,
    national: stateData.stateLevelData.filter(s => s.market_type === 'full_coverage').length,
    stateLevel: stateData.investorIds.length - stateData.stateLevelData.filter(s => s.market_type === 'full_coverage').length,
  };

  console.log(`📊 Side Panel ${stateCode} (using map data):`, {
    total: overview.total,
    national: overview.national,
    stateLevel: overview.stateLevel,
    uniqueIds: stateData.investorIds,
  });

  // Fetch DMAs in this state
  const { data: dmaData, isLoading: isLoadingDmas } = useQuery({
    queryKey: ['state-dmas', stateCode],
    queryFn: async () => {
      // Get all DMAs in this state from zip_code_reference
      const { data: zipData, error } = await supabase
        .from('zip_code_reference')
        .select('dma, zip_code')
        .eq('state', stateCode)
        .not('dma', 'is', null);

      if (error) throw error;
      
      // Group by DMA and count zip codes
      const dmaGroups = zipData?.reduce((acc, row) => {
        if (!acc[row.dma]) {
          acc[row.dma] = { dma: row.dma, zip_count: 0 };
        }
        acc[row.dma].zip_count++;
        return acc;
      }, {} as Record<string, { dma: string; zip_count: number }>);

      return Object.values(dmaGroups || {});
    },
  });

  // Fetch detailed investor info for each DMA
  const { data: dmaInvestors, isLoading: isLoadingInvestors } = useQuery({
    queryKey: ['dma-investors-detail', stateCode, dmaData, stateData.investorIds],
    enabled: !!dmaData && dmaData.length > 0,
    queryFn: async () => {
      if (!dmaData) return {};

      const dmaNames = dmaData.map((d: any) => d.dma);
      
      // Only fetch the investors that are in this state (from map data)
      const { data: investors, error } = await supabase
        .from('investors')
        .select(`
          id,
          company_name,
          main_poc,
          tier,
          status,
          coverage_type,
          markets!inner(
            market_type,
            zip_codes
          )
        `)
        .eq('status', 'active')
        .in('id', stateData.investorIds);

      if (error) throw error;

      // Get zip codes for each DMA
      const { data: zipData } = await supabase
        .from('zip_code_reference')
        .select('zip_code, dma')
        .in('dma', dmaNames);

      const dmaZipMap: Record<string, string[]> = {};
      zipData?.forEach((z: any) => {
        if (!dmaZipMap[z.dma]) dmaZipMap[z.dma] = [];
        dmaZipMap[z.dma].push(z.zip_code);
      });

      // Group investors by DMA
      const grouped: Record<string, any[]> = {};
      
      investors?.forEach((investor: any) => {
        const investorZips = investor.markets.flatMap((m: any) => m.zip_codes || []);
        const marketType = investor.markets[0]?.market_type;
        
        dmaNames.forEach((dma: string) => {
          const dmaZips = dmaZipMap[dma] || [];
          const matchingZips = investorZips.filter((z: string) => dmaZips.includes(z));
          
          if (matchingZips.length > 0) {
            if (!grouped[dma]) grouped[dma] = [];
            
            // Check if already added to this DMA
            if (!grouped[dma].find(i => i.id === investor.id)) {
              grouped[dma].push({
                ...investor,
                zip_count: matchingZips.length,
                market_type: marketType || 'dma_level',
              });
            }
          }
        });
      });

      return grouped;
    },
  });

  const isLoading = isLoadingDmas || isLoadingInvestors;

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
          ) : dmaData && dmaData.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {dmaData.map((dma: any) => {
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
