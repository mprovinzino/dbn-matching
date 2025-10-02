import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Building2, ExternalLink, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvestorDetailModalProps {
  open: boolean;
  onClose: () => void;
  investor: any;
  buyBox: any;
  markets: any[];
  onEdit: () => void;
}

export function InvestorDetailModal({ 
  open, 
  onClose, 
  investor, 
  buyBox,
  markets,
  onEdit
}: InvestorDetailModalProps) {
  if (!investor) return null;

  const getTierColor = (tier: number) => {
    if (tier <= 3) return "tier-1-3";
    if (tier <= 6) return "tier-4-6";
    return "tier-7-10";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'inactive': return 'bg-red-500';
      case 'test': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                {investor.company_name}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{investor.main_poc}</p>
            </div>
            <div className="flex items-center gap-2">
              {investor.status && (
                <Badge className={getStatusColor(investor.status)}>
                  {formatStatusLabel(investor.status)}
                </Badge>
              )}
              <Badge className={`bg-${getTierColor(investor.tier)}`}>
                Tier {investor.tier}
              </Badge>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </DialogHeader>

        {investor.status !== 'active' && investor.status_reason && (
          <Alert variant={investor.status === 'inactive' ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Status: {formatStatusLabel(investor.status)}</strong>
              <div>{investor.status_reason}</div>
              {investor.status_changed_at && (
                <div className="text-xs mt-1 opacity-70">
                  Last updated: {new Date(investor.status_changed_at).toLocaleDateString()}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Coverage Type</p>
                <p className="font-medium capitalize">{investor.coverage_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weekly Capacity</p>
                <p className="font-medium">{investor.weekly_cap} leads</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accepts Cold Leads</p>
                <p className="font-medium">{investor.cold_accepts ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tags</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {investor.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
              {investor.hubspot_url && (
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(investor.hubspot_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View in HubSpot
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offer Types */}
          {investor.offer_types && investor.offer_types.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Offer Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {investor.offer_types.map((type: string) => (
                    <Badge key={type}>{type}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buy Box */}
          {buyBox && (
            <Card>
              <CardHeader>
                <CardTitle>Buy Box Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Property Types</p>
                  <div className="flex gap-1 flex-wrap">
                    {buyBox.property_types?.map((type: string) => (
                      <Badge key={type} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">On-Market Status</p>
                  <div className="flex gap-1 flex-wrap">
                    {buyBox.on_market_status?.map((status: string) => (
                      <Badge key={status} variant="secondary">{status}</Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built Range</p>
                    <p className="font-medium">
                      {buyBox.year_built_min} - {buyBox.year_built_max}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price Range</p>
                    <p className="font-medium">
                      ${buyBox.price_min?.toLocaleString()} - ${buyBox.price_max?.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Property Condition</p>
                  <div className="flex gap-1 flex-wrap">
                    {buyBox.condition_types?.map((condition: string) => (
                      <Badge key={condition} variant="secondary">{condition}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Timeframe</p>
                  <div className="flex gap-1 flex-wrap">
                    {buyBox.timeframe?.map((time: string) => (
                      <Badge key={time} variant="secondary">{time}</Badge>
                    ))}
                  </div>
                </div>

                {buyBox.lead_types && buyBox.lead_types.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Lead Types</p>
                    <div className="flex gap-1 flex-wrap">
                      {buyBox.lead_types.map((type: string) => (
                        <Badge key={type} variant="secondary">{type}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {buyBox.notes && (
                  <div>
                    <p className="text-sm font-medium mb-2">Additional Notes</p>
                    <p className="text-sm text-muted-foreground">{buyBox.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Markets */}
          {markets && markets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Market Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Coverage States */}
                {markets.find(m => m.market_type === 'full_coverage') && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-blue-600">Full Coverage States</h4>
                    <div className="flex gap-1 flex-wrap">
                      {markets.find(m => m.market_type === 'full_coverage')?.states?.map((state: string) => (
                        <Badge key={state} variant="default">{state}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Purchase Markets */}
                {markets.find(m => m.market_type === 'direct_purchase') && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-green-600">Direct Purchase Markets</h4>
                    <div className="space-y-2">
                      {markets.find(m => m.market_type === 'direct_purchase')?.states?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">States</p>
                          <div className="flex gap-1 flex-wrap">
                            {markets.find(m => m.market_type === 'direct_purchase')?.states?.map((state: string) => (
                              <Badge key={state} variant="outline">{state}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {markets.find(m => m.market_type === 'direct_purchase')?.zip_codes?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Zip Codes</p>
                          <div className="flex gap-1 flex-wrap max-h-20 overflow-y-auto">
                            {markets.find(m => m.market_type === 'direct_purchase')?.zip_codes?.map((zip: string) => (
                              <Badge key={zip} variant="outline">{zip}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Markets */}
                {markets.find(m => m.market_type === 'primary') && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-purple-600">Primary Market Zip Codes</h4>
                    <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
                      {markets.find(m => m.market_type === 'primary')?.zip_codes?.map((zip: string) => (
                        <Badge key={zip} variant="secondary">{zip}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Secondary Markets */}
                {markets.find(m => m.market_type === 'secondary') && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 text-amber-600">Secondary Market Zip Codes</h4>
                    <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
                      {markets.find(m => m.market_type === 'secondary')?.zip_codes?.map((zip: string) => (
                        <Badge key={zip} variant="outline">{zip}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
