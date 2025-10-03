import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, ExternalLink, TrendingUp, MapPin, LayoutGrid, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InvestorDetailModal } from "@/components/InvestorDetailModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface LeadData {
  state: string;
  zipCode: string;
  city?: string;
  priceMin?: number;
  priceMax?: number;
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
        .eq('status', 'active');

      if (error) throw error;

      const matches: MatchedInvestor[] = [];

      investors?.forEach((investor) => {
        let matchScore = 0;
        const matchReasons: string[] = [];
        let isFullCoverage = false;
        let isDirectPurchase = false;
        let isPrimaryMarket = false;
        let isSecondaryMarket = false;

        // Check market match
        const markets = investor.markets || [];
        
        markets.forEach((market: any) => {
          const stateMatch = market.states?.includes(leadData.state);
          const zipMatch = market.zip_codes?.includes(leadData.zipCode);

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

        // Only include if there's at least one market match
        if (!isFullCoverage && !isPrimaryMarket && !isSecondaryMarket) {
          return;
        }

        // Check buy box criteria
        const buyBox = investor.buy_box?.[0];
        if (buyBox) {
          // Price match
          if (leadData.priceMin && leadData.priceMax) {
            const buyBoxPriceMin = buyBox.price_min ? Number(buyBox.price_min) : null;
            const buyBoxPriceMax = buyBox.price_max ? Number(buyBox.price_max) : null;
            
            if (buyBoxPriceMin && buyBoxPriceMax) {
              const priceInRange = 
                leadData.priceMin >= buyBoxPriceMin && 
                leadData.priceMax <= buyBoxPriceMax;
              
              if (priceInRange) {
                matchScore += 20;
                matchReasons.push("Price range match");
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
              <Label htmlFor="priceMin">Min Price</Label>
              <Input
                id="priceMin"
                type="number"
                placeholder="50000"
                value={leadData.priceMin || ""}
                onChange={(e) => setLeadData({ ...leadData, priceMin: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMax">Max Price</Label>
              <Input
                id="priceMax"
                type="number"
                placeholder="500000"
                value={leadData.priceMax || ""}
                onChange={(e) => setLeadData({ ...leadData, priceMax: Number(e.target.value) })}
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
                      <InvestorMatchCard 
                        key={investor.id} 
                        investor={investor}
                        onClick={() => handleInvestorClick(investor.id)}
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
                      <InvestorMatchCard 
                        key={investor.id} 
                        investor={investor}
                        onClick={() => handleInvestorClick(investor.id)}
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

function InvestorMatchCard({ investor, onClick }: { investor: MatchedInvestor; onClick: () => void }) {
  return (
    <div 
      className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-base mb-1">{investor.company_name}</h4>
            {investor.isDirectPurchase && (
              <Badge variant="default" className="bg-green-600 text-xs">
                Direct Purchase
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
  );
}
