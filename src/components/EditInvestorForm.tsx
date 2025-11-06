import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { investorFormSchema } from "@/lib/investorValidation";

interface EditInvestorFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  investor: any;
  buyBox: any;
  markets: any[];
}

export function EditInvestorForm({ open, onClose, onSuccess, investor, buyBox, markets }: EditInvestorFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    company_name: "",
    main_poc: "",
    hubspot_url: "",
    coverage_type: "local" as "local" | "multi_state" | "national" | "state",
    tier: 1,
    weekly_cap: 0,
    cold_accepts: false,
    offer_types: [] as string[],
    tags: [] as string[],
    status: 'active' as 'active' | 'paused' | 'test' | 'inactive',
    status_reason: "",
    property_types: [] as string[],
    on_market_status: [] as string[],
    year_built_min: undefined as number | undefined,
    year_built_max: undefined as number | undefined,
    price_min: undefined as number | undefined,
    price_max: undefined as number | undefined,
    condition_types: [] as string[],
    timeframe: [] as string[],
    lead_types: [] as string[],
    buy_box_notes: "",
    full_coverage_states: "",
    direct_purchase_markets: "",
    primary_zip_codes: "",
    secondary_zip_codes: "",
  });

  useEffect(() => {
    if (investor && open) {
      const fullCoverageMarket = markets?.find(m => m.market_type === 'full_coverage');
      const directPurchaseMarket = markets?.find(m => m.market_type === 'direct_purchase');
      const primaryMarket = markets?.find(m => m.market_type === 'primary');
      const secondaryMarket = markets?.find(m => m.market_type === 'secondary');

      setFormData({
        company_name: investor.company_name || "",
        main_poc: investor.main_poc || "",
        hubspot_url: investor.hubspot_url || "",
        coverage_type: investor.coverage_type || "local",
        tier: investor.tier || 1,
        weekly_cap: investor.weekly_cap || 0,
        cold_accepts: investor.cold_accepts || false,
        offer_types: investor.offer_types || [],
        tags: investor.tags || [],
        status: investor.status || 'active',
        status_reason: investor.status_reason || "",
        property_types: buyBox?.property_types || [],
        on_market_status: buyBox?.on_market_status || [],
        year_built_min: buyBox?.year_built_min,
        year_built_max: buyBox?.year_built_max,
        price_min: buyBox?.price_min,
        price_max: buyBox?.price_max,
        condition_types: buyBox?.condition_types || [],
        timeframe: buyBox?.timeframe || [],
        lead_types: buyBox?.lead_types || [],
        buy_box_notes: buyBox?.notes || "",
        full_coverage_states: fullCoverageMarket?.states?.join(', ') || "",
        direct_purchase_markets: [
          ...(directPurchaseMarket?.states || []),
          ...(directPurchaseMarket?.zip_codes || [])
        ].join(', ') || "",
        primary_zip_codes: primaryMarket?.zip_codes?.join(', ') || "",
        secondary_zip_codes: secondaryMarket?.zip_codes?.join(', ') || "",
      });
    }
  }, [investor, buyBox, markets, open]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: keyof typeof formData, value: string) => {
    const currentValue = formData[field];
    if (Array.isArray(currentValue)) {
      setFormData(prev => ({
        ...prev,
        [field]: currentValue.includes(value)
          ? currentValue.filter((v: string) => v !== value)
          : [...currentValue, value]
      }));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate form data
      const validation = investorFormSchema.safeParse(formData);
      if (!validation.success) {
        const firstError = validation.error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Update investor
      const { error: investorError } = await supabase
        .from('investors')
        .update({
          company_name: formData.company_name,
          main_poc: formData.main_poc,
          hubspot_url: formData.hubspot_url || null,
          coverage_type: formData.coverage_type,
          tier: formData.tier,
          weekly_cap: formData.weekly_cap,
          cold_accepts: formData.cold_accepts,
          offer_types: formData.offer_types,
          tags: formData.tags,
          status: formData.status,
          status_reason: formData.status_reason || null,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', investor.id);

      if (investorError) throw investorError;

      // Update buy box
      if (buyBox) {
        await supabase.from('buy_box').update({
          property_types: formData.property_types,
          on_market_status: formData.on_market_status,
          year_built_min: formData.year_built_min,
          year_built_max: formData.year_built_max,
          price_min: formData.price_min,
          price_max: formData.price_max,
          condition_types: formData.condition_types,
          timeframe: formData.timeframe,
          lead_types: formData.lead_types,
          notes: formData.buy_box_notes,
        }).eq('investor_id', investor.id);
      }

      // Update markets - delete all existing and recreate
      await supabase.from('markets').delete().eq('investor_id', investor.id);

      const marketInserts = [];

      // Full coverage states
      if (formData.full_coverage_states) {
        // Split by comma or space, trim, and filter out empty strings
        const states = formData.full_coverage_states
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(Boolean)
          .filter(s => /^[A-Z]{2}$/.test(s)); // Ensure it's a valid 2-letter state code
        
        if (states.length > 0) {
          marketInserts.push({
            investor_id: investor.id,
            market_type: 'full_coverage',
            states,
            zip_codes: [],
          });
        }
      }

      // Direct purchase markets
      if (formData.direct_purchase_markets) {
        // Split by comma or space, trim, and filter out empty strings
        const items = formData.direct_purchase_markets
          .split(/[,\s]+/)
          .map(s => s.trim())
          .filter(Boolean);
        
        const states = items.filter(item => item.length === 2 && /^[A-Z]{2}$/.test(item));
        const zips = items.filter(item => /^\d{5}$/.test(item));
        
        if (states.length > 0 || zips.length > 0) {
          marketInserts.push({
            investor_id: investor.id,
            market_type: 'direct_purchase',
            states,
            zip_codes: zips,
          });
        }
      }

      // Primary markets
      if (formData.primary_zip_codes) {
        // Split by comma, space, or newline, trim, and filter out empty strings
        const zips = formData.primary_zip_codes
          .split(/[,\s\n]+/)
          .map(z => z.trim())
          .filter(Boolean)
          .filter(z => /^\d{5}$/.test(z)); // Ensure it's a valid 5-digit zip code
        
        if (zips.length > 0) {
          marketInserts.push({
            investor_id: investor.id,
            market_type: 'primary',
            states: [],
            zip_codes: zips,
          });
        }
      }

      // Secondary markets
      if (formData.secondary_zip_codes) {
        // Split by comma, space, or newline, trim, and filter out empty strings
        const zips = formData.secondary_zip_codes
          .split(/[,\s\n]+/)
          .map(z => z.trim())
          .filter(Boolean)
          .filter(z => /^\d{5}$/.test(z)); // Ensure it's a valid 5-digit zip code
        
        if (zips.length > 0) {
          marketInserts.push({
            investor_id: investor.id,
            market_type: 'secondary',
            states: [],
            zip_codes: zips,
          });
        }
      }

      if (marketInserts.length > 0) {
        await supabase.from('markets').insert(marketInserts);
      }

      toast({
        title: "Investor Updated",
        description: "Successfully updated investor information",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating investor:', error);
      toast({
        title: "Error",
        description: "Failed to update investor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => {
    const statusReasons = [
      'Portal Updates',
      'Waiting on Referral Agreement',
      'Poor Performance',
      'Requested to be Removed',
      'Out of Town',
      'Change of company owner',
      'Need to Get a Response/call',
      'Custom'
    ];

    const businessTags = [
      'Direct Purchase',
      'Wholesale',
      'Local',
      'Direct to Consumer',
      'Seller Finance Buyer',
      'Novations',
      'Sub-2s',
    ];

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="company_name">Company Name *</Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => updateField('company_name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="main_poc">Main POC *</Label>
          <Input
            id="main_poc"
            value={formData.main_poc}
            onChange={(e) => updateField('main_poc', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="hubspot_url">HubSpot URL</Label>
          <Input
            id="hubspot_url"
            type="url"
            value={formData.hubspot_url}
            onChange={(e) => updateField('hubspot_url', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="coverage_type">Coverage Type *</Label>
          <Select value={formData.coverage_type} onValueChange={(v) => updateField('coverage_type', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="state">State</SelectItem>
              <SelectItem value="multi_state">Multi-State</SelectItem>
              <SelectItem value="national">National</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tier">Tier (1-10) *</Label>
            <Input
              id="tier"
              type="number"
              min={1}
              max={10}
              value={formData.tier}
              onChange={(e) => updateField('tier', parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="weekly_cap">Weekly Cap</Label>
            <Input
              id="weekly_cap"
              type="number"
              value={formData.weekly_cap}
              onChange={(e) => updateField('weekly_cap', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="status">Investor Status *</Label>
          <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(formData.status === 'paused' || formData.status === 'inactive') && (
          <div>
            <Label htmlFor="status_reason">Status Reason</Label>
            <Select 
              value={statusReasons.includes(formData.status_reason) ? formData.status_reason : 'Custom'}
              onValueChange={(v) => {
                if (v !== 'Custom') {
                  updateField('status_reason', v);
                } else {
                  updateField('status_reason', '');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!statusReasons.includes(formData.status_reason) || formData.status_reason === 'Custom') && (
              <Input
                placeholder="Enter custom reason"
                className="mt-2"
                value={formData.status_reason === 'Custom' ? '' : formData.status_reason}
                onChange={(e) => updateField('status_reason', e.target.value)}
              />
            )}
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="cold_accepts"
            checked={formData.cold_accepts}
            onCheckedChange={(checked) => updateField('cold_accepts', checked)}
          />
          <Label htmlFor="cold_accepts" className="font-normal">Accepts Cold Leads</Label>
        </div>

        <div>
          <Label>Investment Strategy</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {['Direct Purchase', 'Wholesale', 'Novation', 'Creative / Seller Finance', 'Sub To'].map((strategy) => (
              <div key={strategy} className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.offer_types.includes(strategy)}
                  onCheckedChange={() => toggleArrayField('offer_types', strategy)}
                />
                <Label className="font-normal text-sm">{strategy}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <Label>Property Types</Label>
        <div className="space-y-2 mt-2">
          {['Single Family Residence', 'Condominiums', 'Townhomes', 'Multi-Family (2-4 units)', 'Multi-Family (5+ units)', 'Land', 'Mobile Home'].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                checked={formData.property_types.includes(type)}
                onCheckedChange={() => toggleArrayField('property_types', type)}
              />
              <Label className="font-normal">{type}</Label>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>On-Market Status</Label>
        <div className="space-y-2 mt-2">
          {['Off Market Only', 'FSBO', 'Listed on MLS', 'Any'].map(status => (
            <div key={status} className="flex items-center space-x-2">
              <Checkbox
                checked={formData.on_market_status.includes(status)}
                onCheckedChange={() => toggleArrayField('on_market_status', status)}
              />
              <Label className="font-normal">{status}</Label>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="year_min">Year Built Min</Label>
          <Input
            id="year_min"
            type="number"
            value={formData.year_built_min || ''}
            onChange={(e) => updateField('year_built_min', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="year_max">Year Built Max</Label>
          <Input
            id="year_max"
            type="number"
            value={formData.year_built_max || ''}
            onChange={(e) => updateField('year_built_max', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price_min">Min Price ($)</Label>
          <Input
            id="price_min"
            type="number"
            value={formData.price_min || ''}
            onChange={(e) => updateField('price_min', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
        <div>
          <Label htmlFor="price_max">Max Price ($)</Label>
          <Input
            id="price_max"
            type="number"
            value={formData.price_max || ''}
            onChange={(e) => updateField('price_max', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div>
        <Label>Property Condition</Label>
        <div className="space-y-2 mt-2">
          {['Move in Ready with newer finishes', 'Move in Ready with Older Finishes', 'Needs Few Repairs', 'Needs Major Repairs'].map(condition => (
            <div key={condition} className="flex items-center space-x-2">
              <Checkbox
                checked={formData.condition_types.includes(condition)}
                onCheckedChange={() => toggleArrayField('condition_types', condition)}
              />
              <Label className="font-normal">{condition}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Purchase Timeframe</Label>
        <div className="space-y-2 mt-2">
          {['Immediate (0-30 days)', '1-3 months', '3-6 months', '6-12 months', '12+ months', 'Flexible'].map(time => (
            <div key={time} className="flex items-center space-x-2">
              <Checkbox
                checked={formData.timeframe.includes(time)}
                onCheckedChange={() => toggleArrayField('timeframe', time)}
              />
              <Label className="font-normal">{time}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="full_coverage_states">Full Coverage States (comma-separated)</Label>
        <Input
          id="full_coverage_states"
          placeholder="FL, GA, TX"
          value={formData.full_coverage_states}
          onChange={(e) => updateField('full_coverage_states', e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">States where investor accepts leads from any zip code</p>
      </div>
      
      <div>
        <Label htmlFor="direct_purchase_markets">Direct Purchase Markets (comma-separated states/zips)</Label>
        <Input
          id="direct_purchase_markets"
          placeholder="FL, 33914, 33901"
          value={formData.direct_purchase_markets}
          onChange={(e) => updateField('direct_purchase_markets', e.target.value)}
        />
        <p className="text-sm text-muted-foreground mt-1">Markets where investor buys properties directly (not wholesale/novation)</p>
      </div>

      <div>
        <Label htmlFor="primary_zips">Primary Market Zip Codes (comma-separated)</Label>
        <Textarea
          id="primary_zips"
          placeholder="33914, 33901, 33908"
          value={formData.primary_zip_codes}
          onChange={(e) => updateField('primary_zip_codes', e.target.value)}
          rows={3}
        />
        <p className="text-sm text-muted-foreground mt-1">Specific zip codes they actively cover as primary markets</p>
      </div>
      
      <div>
        <Label htmlFor="secondary_zips">Secondary Market Zip Codes (comma-separated)</Label>
        <Textarea
          id="secondary_zips"
          placeholder="28001, 28002"
          value={formData.secondary_zip_codes}
          onChange={(e) => updateField('secondary_zip_codes', e.target.value)}
          rows={3}
        />
        <p className="text-sm text-muted-foreground mt-1">Zip codes they cover as secondary priority markets</p>
      </div>

      <div>
        <Label htmlFor="buy_box_notes">Additional Notes</Label>
        <Textarea
          id="buy_box_notes"
          value={formData.buy_box_notes}
          onChange={(e) => updateField('buy_box_notes', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Investor - Step {step} of 3</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={loading}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !formData.company_name || !formData.main_poc}>
              {loading ? 'Updating...' : 'Update Investor'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
