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
import { PROPERTY_TYPES, CONDITION_TYPES } from "@/lib/buyBoxConstants";

// Backward-compatibility mappings for legacy values to canonical dropdown values
const CANON_PROP_MAP: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPES.map(v => [v.toLowerCase(), v])
);
const CANON_COND_MAP: Record<string, string> = Object.fromEntries(
  CONDITION_TYPES.map(v => [v.toLowerCase(), v])
);

const PROPERTY_TYPE_ALIASES: Record<string, string> = {
  // Common legacy variants -> canonical (keys must be lowercase)
  'condo': 'Condominiums',
  'condominium': 'Condominiums',
  'condominiums': 'Condominiums',
  'single family': 'Single Family Residence',
  'single-family': 'Single Family Residence',
  'single family residence': 'Single Family Residence',
  'sfr': 'Single Family Residence',
  'townhouse': 'Townhouse',
  'town home': 'Townhouse',
  'townhome': 'Townhouse',
  'townhomes': 'Townhouse',
  'mobile home': 'Manufactured Home',
  'mobile home (with land)': 'Manufactured Home',
  'mobile home (without land)': 'Manufactured Home',
  'manufactured home': 'Manufactured Home',
  'land': 'Lots/Land',
  'lot': 'Lots/Land',
  'lots': 'Lots/Land',
  'lots/land': 'Lots/Land',
  'farm': 'Lots/Land',
  'commercial': 'Commercial',
  'commercial (retail)': 'Commercial',
  'multi-family (2-4 units)': 'Multi-Family (2-4 units)',
  'multifamily (2-4 units)': 'Multi-Family (2-4 units)',
  'multi-family residential (duplex - quadplex)': 'Multi-Family (2-4 units)',
  'multi-family (5+ units)': 'Multi-Family (5+ units)',
  'multifamily (5+ units)': 'Multi-Family (5+ units)',
  'multi-family commercial (fiveplex+)': 'Multi-Family (5+ units)',
};

const CONDITION_ALIASES: Record<string, string> = {
  // keys must be lowercase
  'move in ready with older finishes': 'Move in Ready with older finishes',
  'move-in ready with older finishes': 'Move in Ready with older finishes',
  'move in ready with newer finishes': 'Move in Ready with newer finishes',
  'move-in ready with newer finishes': 'Move in Ready with newer finishes',
  'move in ready with modern finishes': 'Move in Ready with newer finishes',
  'move-in ready with modern finishes': 'Move in Ready with newer finishes',
  'needs few repairs': 'Needs Few Repairs',
  'needs major repairs': 'Needs Major Repairs',
  'tear down or complete gut rehab': 'Tear Down or Complete Gut Rehab',
};

const normalizePropertyType = (v?: string) => {
  if (!v) return undefined;
  const key = v.trim().toLowerCase();
  return PROPERTY_TYPE_ALIASES[key] || CANON_PROP_MAP[key] || v;
};

const normalizeCondition = (v?: string) => {
  if (!v) return undefined;
  const key = v.trim().toLowerCase();
  return CONDITION_ALIASES[key] || CANON_COND_MAP[key] || v;
};

// Extract canonical values from composite/legacy strings (e.g., "Single Family & Condominiums")
const extractCanonicalPropertyTypes = (dbValues: string[]): string[] => {
  const canonical = new Set<string>();
  dbValues.forEach((v) => {
    const normalized = normalizePropertyType(v);
    if (normalized && PROPERTY_TYPES.includes(normalized as any)) {
      canonical.add(normalized);
    } else {
      // Scan for canonical labels within composite strings
      const lower = v.toLowerCase();
      PROPERTY_TYPES.forEach((pt) => {
        if (lower.includes(pt.toLowerCase())) {
          canonical.add(pt);
        }
      });
    }
  });
  return Array.from(canonical);
};

