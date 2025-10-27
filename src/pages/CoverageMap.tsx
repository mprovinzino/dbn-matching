import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapControls } from "@/components/map/MapControls";
import { CoverageMapView } from "@/components/map/CoverageMapView";
import { DmaInfoPanel } from "@/components/map/DmaInfoPanel";
import { useMapCoverage } from "@/hooks/useMapCoverage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CoverageMap() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const investorParam = searchParams.get("investor");

  const [searchQuery, setSearchQuery] = useState("");
  const [marketType, setMarketType] = useState("all");
  const [minInvestors, setMinInvestors] = useState(0);
  const [selectedDma, setSelectedDma] = useState<string | null>(null);
  const [totalInvestors, setTotalInvestors] = useState(0);

  const { data: coverage, isLoading } = useMapCoverage({
    marketType,
    minInvestors,
    searchQuery,
  });

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

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading coverage map...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && (!coverage || coverage.length === 0)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="mb-4 text-muted-foreground">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No Coverage Data Available</h2>
          <p className="text-muted-foreground mb-6">
            The zip code reference database is empty. You need to import DMA data first.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate("/")} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard to Import Data
            </Button>
            <p className="text-sm text-muted-foreground">
              Click "Import DMA Data" on the Dashboard and select the DMA_Zipcodes-2.xlsx file
            </p>
          </div>
        </div>
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
        />

        <CoverageMapView
          coverage={coverage || []}
          searchQuery={searchQuery}
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
