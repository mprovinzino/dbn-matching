import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueueItem, useLeadAssignments, useAttachInvestor, useCompleteDeal } from '@/hooks/useMatchingQueue';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Home, DollarSign, Calendar, CheckCircle2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface InvestorMatch {
  id: string;
  company_name: string;
  tier: number;
  hubspot_company_id: string | null;
  calculatedScore: number;
  matchReasons: string[];
  locationSpecificity: string;
}

export default function DealMatchView() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [selectedScores, setSelectedScores] = useState<Record<string, number>>({});
  
  const { data: queueItem, isLoading: loadingQueue } = useQueueItem(dealId!);
  const { data: assignments, refetch: refetchAssignments } = useLeadAssignments(dealId!);
  const attachInvestor = useAttachInvestor();
  const completeDeal = useCompleteDeal();

  // Fetch all active investors and calculate matches
  const { data: investors, isLoading: loadingInvestors } = useQuery({
    queryKey: ['investors-for-matching', queueItem?.zip_code, queueItem?.state],
    queryFn: async () => {
      if (!queueItem) return [];

      const { data, error } = await supabase
        .from('investors')
        .select(`
          id,
          company_name,
          tier,
          hubspot_company_id,
          coverage_type,
          status,
          markets (
            market_type,
            zip_codes,
            states
          )
        `)
        .eq('status', 'active');

      if (error) throw error;

      // Calculate match scores for each investor
      const matches: InvestorMatch[] = [];
      
      for (const investor of data) {
        const matchResult = calculateMatchQualityScore(investor, queueItem);
        if (matchResult.score > 0) {
          matches.push({
            id: investor.id,
            company_name: investor.company_name,
            tier: investor.tier,
            hubspot_company_id: investor.hubspot_company_id,
            calculatedScore: matchResult.score,
            matchReasons: matchResult.reasons,
            locationSpecificity: matchResult.locationSpecificity,
          });
        }
      }

      // Sort by score (desc), then tier (asc)
      return matches.sort((a, b) => {
        if (b.calculatedScore !== a.calculatedScore) {
          return b.calculatedScore - a.calculatedScore;
        }
        return a.tier - b.tier;
      });
    },
    enabled: !!queueItem,
  });

  useEffect(() => {
    if (investors) {
      const scores: Record<string, number> = {};
      investors.forEach(inv => {
        scores[inv.id] = inv.calculatedScore;
      });
      setSelectedScores(scores);
    }
  }, [investors]);

  const calculateMatchQualityScore = (investor: any, leadData: any) => {
    let score = 0;
    const reasons: string[] = [];
    let locationSpecificity = 'none';

    const markets = investor.markets || [];
    
    // Check for ZIP match
    const hasZipMatch = markets.some((m: any) => 
      m.zip_codes?.includes(leadData.zip_code)
    );

    // Check for state match
    const hasStateMatch = markets.some((m: any) => 
      m.states?.includes(leadData.state) && m.market_type === 'full_coverage'
    );

    if (hasZipMatch) {
      score = 3;
      locationSpecificity = 'zip';
      reasons.push(`📍 Direct coverage in ${leadData.zip_code}`);
    } else if (hasStateMatch) {
      score = 2;
      locationSpecificity = 'state';
      reasons.push(`🏛️ Full ${leadData.state} coverage`);
    } else if (investor.coverage_type === 'national') {
      score = 1;
      locationSpecificity = 'national';
      reasons.push('🌎 National coverage');
    } else {
      reasons.push('❌ No coverage in this area');
    }

    return { score, reasons, locationSpecificity };
  };

  const handleAttachInvestor = async (investor: InvestorMatch) => {
    if (!investor.hubspot_company_id) {
      toast.error('Investor missing HubSpot Company ID');
      return;
    }

    await attachInvestor.mutateAsync({
      dealId: dealId!,
      investorId: investor.id,
      matchQualityScore: selectedScores[investor.id],
      calculatedScore: investor.calculatedScore,
      matchReasons: investor.matchReasons,
      locationSpecificity: investor.locationSpecificity,
    });

    refetchAssignments();
  };

  const handleCompleteDeal = async () => {
    const attachedCount = assignments?.length || 0;
    const requested = queueItem?.investors_requested || 3;
    
    const partialReason = attachedCount < requested 
      ? `Only ${attachedCount} of ${requested} investors available`
      : undefined;

    await completeDeal.mutateAsync({
      dealId: dealId!,
      investorsAttached: attachedCount,
      partialMatchReason: partialReason,
    });

    navigate('/matching-dashboard');
  };

  if (loadingQueue || loadingInvestors) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!queueItem) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Deal not found</p>
      </div>
    );
  }

  const attachedInvestorIds = new Set(assignments?.map(a => a.investor_id) || []);
  const availableInvestors = investors?.filter(inv => !attachedInvestorIds.has(inv.id)) || [];
  const attachedCount = assignments?.length || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/matching-dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Queue
        </Button>

        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{queueItem.deal_name}</h1>
              <p className="text-muted-foreground mt-1">Match investors to this deal</p>
            </div>
            <Badge variant={attachedCount > 0 ? 'default' : 'secondary'}>
              {attachedCount} / {queueItem.investors_requested} Attached
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{queueItem.city}, {queueItem.state}</p>
                <p className="text-sm text-muted-foreground">{queueItem.zip_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Property Type</p>
                <p className="font-medium">{queueItem.property_type || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Ask Price</p>
                <p className="font-medium">
                  {queueItem.ask_price ? `$${queueItem.ask_price.toLocaleString()}` : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Year Built</p>
                <p className="font-medium">{queueItem.year_built || 'N/A'}</p>
              </div>
            </div>
          </div>
        </Card>

        {attachedCount > 0 && (
          <Card className="p-6 border-primary">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Attached Investors
            </h3>
            <div className="space-y-3">
              {assignments?.map(assignment => {
                const investor = investors?.find(inv => inv.id === assignment.investor_id);
                return (
                  <div key={assignment.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{investor?.company_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        Match Quality: {assignment.match_quality_score}/3
                      </p>
                    </div>
                    <Badge>Attached</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Available Investors</h3>
          {availableInvestors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="rounded-full bg-muted p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">No matching investors available</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  All matching investors have been attached to this deal, or there are no active investors that match the deal criteria.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {availableInvestors.map(investor => (
                <Card key={investor.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{investor.company_name}</h4>
                        <Badge variant="outline">Tier {investor.tier}</Badge>
                        <Badge>Score: {investor.calculatedScore}/3</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {investor.matchReasons.map((reason, idx) => (
                          <p key={idx}>{reason}</p>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-6">
                      <Select
                        value={selectedScores[investor.id]?.toString()}
                        onValueChange={(value) => setSelectedScores(prev => ({
                          ...prev,
                          [investor.id]: parseInt(value)
                        }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - None</SelectItem>
                          <SelectItem value="1">1 - Secondary</SelectItem>
                          <SelectItem value="2">2 - Primary</SelectItem>
                          <SelectItem value="3">3 - Preferred</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => handleAttachInvestor(investor)}
                        disabled={attachInvestor.isPending || !investor.hubspot_company_id}
                      >
                        {attachInvestor.isPending ? 'Attaching...' : 'Attach'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

        {attachedCount > 0 && (
          <Card className="p-6 bg-primary/5 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ready to Complete?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {attachedCount} investor{attachedCount !== 1 ? 's' : ''} attached. 
                  {attachedCount < queueItem.investors_requested && 
                    ` (${queueItem.investors_requested - attachedCount} requested but unavailable)`
                  }
                </p>
              </div>
              <Button 
                size="lg"
                onClick={handleCompleteDeal}
                disabled={completeDeal.isPending}
              >
                {completeDeal.isPending ? 'Completing...' : 'Complete Matching'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
