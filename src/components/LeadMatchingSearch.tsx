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
  weekly_cap: number;
  main_poc: string;
  matchScore: number;
  matchReasons: string[];
  isPrimaryMarket: boolean;
  isSecondaryMarket: boolean;
  isFullCoverage: boolean;
  isDirectPurchase: boolean;
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
        let matchScore = 0;
        const matchReasons: string[] = [];
        
        // Check for national coverage first
        const hasNationalCoverage = investor.coverage_type === 'national';
        
        let isFullCoverage = hasNationalCoverage; // National investors automatically have full coverage
        let isDirectPurchase = false;
        let isPrimaryMarket = false;
        let isSecondaryMarket = false;

        // Add national coverage bonus
        if (hasNationalCoverage) {
          matchScore += 50;
          matchReasons.push("National coverage");
        }

        // Check market match
        const markets = investor.markets || [];
        
        markets.forEach((market: any) => {
      // Handle both proper arrays and space-separated string arrays
      const stateMatch = market.states?.some((s: string) => 
        s === leadData.state || s.includes(leadData.state)
      );
      const zipMatch = market.zip_codes?.some((z: string) => 
        z === leadData.zipCode || z.includes(leadData.zipCode)
      );

          if (market.market_type === 'full_coverage' && stateMatch) {
            isFullCoverage = true;
            matchScore += 50;
            matchReasons.push("Full coverage state match");
          }

          if (market.market_type === 'direct_purchase' && (stateMatch || zipMatch)) {
            isDirectPurchase = true;
            matchReasons.push(zipMatch ? "Direct purchase zip match" : "Direct purchase state match");
          }

          if (market.market_type === 'primary' && zipMatch) {
            isPrimaryMarket = true;
            matchScore += 40;
            matchReasons.push("Primary market zip code match");
          }

          if (market.market_type === 'secondary' && zipMatch) {
            isSecondaryMarket = true;
            matchScore += 25;
            matchReasons.push("Secondary market zip code match");
          }
        });

        // Skip if no market match (unless they have national coverage)
        if (!hasNationalCoverage && !isFullCoverage && !isPrimaryMarket && !isSecondaryMarket) {
          return;
        }

        // Check buy box criteria
        const buyBox = investor.buy_box?.[0];
        if (buyBox) {
          // Check if ask price falls within investor's buy box range
          if (leadData.askPrice) {
            const buyBoxPriceMin = buyBox.price_min ? Number(buyBox.price_min) : null;
            const buyBoxPriceMax = buyBox.price_max ? Number(buyBox.price_max) : null;
            
            if (buyBoxPriceMin && buyBoxPriceMax) {
              const priceInRange = 
                leadData.askPrice >= buyBoxPriceMin && 
                leadData.askPrice <= buyBoxPriceMax;
              
              if (priceInRange) {
                matchScore += 20;
                matchReasons.push("Price match");
              }
            }
          }

          // Property type match
          if (leadData.propertyType && buyBox.property_types?.includes(leadData.propertyType)) {
            matchScore += 15;
            matchReasons.push("Property type match");
          }

          // Condition match
          if (leadData.condition && buyBox.condition_types?.includes(leadData.condition)) {
            matchScore += 15;
            matchReasons.push("Condition match");
          }

          // Year built match
          if (leadData.yearBuilt) {
            const yearMin = buyBox.year_built_min || 0;
            const yearMax = buyBox.year_built_max || 9999;
            
            if (leadData.yearBuilt >= yearMin && leadData.yearBuilt <= yearMax) {
              matchScore += 10;
              matchReasons.push("Year built match");
            }
          }
        }

        matches.push({
          id: investor.id,
          company_name: investor.company_name,
          hubspot_url: investor.hubspot_url,
          coverage_type: investor.coverage_type,
          tags: investor.tags || [],
          tier: investor.tier,
          weekly_cap: investor.weekly_cap,
          main_poc: investor.main_poc,
          matchScore,
          matchReasons,
          isPrimaryMarket: isPrimaryMarket || isFullCoverage,
          isSecondaryMarket,
          isFullCoverage,
          isDirectPurchase,
        });
      });

      // Sort by match score
      matches.sort((a, b) => b.matchScore - a.matchScore);
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

  const primaryMarketInvestors = matchedInvestors.filter(inv => inv.isPrimaryMarket);
  const secondaryMarketInvestors = matchedInvestors.filter(inv => inv.isSecondaryMarket && !inv.isPrimaryMarket);

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
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                  <SelectItem value="Distressed">Distressed</SelectItem>
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
            <div className="grid gap-6 md:grid-cols-2">
              {/* Primary Market Investors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    Primary Market Investors ({primaryMarketInvestors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {primaryMarketInvestors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No primary market investors match this lead
                    </p>
                  ) : (
                    primaryMarketInvestors.map((investor) => (
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
                </CardContent>
              </Card>

              {/* Secondary Market Investors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                    Secondary Market Investors ({secondaryMarketInvestors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {secondaryMarketInvestors.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No secondary market investors match this lead
                    </p>
                  ) : (
                    secondaryMarketInvestors.map((investor) => (
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
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>POC</TableHead>
                      <TableHead>Market Type</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Weekly Cap</TableHead>
                      <TableHead>Match Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedInvestors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                          <TableCell>
                            <Badge variant={investor.isPrimaryMarket ? "default" : "secondary"}>
                              {investor.isPrimaryMarket ? "Primary" : "Secondary"}
                            </Badge>
                          </TableCell>
                          <TableCell>Tier {investor.tier}</TableCell>
                          <TableCell>{investor.weekly_cap}/week</TableCell>
                          <TableCell>
                            <Badge 
                              style={{
                                backgroundColor: `hsl(${Math.min(investor.matchScore, 100) * 1.2}, 70%, 50%)`,
                              }}
                            >
                              {investor.matchScore}%
                            </Badge>
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
