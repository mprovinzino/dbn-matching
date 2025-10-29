import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapControls } from "@/components/map/MapControls";
import { CoverageMapView } from "@/components/map/CoverageMapView";
import { CoverageInfoPanel } from "@/components/map/CoverageInfoPanel";
import { useMapCoverage, useStateLevelCoverage } from "@/hooks/useMapCoverage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CoverageMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const investorParam = searchParams.get("investor");

  const [searchInput, setSearchInput] = useState("");
  // Query used to actually filter the map (set only on selection)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [marketType, setMarketType] = useState("all");
  const [minInvestors, setMinInvestors] = useState(0);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedStateData, setSelectedStateData] = useState<{ investorIds: string[], coverage: any[], stateLevelData: any[] } | null>(null);
  const [totalInvestors, setTotalInvestors] = useState(0);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(investorParam);
  const [selectedInvestorName, setSelectedInvestorName] = useState<string | null>(null);

  // Debounce the actual filter query (not the input typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: coverage, isLoading, isFetching, error } = useMapCoverage({
    marketType,
    minInvestors,
    searchQuery: debouncedSearch,
    investorId: selectedInvestorId,
  });

  const { data: stateLevelCoverage, isLoading: isLoadingStates } = useStateLevelCoverage(
    debouncedSearch, 
    selectedInvestorId
  );

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: { type: string; id: string; label: string }) => {
    // Reflect selection in the input
    setSearchInput(suggestion.label);

    if (suggestion.type === 'investor') {
      // Exact, ID-based filtering
      setSelectedInvestorId(suggestion.id);
      setSelectedInvestorName(suggestion.label);
      // Do not use text filtering when an exact investor is selected
      setSearchQuery("");
    } else {
      // DMA or state selections use text-based filtering
      setSelectedInvestorId(null);
      setSelectedInvestorName(null);
      setSearchQuery(suggestion.label);
    }
  };

  // Do not trigger filtering while typing; only update input value
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // If input is cleared, also clear filters
    if (!value.trim()) {
      setSelectedInvestorId(null);
      setSelectedInvestorName(null);
      setSearchQuery("");
    }
  };

  // Load total investor count
  useEffect(() => {
    const loadInvestorCount = async () => {
      const { count } = await supabase
        .from("investors")
        .select("*", { count: "exact", head: true });
      setTotalInvestors(count || 0);
    };
    loadInvestorCount();
  }, []);

  if ((isLoading && !coverage) || (isLoadingStates && !stateLevelCoverage)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading coverage map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Coverage Data Error</AlertTitle>
          <AlertDescription>
            Failed to load coverage data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-sidebar-background p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Coverage Map</h1>
          <p className="text-sm text-muted-foreground">
            Interactive visualization of investor market coverage
          </p>
        </div>
      </header>

      {/* Map Layout */}
      <div className="flex-1 flex overflow-hidden">
        <MapControls
          searchQuery={searchInput}
          onSearchChange={handleSearchChange}
          marketType={marketType}
          onMarketTypeChange={setMarketType}
          minInvestors={minInvestors}
          onMinInvestorsChange={setMinInvestors}
          totalDmas={coverage?.length || 0}
          totalInvestors={totalInvestors}
          isFetching={isFetching}
          highlightInvestorId={selectedInvestorId}
          onSuggestionSelect={handleSuggestionSelect}
          selectedInvestorName={selectedInvestorName}
        />

        <CoverageMapView
          coverage={coverage || []}
          stateLevelCoverage={stateLevelCoverage || []}
          searchQuery={debouncedSearch}
          onDmaClick={(state, stateData) => {
            setSelectedState(state);
            setSelectedStateData(stateData);
          }}
          highlightInvestorId={selectedInvestorId}
        />

        {selectedState && selectedStateData && (
          <CoverageInfoPanel
            stateCode={selectedState}
            stateData={selectedStateData}
            onClose={() => {
              setSelectedState(null);
              setSelectedStateData(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
