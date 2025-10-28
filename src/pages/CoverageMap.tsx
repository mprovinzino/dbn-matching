import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapControls } from "@/components/map/MapControls";
import { CoverageMapView } from "@/components/map/CoverageMapView";
import { DmaInfoPanel } from "@/components/map/DmaInfoPanel";
import { useMapCoverage, useStateLevelCoverage } from "@/hooks/useMapCoverage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CoverageMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const investorParam = searchParams.get("investor");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [marketType, setMarketType] = useState("all");
  const [minInvestors, setMinInvestors] = useState(0);
  const [selectedDma, setSelectedDma] = useState<string | null>(null);
  const [totalInvestors, setTotalInvestors] = useState(0);

  // Debounce search to prevent refetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: coverage, isLoading, isFetching, error } = useMapCoverage({
    marketType,
    minInvestors,
    searchQuery: debouncedSearch,
  });

  const { data: stateLevelCoverage, isLoading: isLoadingStates } = useStateLevelCoverage(debouncedSearch);

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
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          marketType={marketType}
          onMarketTypeChange={setMarketType}
          minInvestors={minInvestors}
          onMinInvestorsChange={setMinInvestors}
          totalDmas={coverage?.length || 0}
          totalInvestors={totalInvestors}
          isFetching={isFetching}
        />

        <CoverageMapView
          coverage={coverage || []}
          stateLevelCoverage={stateLevelCoverage || []}
          searchQuery={debouncedSearch}
          onDmaClick={setSelectedDma}
          highlightInvestorId={investorParam}
        />

        {selectedDma && (
          <DmaInfoPanel
            dmaName={selectedDma}
            onClose={() => setSelectedDma(null)}
          />
        )}
      </div>
    </div>
  );
}
