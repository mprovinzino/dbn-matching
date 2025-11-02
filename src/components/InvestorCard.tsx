import { Building2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InvestorDmaSummary } from "./InvestorDmaSummary";

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
    status: 'active' | 'paused' | 'test' | 'inactive';
    status_reason: string | null;
  };
  marketData?: {
    market_type: string;
    zip_codes?: string[];
    states?: string[];
  }[];
  onClick: () => void;
}

export function InvestorCard({ investor, marketData, onClick }: InvestorCardProps) {
  const getTierColor = (tier: number) => {
    if (tier <= 3) return "bg-[hsl(var(--tier-1-3))] hover:bg-[hsl(var(--tier-1-3))]/90";
    if (tier <= 6) return "bg-[hsl(var(--tier-4-6))] hover:bg-[hsl(var(--tier-4-6))]/90";
    return "bg-[hsl(var(--tier-7-10))] hover:bg-[hsl(var(--tier-7-10))]/90";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500 hover:bg-green-500/90';
      case 'paused': return 'bg-yellow-500 hover:bg-yellow-500/90';
      case 'inactive': return 'bg-red-500 hover:bg-red-500/90';
      case 'test': return 'bg-blue-500 hover:bg-blue-500/90';
      default: return 'bg-gray-500 hover:bg-gray-500/90';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        investor.status === 'paused' ? 'border-yellow-500 border-2' : ''
      } ${
        investor.status === 'inactive' ? 'border-red-500 border-2 opacity-75' : ''
      }`}
      onClick={onClick}
      title={investor.status_reason || undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">{investor.company_name}</h3>
              <p className="text-sm text-muted-foreground">{investor.main_poc}</p>
              {investor.status !== 'active' && investor.status_reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {investor.status_reason}
                </p>
              )}
            </div>
          </div>
          <Badge className={getTierColor(investor.tier)}>
            Tier {investor.tier}
          </Badge>
        </div>
        <div className="flex gap-2 mt-2">
          {investor.status && (
            <Badge className={getStatusColor(investor.status)}>
              {formatStatusLabel(investor.status)}
            </Badge>
          )}
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
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Markets:</span>
            <InvestorDmaSummary 
              investorId={investor.id}
              coverageType={investor.coverage_type}
              marketData={marketData}
            />
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
