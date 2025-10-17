import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface DmaGroup {
  dma: string;
  zip_count: number;
  sample_zips: string[];
  state: string;
}

interface DmaCoverageDisplayProps {
  marketType: 'primary' | 'secondary' | 'direct_purchase';
  zipCodes: string[];
  label: string;
  onEdit?: () => void;
}

export function DmaCoverageDisplay({ 
  marketType, 
  zipCodes, 
  label, 
  onEdit 
}: DmaCoverageDisplayProps) {
  const [dmaCoverage, setDmaCoverage] = useState<DmaGroup[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDmaCoverage();
  }, [zipCodes]);
  
  const loadDmaCoverage = async () => {
    if (!zipCodes || zipCodes.length === 0) {
      setDmaCoverage([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_dma_coverage', {
        market_zip_codes: zipCodes
      });

      if (error) {
        console.error('Error loading DMA coverage:', error);
        setDmaCoverage([]);
      } else {
        setDmaCoverage(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setDmaCoverage([]);
    } finally {
      setLoading(false);
    }
  };
  
  const totalDmas = dmaCoverage.length;
  const totalZips = zipCodes.length;
  const topDmas = dmaCoverage.slice(0, 5);
  const hiddenCount = Math.max(0, totalDmas - 5);
  
  const getMarketTypeColor = () => {
    switch (marketType) {
      case 'primary': return 'text-purple-600';
      case 'secondary': return 'text-amber-600';
      case 'direct_purchase': return 'text-green-600';
      default: return 'text-foreground';
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-sm ${getMarketTypeColor()}`}>
            {label}
          </h4>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading DMA coverage...</span>
        </div>
      </div>
    );
  }

  if (totalZips === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className={`font-semibold text-sm ${getMarketTypeColor()}`}>
            {label}
          </h4>
          {onEdit && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onEdit}
            >
              Add Zip Codes
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">No zip codes added yet</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold text-sm ${getMarketTypeColor()}`}>
          {label}
        </h4>
        <div className="flex items-center gap-2">
          {totalDmas > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show Less' : `Show All ${totalDmas} DMAs`}
            </Button>
          )}
          {onEdit && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Coverage Summary */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-md">
        <div className="text-center">
          <div className="text-lg font-bold">{totalDmas}</div>
          <div className="text-xs text-muted-foreground">DMAs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{totalZips}</div>
          <div className="text-xs text-muted-foreground">Zip Codes</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">
            {[...new Set(dmaCoverage.map(d => d.state))].filter(s => s).length}
          </div>
          <div className="text-xs text-muted-foreground">States</div>
        </div>
      </div>
      
      {/* DMA List */}
      <div className="space-y-2">
        {(expanded ? dmaCoverage : topDmas).map((dma) => (
          <div 
            key={dma.dma} 
            className="flex items-start justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {dma.dma}
                </span>
                {dma.state && dma.state !== 'Unknown' && (
                  <Badge variant="outline" className="text-xs">
                    {dma.state}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Sample: {dma.sample_zips.slice(0, 3).join(', ')}
                {dma.sample_zips.length > 3 && '...'}
              </div>
            </div>
            <Badge variant="secondary" className="ml-2">
              {dma.zip_count} {dma.zip_count === 1 ? 'zip' : 'zips'}
            </Badge>
          </div>
        ))}
        
        {!expanded && hiddenCount > 0 && (
          <div className="text-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
              className="text-muted-foreground"
            >
              + {hiddenCount} more DMA{hiddenCount > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
