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
  matchScore: number; // Now represents percentage 0-100
  matchCount: number; // How many criteria matched
  totalCriteria: number; // How many criteria were searched
  criteriaMatches: {
    location?: boolean;
    price?: boolean;
    yearBuilt?: boolean;
    propertyType?: boolean;
    condition?: boolean;
  };
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
      // Count how many criteria the user entered
      const enteredCriteria: string[] = [];
      if (leadData.state && leadData.zipCode) enteredCriteria.push('location');
      if (leadData.askPrice) enteredCriteria.push('price');
      if (leadData.yearBuilt) enteredCriteria.push('yearBuilt');
      if (leadData.propertyType) enteredCriteria.push('propertyType');
      if (leadData.condition) enteredCriteria.push('condition');

      const totalCriteria = enteredCriteria.length;

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
        let matchCount = 0;
        const criteriaMatches: Record<string, boolean> = {};
        
        let isFullCoverage = false;
        let isDirectPurchase = false;
        let isPrimaryMarket = false;
        let locationSpecificity = 'none';
        
        const markets = investor.markets || [];
        const buyBox = investor.buy_box?.[0];
        
        // LOCATION MATCH (if entered)
        if (enteredCriteria.includes('location')) {
          let hasLocationMatch = false;
          
          // Priority 1: ZIP code match (primary_market or direct_purchase)
          const hasZipMatch = markets.some((m: any) => 
            (m.market_type === 'primary' || m.market_type === 'direct_purchase') &&
            m.zip_codes?.includes(leadData.zipCode)
          );
          
          if (hasZipMatch) {
            hasLocationMatch = true;
            locationSpecificity = 'zip';
            matchReasons.push(`📍 Exact ZIP match (${leadData.zipCode})`);
          }
          
          // Priority 2: State match via full_coverage
          if (!hasLocationMatch) {
            const hasStateInFullCoverage = markets.some((m: any) => 
              m.market_type === 'full_coverage' &&
              m.states?.some((s: string) => s === leadData.state || s.includes(leadData.state))
            );
            
            if (hasStateInFullCoverage) {
              hasLocationMatch = true;
              locationSpecificity = 'state';
              matchReasons.push(`🏛️ Full coverage in ${leadData.state}`);
            }
          }
          
          // Priority 3: National coverage (26+ states in full_coverage = 50%+ of USA)
          if (!hasLocationMatch) {
            const fullCoverageMarket = markets.find((m: any) => m.market_type === 'full_coverage');
            const stateCount = fullCoverageMarket?.states?.length || 0;
            
            if (stateCount >= 26) {
              hasLocationMatch = true;
              locationSpecificity = 'national';
              matchReasons.push("🌎 National coverage");
            }
          }

          if (hasLocationMatch) {
            matchCount++;
            criteriaMatches.location = true;
          }
        }

        // Skip if location was searched but no match found
        if (enteredCriteria.includes('location') && !criteriaMatches.location) {
          return;
        }

        // PRICE MATCH (if entered)
        if (enteredCriteria.includes('price') && buyBox) {
          const priceMin = Number(buyBox.price_min) || 0;
          const priceMax = Number(buyBox.price_max) || Infinity;
          if (leadData.askPrice! >= priceMin && leadData.askPrice! <= priceMax) {
            matchCount++;
            criteriaMatches.price = true;
            matchReasons.push("💰 Price in range");
          }
        }

        // YEAR BUILT MATCH (if entered)
        if (enteredCriteria.includes('yearBuilt') && buyBox) {
          const yearMin = buyBox.year_built_min || 0;
          const yearMax = buyBox.year_built_max || 9999;
          if (leadData.yearBuilt! >= yearMin && leadData.yearBuilt! <= yearMax) {
            matchCount++;
            criteriaMatches.yearBuilt = true;
            matchReasons.push("📅 Year built match");
          }
        }

        // PROPERTY TYPE MATCH (if entered) - partial match
        if (enteredCriteria.includes('propertyType') && buyBox) {
          const hasPropertyTypeMatch = buyBox.property_types?.some(type => 
            type.toLowerCase().includes(leadData.propertyType!.toLowerCase()) ||
            leadData.propertyType!.toLowerCase().includes(type.toLowerCase())
          );
          if (hasPropertyTypeMatch) {
            matchCount++;
            criteriaMatches.propertyType = true;
            matchReasons.push("🏠 Property type match");
          }
        }

        // CONDITION MATCH (if entered) - partial match
        if (enteredCriteria.includes('condition') && buyBox) {
          const hasConditionMatch = buyBox.condition_types?.some(type => 
            type.toLowerCase().includes(leadData.condition!.toLowerCase()) ||
            leadData.condition!.toLowerCase().includes(type.toLowerCase())
          );
          if (hasConditionMatch) {
            matchCount++;
            criteriaMatches.condition = true;
            matchReasons.push("🔧 Condition match");
          }
        }

        // Add reasons for criteria that DIDN'T match
        if (enteredCriteria.includes('location') && !criteriaMatches.location) {
          matchReasons.push("✗ Location not covered");
        }
        if (enteredCriteria.includes('price') && !criteriaMatches.price) {
          matchReasons.push("✗ Price outside range");
        }
        if (enteredCriteria.includes('yearBuilt') && !criteriaMatches.yearBuilt) {
          matchReasons.push("✗ Year built outside range");
        }
        if (enteredCriteria.includes('propertyType') && !criteriaMatches.propertyType) {
          matchReasons.push("✗ Property type not accepted");
        }
        if (enteredCriteria.includes('condition') && !criteriaMatches.condition) {
          matchReasons.push("✗ Condition not accepted");
        }

        // Only include investors with at least 1 matching criteria
        if (matchCount === 0) {
          return;
        }

        // Calculate percentage
        const matchScore = Math.round((matchCount / totalCriteria) * 100);

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
          matchCount,
          totalCriteria,
          criteriaMatches,
          matchReasons,
          isPrimaryMarket,
          isFullCoverage,
          isDirectPurchase,
          locationSpecificity,
        });
      });

      // Sort by percentage score, then by tier (for ties)
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
                            <div className="flex flex-col gap-1">
                              <Badge 
                                style={{
                                  backgroundColor: `hsl(${Math.min(investor.matchScore, 100) * 1.2}, 70%, 50%)`,
                                }}
                              >
                                {investor.matchScore}%
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {investor.matchCount}/{investor.totalCriteria} criteria
                              </span>
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

            {/* Criteria Match Breakdown */}
            <div className="space-y-2 bg-muted/30 p-3 rounded-md">
              <div className="text-xs font-semibold mb-2">
                Matching {investor.matchCount} of {investor.totalCriteria} criteria ({investor.matchScore}%)
              </div>
              <div className="space-y-1.5">
                {investor.criteriaMatches.location !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={investor.criteriaMatches.location ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {investor.criteriaMatches.location ? "✓" : "✗"} Location
                    </span>
                  </div>
                )}
                {investor.criteriaMatches.price !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={investor.criteriaMatches.price ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {investor.criteriaMatches.price ? "✓" : "✗"} Price Range
                    </span>
                  </div>
                )}
                {investor.criteriaMatches.yearBuilt !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={investor.criteriaMatches.yearBuilt ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {investor.criteriaMatches.yearBuilt ? "✓" : "✗"} Year Built
                    </span>
                  </div>
                )}
                {investor.criteriaMatches.propertyType !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={investor.criteriaMatches.propertyType ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {investor.criteriaMatches.propertyType ? "✓" : "✗"} Property Type
                    </span>
                  </div>
                )}
                {investor.criteriaMatches.condition !== undefined && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className={investor.criteriaMatches.condition ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {investor.criteriaMatches.condition ? "✓" : "✗"} Condition
                    </span>
                  </div>
                )}
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
