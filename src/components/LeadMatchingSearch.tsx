import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ExternalLink, TrendingUp, MapPin, LayoutGrid, List, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvestorDetailModal } from "@/components/InvestorDetailModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeadData {
  state: string;
  zipCode: string;
  city?: string;
  askPrice?: number;
  propertyType?: string;
  condition?: string;
  yearBuilt?: number;
}

interface MatchedInvestor {
  id: string;
  company_name: string;
  hubspot_url: string | null;
  coverage_type: string;
  tags: string[];
  tier: number;
  status: string;
  weekly_cap: number;
  main_poc: string;
  matchScore: number;
  locationScore: number;
  buyBoxScore: number;
  qualityScore: number;
  capacityScore: number;
  matchReasons: string[];
  isPrimaryMarket: boolean;
  isFullCoverage: boolean;
  isDirectPurchase: boolean;
  locationSpecificity: string;
}

export function LeadMatchingSearch() {
  const [leadData, setLeadData] = useState<LeadData>({
    state: "",
    zipCode: "",
  });
  const [searching, setSearching] = useState(false);
  const [matchedInvestors, setMatchedInvestors] = useState<MatchedInvestor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [viewMode, setViewMode] = useState<"tiles" | "list">("tiles");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvestorFullData, setSelectedInvestorFullData] = useState<any>(null);
  const [selectedInvestors, setSelectedInvestors] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!leadData.state || !leadData.zipCode) {
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      // Get all active investors with their buy_box and markets data
      const { data: investors, error } = await supabase
        .from('investors')
        .select(`
          *,
          buy_box (*),
          markets (*)
        `)
        .in('status', ['active', 'test']);

      if (error) throw error;

      const matches: MatchedInvestor[] = [];

      investors?.forEach((investor) => {
        const matchReasons: string[] = [];
        
        let isFullCoverage = false;
        let isDirectPurchase = false;
        let isPrimaryMarket = false;
        
        // LOCATION FIT SCORE (0-35 points)
        let locationScore = 0;
        let locationSpecificity = 'none';
        const hasNationalCoverage = investor.coverage_type === 'national';
        
        const markets = investor.markets || [];
        
        // Check all markets to find the BEST match type
        markets.forEach((market: any) => {
          const stateMatch = market.states?.some((s: string) => 
            s === leadData.state || s.includes(leadData.state)
          );
          const zipMatch = market.zip_codes?.some((z: string) => 
            z === leadData.zipCode || z.includes(leadData.zipCode)
          );

          // Primary zip = highest priority
          if (market.market_type === 'primary' && zipMatch) {
            if (locationScore < 35) {
              locationScore = 35;
              locationSpecificity = 'primary_zip';
              isPrimaryMarket = true;
              matchReasons.push("🎯 Primary market exact zip match");
            }
          }
          
          // Direct purchase zip = very high priority
          else if (market.market_type === 'direct_purchase' && zipMatch) {
            if (locationScore < 30) {
              locationScore = 30;
              locationSpecificity = 'direct_zip';
              isDirectPurchase = true;
              matchReasons.push("💵 Direct purchase zip match");
            }
          }
          
          // Full coverage state = medium priority
          else if (market.market_type === 'full_coverage' && stateMatch) {
            if (locationScore < 22) {
              locationScore = 22;
              locationSpecificity = 'state_coverage';
              isFullCoverage = true;
              matchReasons.push("🗺️ Full state coverage");
            }
          }
          
          // Direct purchase state (no zip match)
          else if (market.market_type === 'direct_purchase' && stateMatch && !zipMatch) {
            if (locationScore < 20) {
              locationScore = 20;
              locationSpecificity = 'direct_state';
              isDirectPurchase = true;
              matchReasons.push("💵 Direct purchase state coverage");
            }
          }
        });

        // National coverage = lowest priority (check after zip/state checks)
        if (hasNationalCoverage && locationScore < 18) {
          // Check if they also have state-level awareness
          const hasStateInNational = markets.some((m: any) => 
            m.states?.some((s: string) => s === leadData.state || s.includes(leadData.state))
          );
          
          if (hasStateInNational) {
            locationScore = 18;
            locationSpecificity = 'national_state';
            matchReasons.push("🌎 National coverage (state aware)");
          } else {
            locationScore = 15;
            locationSpecificity = 'national_only';
            matchReasons.push("🌎 National coverage");
          }
        }

        // Skip if no market match at all
        if (locationScore === 0) {
          return;
        }

        // BUY BOX SCORE (0-30 points)
        let buyBoxScore = 0;
        let criteriaSet = 0;
        
        const buyBox = investor.buy_box?.[0];
        if (buyBox) {
          // Count how many criteria the investor has set
          if (buyBox.price_min && buyBox.price_max) criteriaSet++;
          if (buyBox.property_types?.length > 0) criteriaSet++;
          if (buyBox.condition_types?.length > 0) criteriaSet++;
          if (buyBox.year_built_min || buyBox.year_built_max) criteriaSet++;

          // Calculate matches
          if (leadData.askPrice && buyBox.price_min && buyBox.price_max) {
            const buyBoxPriceMin = Number(buyBox.price_min);
            const buyBoxPriceMax = Number(buyBox.price_max);
            
            if (leadData.askPrice >= buyBoxPriceMin && leadData.askPrice <= buyBoxPriceMax) {
              buyBoxScore += 8;
              matchReasons.push("💰 Price in range");
            }
          }

          if (leadData.propertyType && buyBox.property_types?.includes(leadData.propertyType)) {
            buyBoxScore += 8;
            matchReasons.push("🏠 Property type match");
          }

          if (leadData.condition && buyBox.condition_types?.includes(leadData.condition)) {
            buyBoxScore += 8;
            matchReasons.push("🔧 Condition match");
          }

          if (leadData.yearBuilt && (buyBox.year_built_min || buyBox.year_built_max)) {
            const yearMin = buyBox.year_built_min || 0;
            const yearMax = buyBox.year_built_max || 9999;
            if (leadData.yearBuilt >= yearMin && leadData.yearBuilt <= yearMax) {
              buyBoxScore += 6;
              matchReasons.push("📅 Year built match");
            }
          }

          // Apply completeness multiplier
          if (criteriaSet <= 1) {
            buyBoxScore *= 0.5;
          } else if (criteriaSet <= 3) {
            buyBoxScore *= 0.8;
          }
        }

        // QUALITY SCORE (0-25 points)
        const tierScore = Math.max(0, 20 - (investor.tier - 1) * 2); // Tier 1 = 20pts, Tier 10 = 2pts
        const statusScore = investor.status === 'active' ? 5 : investor.status === 'test' ? 2 : 0;
        const qualityScore = tierScore + statusScore;

        // CAPACITY SCORE (0-10 points)
        let capacityScore = 0;
        if (investor.weekly_cap <= 25) capacityScore = 3;
        else if (investor.weekly_cap <= 50) capacityScore = 5;
        else if (investor.weekly_cap <= 100) capacityScore = 8;
        else capacityScore = 10;

        // COMPOSITE SCORE (0-100)
        const matchScore = Math.round(locationScore + buyBoxScore + qualityScore + capacityScore);

        matches.push({
          id: investor.id,
          company_name: investor.company_name,
          hubspot_url: investor.hubspot_url,
          coverage_type: investor.coverage_type,
          tags: investor.tags || [],
          tier: investor.tier,
          status: investor.status,
          weekly_cap: investor.weekly_cap,
          main_poc: investor.main_poc,
          matchScore,
          locationScore,
          buyBoxScore,
          qualityScore,
          capacityScore,
          matchReasons,
          isPrimaryMarket,
          isFullCoverage,
          isDirectPurchase,
          locationSpecificity,
        });
      });

      // Sort by composite score, then by tier (for ties)
      matches.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        return a.tier - b.tier; // Lower tier is better
      });
      setMatchedInvestors(matches);
    } catch (error) {
      console.error('Error searching for matches:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setLeadData({ state: "", zipCode: "" });
    setMatchedInvestors([]);
    setHasSearched(false);
  };

  const handleInvestorClick = async (investorId: string) => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select(`
          *,
          buy_box (*),
          markets (*)
        `)
        .eq('id', investorId)
        .single();

      if (error) throw error;
      
      setSelectedInvestorFullData(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching investor details:', error);
    }
  };

  const handleToggleExpand = (investorId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(investorId)) {
        next.delete(investorId);
      } else {
        next.add(investorId);
      }
      return next;
    });
  };

  const handleSelectInvestor = (investorId: string) => {
    if (selectedInvestors.length >= 3) {
      return;
    }
    setSelectedInvestors(prev => [...prev, investorId]);
  };

  const handleDeselectInvestor = (investorId: string) => {
    setSelectedInvestors(prev => prev.filter(id => id !== investorId));
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-yellow-500';
      case 2: return 'bg-gray-400';
      case 3: return 'bg-amber-700';
      default: return 'bg-gray-500';
    }
  };

  

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Lead Matching Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="e.g., TX"
                value={leadData.state}
                onChange={(e) => setLeadData({ ...leadData, state: e.target.value.toUpperCase() })}
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code *</Label>
              <Input
                id="zipCode"
                placeholder="e.g., 75001"
                value={leadData.zipCode}
                onChange={(e) => setLeadData({ ...leadData, zipCode: e.target.value })}
                maxLength={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="askPrice">Sellers Ask Price</Label>
              <Input
                id="askPrice"
                type="number"
                placeholder="125000"
                value={leadData.askPrice || ""}
                onChange={(e) => setLeadData({ ...leadData, askPrice: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                placeholder="1995"
                min="1800"
                max="2025"
                value={leadData.yearBuilt || ""}
                onChange={(e) => setLeadData({ ...leadData, yearBuilt: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={leadData.propertyType}
                onValueChange={(value) => setLeadData({ ...leadData, propertyType: value })}
              >
                <SelectTrigger id="propertyType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single Family">Single Family</SelectItem>
                  <SelectItem value="Multi Family">Multi Family</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={leadData.condition}
                onValueChange={(value) => setLeadData({ ...leadData, condition: value })}
              >
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Move in Ready with Modern Finishes">Move in Ready with Modern Finishes</SelectItem>
                  <SelectItem value="Move in Ready with Older Finishes">Move in Ready with Older Finishes</SelectItem>
                  <SelectItem value="Needs Few Repairs">Needs Few Repairs</SelectItem>
                  <SelectItem value="Needs Major Repairs">Needs Major Repairs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSearch} 
              disabled={!leadData.state || !leadData.zipCode || searching}
            >
              <Search className="h-4 w-4 mr-2" />
              {searching ? "Searching..." : "Search Matches"}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <>
          {/* Selected Investors Section */}
          {selectedInvestors.length > 0 && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Selected Investors for this Lead
                  </span>
                  <Badge variant="secondary">{selectedInvestors.length}/3</Badge>
                </CardTitle>
                {selectedInvestors.length >= 3 && (
                  <Alert>
                    <AlertDescription>
                      Maximum of 3 investors reached. Deselect an investor to select another.
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {selectedInvestors.map((investorId) => {
                    const investor = matchedInvestors.find(inv => inv.id === investorId);
                    if (!investor) return null;
                    return (
                      <Card key={investorId} className="flex-1 min-w-[200px]">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{investor.company_name}</p>
                              <p className="text-xs text-muted-foreground">{investor.main_poc}</p>
                              <Badge className="mt-1" variant="secondary">
                                {investor.matchScore}% Match
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeselectInvestor(investorId)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Search Results ({matchedInvestors.length} investors found)
            </h3>
            <div className="flex gap-2">
              <Button
                variant={viewMode === "tiles" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("tiles")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Tiles
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>

          {viewMode === "tiles" ? (
            <div className="space-y-4">
              {matchedInvestors.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      No investors match this lead
                    </p>
                  </CardContent>
                </Card>
              ) : (
                matchedInvestors.map((investor) => (
                  <ExpandableInvestorCard 
                    key={investor.id} 
                    investor={investor}
                    isExpanded={expandedCards.has(investor.id)}
                    isSelected={selectedInvestors.includes(investor.id)}
                    onToggleExpand={() => handleToggleExpand(investor.id)}
                    onSelect={() => handleSelectInvestor(investor.id)}
                    onDeselect={() => handleDeselectInvestor(investor.id)}
                    onViewDetails={() => handleInvestorClick(investor.id)}
                    canSelect={selectedInvestors.length < 3 || selectedInvestors.includes(investor.id)}
                  />
                ))
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>POC</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Weekly Cap</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedInvestors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No investors match this lead
                        </TableCell>
                      </TableRow>
                    ) : (
                      matchedInvestors.map((investor) => (
                        <TableRow 
                          key={investor.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleInvestorClick(investor.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {investor.company_name}
                              {investor.isDirectPurchase && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                  Direct
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{investor.main_poc}</TableCell>
                          <TableCell>Tier {investor.tier}</TableCell>
                          <TableCell>{investor.weekly_cap}/week</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge 
                                style={{
                                  backgroundColor: `hsl(${Math.min(investor.matchScore, 100) * 1.2}, 70%, 50%)`,
                                }}
                              >
                                {investor.matchScore}/100
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                L:{investor.locationScore} B:{Math.round(investor.buyBoxScore)} Q:{investor.qualityScore} C:{investor.capacityScore}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {investor.hubspot_url && (
                              <a
                                href={investor.hubspot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {selectedInvestorFullData && (
        <InvestorDetailModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedInvestorFullData(null);
          }}
          investor={selectedInvestorFullData}
          buyBox={selectedInvestorFullData.buy_box?.[0]}
          markets={selectedInvestorFullData.markets || []}
          onEdit={() => {
            // Optionally handle edit functionality
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

interface ExpandableInvestorCardProps {
  investor: MatchedInvestor;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onDeselect: () => void;
  onViewDetails: () => void;
  canSelect: boolean;
}

function ExpandableInvestorCard({
  investor,
  isExpanded,
  isSelected,
  onToggleExpand,
  onSelect,
  onDeselect,
  onViewDetails,
  canSelect,
}: ExpandableInvestorCardProps) {
  const [fullData, setFullData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch full data when expanded for the first time
  const handleExpand = async () => {
    if (!isExpanded && !fullData) {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('investors')
          .select(`
            *,
            buy_box (*),
            markets (*)
          `)
          .eq('id', investor.id)
          .single();

        if (error) throw error;
        setFullData(data);
      } catch (error) {
        console.error('Error fetching investor details:', error);
      } finally {
        setLoading(false);
      }
    }
    onToggleExpand();
  };

  const buyBox = fullData?.buy_box?.[0];
  const markets = fullData?.markets || [];

  return (
    <Collapsible open={isExpanded} onOpenChange={handleExpand}>
      <Card className={`${isSelected ? 'border-2 border-primary bg-primary/5' : ''}`}>
        <CollapsibleTrigger className="w-full">
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                  <h4 className="font-semibold text-base">{investor.company_name}</h4>
                  {investor.isDirectPurchase && (
                    <Badge variant="default" className="bg-green-600 text-xs">
                      Direct
                    </Badge>
                  )}
                  {isSelected && (
                    <Badge className="bg-primary text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{investor.main_poc}</p>
              </div>
              {investor.hubspot_url && (
                <a
                  href={investor.hubspot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Tier {investor.tier}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Cap: {investor.weekly_cap}/week
              </Badge>
              <Badge 
                className="text-xs"
                style={{
                  backgroundColor: `hsl(${Math.min(investor.matchScore, 100) * 1.2}, 70%, 50%)`,
                }}
              >
                {investor.matchScore}% Match
              </Badge>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <div className="text-xs font-semibold mb-2">Score Breakdown ({investor.matchScore}/100)</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">📍 Location Fit:</span>
                  <Badge variant="outline" className="text-xs">{investor.locationScore}/35</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">🏠 Buy Box Match:</span>
                  <Badge variant="outline" className="text-xs">{Math.round(investor.buyBoxScore)}/30</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">⭐ Investor Quality:</span>
                  <Badge variant="outline" className="text-xs">{investor.qualityScore}/25</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">📊 Capacity:</span>
                  <Badge variant="outline" className="text-xs">{investor.capacityScore}/10</Badge>
                </div>
              </div>
            </div>

            {investor.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {investor.tags.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <strong>Match reasons:</strong> {investor.matchReasons.join(", ")}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading details...
              </div>
            ) : fullData ? (
              <>
                {/* Basic Information */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-sm flex items-center gap-2">
                    📋 Basic Information
                  </h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coverage:</span>{' '}
                      <span className="capitalize">{investor.coverage_type}</span>
                    </div>
                  </div>
                </div>

                {/* Offer Types */}
                {fullData.offer_types && fullData.offer_types.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm flex items-center gap-2">
                      💰 Offer Types
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {fullData.offer_types.map((type: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buy Box Criteria */}
                {buyBox && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm flex items-center gap-2">
                      🏠 Buy Box Criteria
                    </h5>
                    <div className="space-y-2 text-sm">
                      {buyBox.property_types && buyBox.property_types.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Property Types:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {buyBox.property_types.map((type: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {(buyBox.price_min || buyBox.price_max) && (
                        <div>
                          <span className="text-muted-foreground">Price Range:</span>{' '}
                          ${buyBox.price_min?.toLocaleString() || '0'} - ${buyBox.price_max?.toLocaleString() || '∞'}
                        </div>
                      )}
                      {(buyBox.year_built_min || buyBox.year_built_max) && (
                        <div>
                          <span className="text-muted-foreground">Year Built:</span>{' '}
                          {buyBox.year_built_min || '0'} - {buyBox.year_built_max || 'Present'}
                        </div>
                      )}
                      {buyBox.condition_types && buyBox.condition_types.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Conditions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {buyBox.condition_types.map((condition: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Market Coverage */}
                {markets.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-sm flex items-center gap-2">
                      🗺️ Market Coverage
                    </h5>
                    <div className="space-y-2 text-sm">
                      {markets.map((market: any) => {
                        const hasStates = market.states && market.states.length > 0;
                        const hasZips = market.zip_codes && market.zip_codes.length > 0;
                        
                        if (!hasStates && !hasZips) return null;

                        return (
                          <div key={market.id}>
                            <span className="text-muted-foreground capitalize">
                              {market.market_type.replace('_', ' ')}:
                            </span>{' '}
                            {hasStates && (
                              <span>{market.states.join(', ')}</span>
                            )}
                            {hasZips && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Zips: {market.zip_codes.slice(0, 10).join(', ')}
                                {market.zip_codes.length > 10 && ` +${market.zip_codes.length - 10} more`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {isSelected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeselect();
                      }}
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      Deselect Investor
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect();
                      }}
                      disabled={!canSelect}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Select Investor
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetails();
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Details
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