const extractCanonicalConditions = (dbValues: string[]): string[] => {
  const canonical = new Set<string>();
  dbValues.forEach((v) => {
    const normalized = normalizeCondition(v);
    if (normalized && CONDITION_TYPES.includes(normalized as any)) {
      canonical.add(normalized);
    } else {
      // Scan for canonical labels within composite strings
      const lower = v.toLowerCase();
      CONDITION_TYPES.forEach((ct) => {
        if (lower.includes(ct.toLowerCase())) {
          canonical.add(ct);
        }
      });
    }
  });
  return Array.from(canonical);
};
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
  const [debugMode, setDebugMode] = useState(false);

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
      if (Number.isFinite(leadData.askPrice as number)) enteredCriteria.push('price');
      if (Number.isFinite(leadData.yearBuilt as number)) enteredCriteria.push('yearBuilt');
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
        // buy_box is a one-to-one relationship, so it's an object (or null), not an array
        const buyBox = investor.buy_box || null;
        
        // DEBUG: Log investor and buy box data
        console.log(`\n=== Checking Investor: ${investor.company_name} ===`);
        console.log('Raw buy_box data:', buyBox ? 'HAS BUY_BOX' : 'NO BUY_BOX');
        console.log('Buy_box condition_types:', buyBox?.condition_types);
        console.log('Lead Data:', {
          state: leadData.state,
          zipCode: leadData.zipCode,
          askPrice: leadData.askPrice,
          yearBuilt: leadData.yearBuilt,
          propertyType: leadData.propertyType,
          condition: leadData.condition
        });
        console.log('Buy Box:', buyBox ? {
          property_types: buyBox.property_types,
          condition_types: buyBox.condition_types,
          year_built_min: buyBox.year_built_min,
          year_built_max: buyBox.year_built_max,
          price_min: buyBox.price_min,
          price_max: buyBox.price_max
        } : 'NO BUY BOX');
        
        // Validate buy box ranges
        if (buyBox) {
          if (buyBox.year_built_min && buyBox.year_built_max && 
              Number(buyBox.year_built_min) > Number(buyBox.year_built_max)) {
            console.warn(`Invalid year range for ${investor.company_name}: ${buyBox.year_built_min} > ${buyBox.year_built_max}`);
            matchReasons.push("⚠️ Invalid buy box year range");
            return;
          }
          
          if (buyBox.price_min && buyBox.price_max && 
              Number(buyBox.price_min) > Number(buyBox.price_max)) {
            console.warn(`Invalid price range for ${investor.company_name}`);
            matchReasons.push("⚠️ Invalid buy box price range");
            return;
          }
        }
        
        // LOCATION MATCH (if entered)
        if (enteredCriteria.includes('location')) {
          let hasLocationMatch = false;
          
          // Priority 1: ZIP code match (primary_market or direct_purchase)
          const hasZipMatch = markets.some((m: any) => 
            (m.market_type === 'primary' || m.market_type === 'direct_purchase') &&
            m.zip_codes?.some((z: string) => z.trim() === leadData.zipCode.trim())
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
              m.states?.some((s: string) => 
                s.trim().toUpperCase() === leadData.state.toUpperCase()
              )
            );
            
            if (hasStateInFullCoverage) {
              hasLocationMatch = true;
              locationSpecificity = 'state';
              matchReasons.push(`🏛️ Full coverage in ${leadData.state}`);
            }
          }
          
          // Priority 3: National coverage (26+ states in full_coverage = 50%+ of USA)
          if (!hasLocationMatch) {
            // Aggregate all distinct states from all full_coverage markets
            const fullCoverageStates = new Set<string>();
            markets
              .filter((m: any) => m.market_type === 'full_coverage' && Array.isArray(m.states))
              .forEach((m: any) => 
                m.states.forEach((s: string) => 
                  fullCoverageStates.add((s || '').toUpperCase().trim())
                )
              );
            const stateCount = fullCoverageStates.size;
            
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
          const priceMin = Number.isFinite(Number(buyBox.price_min)) ? Number(buyBox.price_min) : -Infinity;
          const priceMax = Number.isFinite(Number(buyBox.price_max)) ? Number(buyBox.price_max) : Infinity;
          const leadPrice = leadData.askPrice!;
          
          if (Number.isFinite(leadPrice) && leadPrice >= priceMin && leadPrice <= priceMax) {
            matchCount++;
            criteriaMatches.price = true;
            matchReasons.push("💰 Price in range");
          } else if (Number.isFinite(leadPrice)) {
            matchReasons.push(`✗ Price outside range ($${leadPrice.toLocaleString()} vs $${priceMin === -Infinity ? '0' : priceMin.toLocaleString()}-$${priceMax === Infinity ? '∞' : priceMax.toLocaleString()})`);
          }
        }

        // YEAR BUILT MATCH (if entered)
        if (enteredCriteria.includes('yearBuilt')) {
          const yMinRaw = buyBox?.year_built_min;
          const yMaxRaw = buyBox?.year_built_max;
          const yearMin = Number.isFinite(Number(yMinRaw)) ? Number(yMinRaw) : -Infinity;
          const yearMax = Number.isFinite(Number(yMaxRaw)) ? Number(yMaxRaw) : Infinity;
          const leadYear = leadData.yearBuilt!;
          
          console.log('Year Built Check:', {
            leadYear,
            yearMin,
            yearMax,
            buyBox_year_built_min: yMinRaw,
            buyBox_year_built_max: yMaxRaw
          });
          
          if (Number.isFinite(leadYear) && leadYear >= yearMin && leadYear <= yearMax) {
            matchCount++;
            criteriaMatches.yearBuilt = true;
            matchReasons.push(`📅 Year built (${leadYear})`);
            console.log(`✓ Year Built: Match (${leadYear} in range ${yearMin}-${yearMax})`);
          } else if (Number.isFinite(leadYear)) {
            matchReasons.push(`✗ Year built outside range (${leadYear} vs ${yearMin === -Infinity ? 'any' : yearMin}-${yearMax === Infinity ? 'any' : yearMax})`);
            console.log(`✗ Year Built: No match (${leadYear} not in ${yearMin}-${yearMax})`);
          }
        }

        // PROPERTY TYPE MATCH (if entered) - robust canonicalization for composite DB strings
        if (enteredCriteria.includes('propertyType')) {
          const propertyTypes = Array.isArray(buyBox?.property_types) ? buyBox.property_types : [];
          const canonicalTypes = extractCanonicalPropertyTypes(propertyTypes);
          const leadTypeNorm = normalizePropertyType(leadData.propertyType);
          
          console.log('Property Type Check:', {
            propertyTypes: propertyTypes,
            canonicalTypes: canonicalTypes,
            leadTypeNorm: leadTypeNorm,
            leadData_propertyType: leadData.propertyType
          });
          
          // If buy_box has no property types, it's permissive
          if (canonicalTypes.length === 0) {
            matchCount++;
            criteriaMatches.propertyType = true;
            matchReasons.push("🏠 Property type (any accepted)");
            console.log('✓ Property Type: Permissive match (no restrictions)');
          } else if (leadTypeNorm && canonicalTypes.includes(leadTypeNorm)) {
            // Exact string match after canonicalization
            matchCount++;
            criteriaMatches.propertyType = true;
            matchReasons.push("🏠 Property type match");
            console.log(`✓ Property Type: Match found (${leadTypeNorm})`);
          } else if (leadTypeNorm) {
            matchReasons.push(`✗ Property type not accepted (${leadTypeNorm} not in [${canonicalTypes.join(', ')}])`);
            console.log(`✗ Property Type: No match (${leadTypeNorm} not in [${canonicalTypes.join(', ')}])`);
          }
        }

        // CONDITION MATCH (if entered) - robust canonicalization for composite DB strings
        if (enteredCriteria.includes('condition')) {
          const conditionTypes = Array.isArray(buyBox?.condition_types) ? buyBox.condition_types : [];
          const canonicalConditions = extractCanonicalConditions(conditionTypes);
          const leadCondNorm = normalizeCondition(leadData.condition);
          
          console.log('Condition Check:', {
            conditionTypes: conditionTypes,
            canonicalConditions: canonicalConditions,
            leadCondNorm: leadCondNorm
          });
          
          // If buy_box has no condition types:
          if (canonicalConditions.length === 0) {
            if (leadCondNorm) {
              // User specified a condition but investor has none recorded -> treat as NOT accepted (strict)
              criteriaMatches.condition = false;
              matchReasons.push("✗ Condition not specified in investor profile");
              console.log('✗ Condition: Investor has no condition_types; strict mismatch for specified condition');
            } else {
              // No condition entered by user -> permissive
              matchCount++;
              criteriaMatches.condition = true;
              matchReasons.push("🔧 Condition (any accepted)");
              console.log('✓ Condition: Permissive match (no restrictions)');
            }
          } else if (leadCondNorm && canonicalConditions.includes(leadCondNorm)) {
            // Exact string match after canonicalization
            matchCount++;
            criteriaMatches.condition = true;
            matchReasons.push("🔧 Condition match");
            console.log(`✓ Condition: Match found (${leadCondNorm})`);
          } else if (leadCondNorm) {
            matchReasons.push(`✗ Condition not accepted (${leadCondNorm} not in [${canonicalConditions.join(', ')}])`);
            console.log(`✗ Condition: No match (${leadCondNorm} not in [${canonicalConditions.join(', ')}])`);
          }
        }

        // Add reasons for criteria that DIDN'T match (for criteria not handled above)
        if (enteredCriteria.includes('location') && !criteriaMatches.location) {
          matchReasons.push("✗ Location not covered");
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
        
        // Debug logging for top matches
        if (debugMode && matchCount > 0) {
          console.debug(`[Match Debug] ${investor.company_name}:`, {
            entered: enteredCriteria,
            lead: {
              price: leadData.askPrice,
              year: leadData.yearBuilt,
              propertyType: leadData.propertyType,
              condition: leadData.condition,
            },
            buyBox: buyBox ? {
              priceRange: [buyBox.price_min, buyBox.price_max],
              yearRange: [buyBox.year_built_min, buyBox.year_built_max],
              propertyTypes: buyBox.property_types,
              conditionTypes: buyBox.condition_types,
            } : null,
            criteriaMatches,
            matchReasons,
          });
        }
      });

      // Sort by percentage score, then by tier, then by company name
      matches.sort((a, b) => {
        if (b.matchScore !== a.matchScore) {
          return b.matchScore - a.matchScore;
        }
        if (a.tier !== b.tier) {
          return a.tier - b.tier; // Lower tier is better
        }
        return a.company_name.localeCompare(b.company_name);
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Lead Matching Search
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs"
            >
              Debug {debugMode ? 'ON' : 'OFF'}
            </Button>
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
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === '' ? undefined : Number(v);
                  setLeadData({ ...leadData, askPrice: Number.isFinite(n) ? n : undefined });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                type="number"
                placeholder="1995"
                min="1800"
                max="2100"
                value={leadData.yearBuilt ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = v === '' ? undefined : Number(v);
                  setLeadData({ ...leadData, yearBuilt: Number.isFinite(n) ? n : undefined });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={leadData.propertyType ?? ""}
                onValueChange={(value) => setLeadData({ ...leadData, propertyType: value })}
              >
                <SelectTrigger id="propertyType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Property Condition</Label>
              <Select
                value={leadData.condition ?? ""}
                onValueChange={(value) => setLeadData({ ...leadData, condition: value })}
              >
                <SelectTrigger id="condition">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {CONDITION_TYPES.map(condition => (
                    <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                  ))}
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
          buyBox={selectedInvestorFullData.buy_box}
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

  // Sort buy_box by updated_at/created_at descending to get the most recent one (same as matcher)
  const buyBoxArray = Array.isArray(fullData?.buy_box) ? fullData.buy_box : [];
  const buyBox = buyBoxArray
    .slice()
    .sort((a: any, b: any) => 
      new Date(b.updated_at || b.created_at).getTime() - 
      new Date(a.updated_at || a.created_at).getTime()
    )[0];
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

            <div className="text-xs">
              <strong className="text-muted-foreground">Match reasons:</strong>{" "}
              {investor.matchReasons.map((reason, idx) => {
                const isNegative = reason.includes('✗') || reason.includes('not accepted') || reason.includes('not specified');
                return (
                  <span key={idx}>
                    <span className={isNegative ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}>
                      {reason}
                    </span>
                    {idx < investor.matchReasons.length - 1 && ", "}
                  </span>
                );
              })}
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
