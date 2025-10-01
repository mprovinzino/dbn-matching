import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface InvestorDetailModalProps {
  open: boolean;
  onClose: () => void;
  investor: any;
  buyBox: any;
  markets: any[];
}

export function InvestorDetailModal({ 
  open, 
  onClose, 
  investor, 
  buyBox,
  markets 
}: InvestorDetailModalProps) {
  if (!investor) return null;

  const getTierColor = (tier: number) => {
    if (tier <= 3) return "tier-1-3";
    if (tier <= 6) return "tier-4-6";
    return "tier-7-10";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                {investor.company_name}
              </DialogTitle>
              <p className="text-muted-foreground mt-1">{investor.main_poc}</p>
            </div>
            <Badge className={`bg-${getTierColor(investor.tier)}`}>
              Tier {investor.tier}
            </Badge>
          </div>
        </DialogHeader>

        {investor.freeze_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Paused:</strong> {investor.freeze_reason}
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
              <CardContent>
                <Tabs defaultValue={markets[0]?.market_type || 'direct_purchase'}>
                  <TabsList className="grid w-full grid-cols-3">
                    {markets.map((market) => (
                      <TabsTrigger 
                        key={market.id} 
                        value={market.market_type}
                        className="capitalize"
                      >
                        {market.market_type.replace(/_/g, ' ')}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {markets.map((market) => (
                    <TabsContent key={market.id} value={market.market_type} className="space-y-4">
                      {market.states && market.states.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">States</p>
                          <div className="flex gap-1 flex-wrap">
                            {market.states.map((state: string) => (
                              <Badge key={state} variant="outline">{state}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {market.dmas && market.dmas.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">DMAs</p>
                          <div className="flex gap-1 flex-wrap">
                            {market.dmas.map((dma: string) => (
                              <Badge key={dma} variant="outline">{dma}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {market.zip_codes && market.zip_codes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Zip Codes</p>
                          <div className="flex gap-1 flex-wrap max-h-40 overflow-y-auto">
                            {market.zip_codes.map((zip: string) => (
                              <Badge key={zip} variant="outline">{zip}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
