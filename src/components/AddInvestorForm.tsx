import { useState } from "react";
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

interface AddInvestorFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInvestorForm({ open, onClose, onSuccess }: AddInvestorFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    company_name: "",
    main_poc: "",
    hubspot_url: "",
    coverage_type: "local" as "local" | "multi_state" | "national" | "state",
    tier: 5,
    weekly_cap: 100,
    cold_accepts: false,
    offer_types: [] as string[],
    tags: [] as string[],
    status: 'test' as 'active' | 'paused' | 'test' | 'inactive',
    status_reason: "",
    // Buy Box
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
    // Markets
    full_coverage_states: "",
    direct_purchase_markets: "",
    primary_zip_codes: "",
    secondary_zip_codes: "",
  });

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

      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Authentication Required",
          description: "You must be logged in to add an investor",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Insert investor
      const { data: investor, error: investorError } = await supabase
        .from('investors')
        .insert([{
          user_id: user.id,
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
        }])
        .select()
        .single();

      if (investorError) throw investorError;

      // Insert buy box
      await supabase.from('buy_box').insert({
        investor_id: investor.id,
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
      });

      // Insert markets
      const marketInserts = [];

      // Full coverage states
      if (formData.full_coverage_states) {
        const states = formData.full_coverage_states
          .split(/[,\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter(Boolean)
          .filter(s => /^[A-Z]{2}$/.test(s));
        
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
        const items = formData.direct_purchase_markets
          .split(/[,\s]+/)
          .map(s => s.trim().toUpperCase())
          .filter(Boolean);
        
        const states = items.filter(item => /^[A-Z]{2}$/.test(item));
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
        const zips = formData.primary_zip_codes
          .split(/[,\s\n]+/)
          .map(z => z.trim())
          .filter(Boolean)
          .filter(z => /^\d{5}$/.test(z));
        
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
        const zips = formData.secondary_zip_codes
          .split(/[,\s\n]+/)
          .map(z => z.trim())
          .filter(Boolean)
          .filter(z => /^\d{5}$/.test(z));
        
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
        title: "Investor Added",
        description: "Successfully added new investor",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding investor:', error);
      toast({
        title: "Error",
        description: "Failed to add investor",
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
      <div>
        <Label htmlFor="status">Investor Status *</Label>
        <Select value={formData.status} onValueChange={(v) => updateField('status', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="test">Test</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
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
      <div className="space-y-2">
        <Label htmlFor="full_coverage_states">Full Coverage States (for national/multi-state investors)</Label>
        <Input
          id="full_coverage_states"
          placeholder="e.g., TX FL CA NY"
          value={formData.full_coverage_states}
          onChange={(e) => updateField('full_coverage_states', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Two-letter state codes, comma or space separated. Investor covers ALL zip codes in these states.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="direct_purchase_markets">Direct Purchase Markets (states or zips)</Label>
        <Textarea
          id="direct_purchase_markets"
          placeholder="e.g., GA 30301 30302 or just GA"
          value={formData.direct_purchase_markets}
          onChange={(e) => updateField('direct_purchase_markets', e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Mix of 2-letter state codes and 5-digit zip codes, comma or space separated.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="primary_zips">Primary Markets - Zip Codes</Label>
        <Textarea
          id="primary_zips"
          placeholder="e.g., 78701 78702 78703"
          value={formData.primary_zip_codes}
          onChange={(e) => updateField('primary_zip_codes', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          5-digit zip codes only, comma/space/newline separated.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="secondary_zips">Secondary Markets - Zip Codes</Label>
        <Textarea
          id="secondary_zips"
          placeholder="e.g., 10001 10002"
          value={formData.secondary_zip_codes}
          onChange={(e) => updateField('secondary_zip_codes', e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          5-digit zip codes only, comma/space/newline separated.
        </p>
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
          <DialogTitle>Add New Investor - Step {step} of 3</DialogTitle>
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
              {loading ? 'Adding...' : 'Add Investor'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
