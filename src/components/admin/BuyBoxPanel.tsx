import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Checkbox } from "@/components/ui/checkbox";
import { PROPERTY_TYPES, CONDITION_TYPES, ON_MARKET_STATUS, LEAD_TYPES, TIMEFRAME } from "@/lib/buyBoxConstants";

type BuyBox = Database["public"]["Tables"]["buy_box"]["Row"];

interface BuyBoxPanelProps {
  investorId: string | null;
  investorName: string | null;
  buyBox: BuyBox | null;
}

export const BuyBoxPanel = ({ investorId, investorName, buyBox }: BuyBoxPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<BuyBox>>({});

  useEffect(() => {
    if (buyBox) {
      setFormData(buyBox);
    } else {
      setFormData({});
    }
  }, [buyBox]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<BuyBox>) => {
      if (!investorId) throw new Error("No investor selected");

      if (buyBox) {
        const { error } = await supabase
          .from("buy_box")
          .update(data)
          .eq("id", buyBox.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("buy_box")
          .insert({ ...data, investor_id: investorId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-relations", investorId] });
      toast({ title: "Buy box saved successfully" });
    },
    onError: (error) => {
      toast({ title: "Error saving buy box", description: String(error), variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  if (!investorId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select an investor to view/edit buy box
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Buy Box</h3>
        <p className="text-sm text-muted-foreground">for: {investorName}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Year Built Min</Label>
            <Input
              type="number"
              value={formData.year_built_min || ""}
              onChange={(e) =>
                setFormData({ ...formData, year_built_min: e.target.value ? parseInt(e.target.value) : null })
              }
              placeholder="e.g. 1980"
            />
          </div>
          <div>
            <Label>Year Built Max</Label>
            <Input
              type="number"
              value={formData.year_built_max || ""}
              onChange={(e) =>
                setFormData({ ...formData, year_built_max: e.target.value ? parseInt(e.target.value) : null })
              }
              placeholder="e.g. 2020"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Price Min ($)</Label>
            <Input
              type="number"
              value={formData.price_min || ""}
              onChange={(e) =>
                setFormData({ ...formData, price_min: e.target.value ? parseFloat(e.target.value) : null })
              }
              placeholder="e.g. 50000"
            />
          </div>
          <div>
            <Label>Price Max ($)</Label>
            <Input
              type="number"
              value={formData.price_max || ""}
              onChange={(e) =>
                setFormData({ ...formData, price_max: e.target.value ? parseFloat(e.target.value) : null })
              }
              placeholder="e.g. 200000"
            />
          </div>
        </div>

        <div>
          <Label>Property Types</Label>
          <div className="space-y-2 mt-2">
            {PROPERTY_TYPES.map(type => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  checked={(formData.property_types || []).includes(type)}
                  onCheckedChange={(checked) => {
                    const current = formData.property_types || [];
                    setFormData({
                      ...formData,
                      property_types: checked
                        ? [...current, type]
                        : current.filter(t => t !== type)
                    });
                  }}
                />
                <Label className="font-normal text-sm">{type}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Property Condition</Label>
          <div className="space-y-2 mt-2">
            {CONDITION_TYPES.map(condition => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  checked={(formData.condition_types || []).includes(condition)}
                  onCheckedChange={(checked) => {
                    const current = formData.condition_types || [];
                    setFormData({
                      ...formData,
                      condition_types: checked
                        ? [...current, condition]
                        : current.filter(c => c !== condition)
                    });
                  }}
                />
                <Label className="font-normal text-sm">{condition}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>On-Market Status</Label>
          <div className="space-y-2 mt-2">
            {ON_MARKET_STATUS.map(status => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  checked={(formData.on_market_status || []).includes(status)}
                  onCheckedChange={(checked) => {
                    const current = formData.on_market_status || [];
                    setFormData({
                      ...formData,
                      on_market_status: checked
                        ? [...current, status]
                        : current.filter(s => s !== status)
                    });
                  }}
                />
                <Label className="font-normal text-sm">{status}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Lead Types</Label>
          <div className="space-y-2 mt-2">
            {LEAD_TYPES.map(leadType => (
              <div key={leadType} className="flex items-center space-x-2">
                <Checkbox
                  checked={(formData.lead_types || []).includes(leadType)}
                  onCheckedChange={(checked) => {
                    const current = formData.lead_types || [];
                    setFormData({
                      ...formData,
                      lead_types: checked
                        ? [...current, leadType]
                        : current.filter(t => t !== leadType)
                    });
                  }}
                />
                <Label className="font-normal text-sm">{leadType}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Purchase Timeframe</Label>
          <div className="space-y-2 mt-2">
            {TIMEFRAME.map(time => (
              <div key={time} className="flex items-center space-x-2">
                <Checkbox
                  checked={(formData.timeframe || []).includes(time)}
                  onCheckedChange={(checked) => {
                    const current = formData.timeframe || [];
                    setFormData({
                      ...formData,
                      timeframe: checked
                        ? [...current, time]
                        : current.filter(t => t !== time)
                    });
                  }}
                />
                <Label className="font-normal text-sm">{time}</Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes about buy box criteria..."
            rows={4}
          />
        </div>
      </div>

      <div className="p-4 border-t">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {buyBox ? "Update Buy Box" : "Create Buy Box"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
