import { X, Building2, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDmaInvestors } from "@/hooks/useMapCoverage";
import { useNavigate } from "react-router-dom";

interface DmaInfoPanelProps {
  dmaName: string;
  onClose: () => void;
}

export function DmaInfoPanel({ dmaName, onClose }: DmaInfoPanelProps) {
  const { data: investors, isLoading } = useDmaInvestors(dmaName);
  const navigate = useNavigate();

  const getTierColor = (tier: number) => {
    if (tier === 1) return "bg-amber-500";
    if (tier === 2) return "bg-blue-500";
    return "bg-gray-500";
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'test') return 'bg-blue-500';
    if (status === 'paused') return 'bg-amber-500';
    return 'bg-gray-500';
  };

  return (
    <div className="w-96 border-l bg-sidebar-background overflow-y-auto">
      <div className="sticky top-0 bg-sidebar-background border-b p-4 flex items-center justify-between z-10">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {dmaName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isLoading ? '...' : `${investors?.length || 0} investor${investors?.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </>
        ) : investors && investors.length > 0 ? (
          investors.map((investor: any) => (
            <Card 
              key={investor.investor_id}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/?investor=${investor.investor_id}`)}
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">
                      {investor.company_name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground truncate">
                      {investor.main_poc}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getTierColor(investor.tier)}`} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    Tier {investor.tier}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(investor.status)} text-white border-0`}
                  >
                    {investor.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {investor.market_type.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  <span className="capitalize">
                    {investor.coverage_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{investor.zip_count} zip codes in this DMA</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No investors found for this DMA
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
