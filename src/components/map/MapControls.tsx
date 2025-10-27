import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter } from "lucide-react";

interface MapControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  marketType: string;
  onMarketTypeChange: (value: string) => void;
  minInvestors: number;
  onMinInvestorsChange: (value: number) => void;
  totalDmas: number;
  totalInvestors: number;
}

export function MapControls({
  searchQuery,
  onSearchChange,
  marketType,
  onMarketTypeChange,
  minInvestors,
  onMinInvestorsChange,
  totalDmas,
  totalInvestors,
}: MapControlsProps) {
  return (
    <div className="w-80 border-r bg-sidebar-background p-4 space-y-6 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold mb-2">Coverage Map</h2>
        <p className="text-sm text-muted-foreground">
          Interactive view of investor market coverage
        </p>
      </div>

      {/* Stats */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-sm">Coverage Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total DMAs:</span>
            <span className="font-semibold">{totalDmas}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Investors:</span>
            <span className="font-semibold">{totalInvestors}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg/DMA:</span>
            <span className="font-semibold">
              {totalDmas > 0 ? (totalInvestors / totalDmas).toFixed(1) : '0'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Investor or DMA
        </Label>
        <Input
          id="search"
          placeholder="Type to search..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <div className="text-xs text-muted-foreground mt-1 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
            <span className="font-semibold text-blue-600 dark:text-blue-400">Filtered View:</span>{" "}
            Showing coverage for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Market Type Filter */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Market Type
        </Label>
        <RadioGroup value={marketType} onValueChange={onMarketTypeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all" />
            <Label htmlFor="all" className="font-normal cursor-pointer">
              All Markets
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="primary" id="primary" />
            <Label htmlFor="primary" className="font-normal cursor-pointer">
              Primary Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="secondary" id="secondary" />
            <Label htmlFor="secondary" className="font-normal cursor-pointer">
              Secondary Only
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="direct_purchase" id="direct" />
            <Label htmlFor="direct" className="font-normal cursor-pointer">
              Direct Purchase
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="full_coverage" id="full" />
            <Label htmlFor="full" className="font-normal cursor-pointer">
              Full Coverage
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Minimum Investors Slider */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Label>Minimum Investors</Label>
          <span className="text-sm font-semibold">{minInvestors}+</span>
        </div>
        <Slider
          value={[minInvestors]}
          onValueChange={(values) => onMinInvestorsChange(values[0])}
          min={0}
          max={10}
          step={1}
        />
        <p className="text-xs text-muted-foreground">
          Show only DMAs with at least {minInvestors} investor{minInvestors !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <Label>Coverage Intensity</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300" />
            <span className="text-xs">0 investors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-200" />
            <span className="text-xs">1-2 investors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-400" />
            <span className="text-xs">3-5 investors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-600" />
            <span className="text-xs">6-10 investors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-600" />
            <span className="text-xs">10+ investors</span>
          </div>
        </div>
      </div>
    </div>
  );
}
