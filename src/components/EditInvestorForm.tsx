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
    freeze_reason: "",
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
    primary_states: [] as string[],
    primary_zip_codes: "",
    secondary_states: [] as string[],
    secondary_zip_codes: "",
  });

  useEffect(() => {
    if (investor && open) {
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
        freeze_reason: investor.freeze_reason || "",
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
        primary_states: primaryMarket?.states || [],
        primary_zip_codes: primaryMarket?.zip_codes?.join(', ') || "",
        secondary_states: secondaryMarket?.states || [],
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
          freeze_reason: formData.freeze_reason || null,
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

      // Update markets
      const primaryMarket = markets?.find(m => m.market_type === 'primary');
      const secondaryMarket = markets?.find(m => m.market_type === 'secondary');

      if (primaryMarket) {
        await supabase.from('markets').update({
          states: formData.primary_states,
          zip_codes: formData.primary_zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        }).eq('id', primaryMarket.id);
      } else if (formData.primary_states.length > 0 || formData.primary_zip_codes) {
        await supabase.from('markets').insert({
          investor_id: investor.id,
          market_type: 'primary',
          states: formData.primary_states,
          zip_codes: formData.primary_zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        });
      }

      if (secondaryMarket) {
        await supabase.from('markets').update({
          states: formData.secondary_states,
          zip_codes: formData.secondary_zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        }).eq('id', secondaryMarket.id);
      } else if (formData.secondary_states.length > 0 || formData.secondary_zip_codes) {
        await supabase.from('markets').insert({
          investor_id: investor.id,
          market_type: 'secondary',
          states: formData.secondary_states,
          zip_codes: formData.secondary_zip_codes.split(',').map(z => z.trim()).filter(Boolean),
        });
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

  const renderStep1 = () => (
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
    </div>
  );

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
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="primary_states">Primary Markets - States (comma-separated)</Label>
        <Input
          id="primary_states"
          placeholder="e.g., TX, FL, CA"
          value={formData.primary_states.join(', ')}
          onChange={(e) => updateField('primary_states', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        />
      </div>
      <div>
        <Label htmlFor="primary_zips">Primary Markets - Zip Codes (comma-separated)</Label>
        <Textarea
          id="primary_zips"
          placeholder="e.g., 78701, 78702, 78703"
          value={formData.primary_zip_codes}
          onChange={(e) => updateField('primary_zip_codes', e.target.value)}
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="secondary_states">Secondary Markets - States</Label>
        <Input
          id="secondary_states"
          placeholder="e.g., NY, NJ, PA"
          value={formData.secondary_states.join(', ')}
          onChange={(e) => updateField('secondary_states', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
        />
      </div>
      <div>
        <Label htmlFor="secondary_zips">Secondary Markets - Zip Codes</Label>
        <Textarea
          id="secondary_zips"
          placeholder="e.g., 10001, 10002"
          value={formData.secondary_zip_codes}
          onChange={(e) => updateField('secondary_zip_codes', e.target.value)}
          rows={3}
        />
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
