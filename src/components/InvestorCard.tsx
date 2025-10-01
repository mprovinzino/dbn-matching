import { Building2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface InvestorCardProps {
  investor: {
    id: string;
    company_name: string;
    main_poc: string;
    hubspot_url: string | null;
    coverage_type: string;
    tier: number;
    weekly_cap: number;
    cold_accepts: boolean | null;
    tags: string[] | null;
    freeze_reason: string | null;
  };
  onClick: () => void;
}

export function InvestorCard({ investor, onClick }: InvestorCardProps) {
  const getTierColor = (tier: number) => {
    if (tier <= 3) return "tier-1-3";
    if (tier <= 6) return "tier-4-6";
    return "tier-7-10";
  };

  const getStatusBadge = () => {
    const tags = investor.tags || [];
    if (tags.includes("PAUSED") || investor.freeze_reason) {
      return <Badge variant="destructive">PAUSED</Badge>;
    }
    if (tags.includes("TEST")) {
      return <Badge variant="secondary">TEST</Badge>;
    }
    if (tags.includes("Active")) {
      return <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>;
    }
    return null;
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">{investor.company_name}</h3>
              <p className="text-sm text-muted-foreground">{investor.main_poc}</p>
            </div>
          </div>
          <Badge className={`bg-${getTierColor(investor.tier)}`}>
            Tier {investor.tier}
          </Badge>
        </div>
        <div className="flex gap-2 mt-2">
          {getStatusBadge()}
          {investor.cold_accepts && (
            <Badge variant="outline">Accepts Cold</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Coverage:</span>
            <span className="font-medium capitalize">
              {investor.coverage_type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Weekly Cap:</span>
            <span className="font-medium">{investor.weekly_cap} leads</span>
          </div>
          {investor.hubspot_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={(e) => {
                e.stopPropagation();
                window.open(investor.hubspot_url!, '_blank');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View in HubSpot
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
