import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Market = Database["public"]["Tables"]["markets"]["Row"];

interface MarketsPanelProps {
  investorId: string | null;
  investorName: string | null;
  markets: Market[];
}

export const MarketsPanel = ({ investorId, investorName, markets }: MarketsPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [deleteMarketId, setDeleteMarketId] = useState<string | null>(null);
  const [newMarket, setNewMarket] = useState<Partial<Market>>({
    market_type: "primary",
    states: [],
    zip_codes: [],
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedMarkets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMarkets(newExpanded);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { market: Partial<Market>; isEdit: boolean; editId?: string }) => {
      if (!investorId) throw new Error("No investor selected");

      if (data.isEdit && data.editId) {
        const { error } = await supabase
          .from("markets")
          .update(data.market)
          .eq("id", data.editId);
        if (error) throw error;
      } else {
        const insertData = { ...data.market, investor_id: investorId } as any;
        const { error } = await supabase.from("markets").insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-relations", investorId] });
      toast({ title: "Market saved successfully" });
      setIsAddDialogOpen(false);
      setEditingMarket(null);
      setNewMarket({ market_type: "primary", states: [], zip_codes: [] });
    },
    onError: (error) => {
      toast({ title: "Error saving market", description: String(error), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const { error } = await supabase.from("markets").delete().eq("id", marketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investor-relations", investorId] });
      toast({ title: "Market deleted successfully" });
      setDeleteMarketId(null);
    },
    onError: (error) => {
      toast({ title: "Error deleting market", description: String(error), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (editingMarket) {
      saveMutation.mutate({ market: newMarket, isEdit: true, editId: editingMarket.id });
    } else {
      saveMutation.mutate({ market: newMarket, isEdit: false });
    }
  };

  const openEditDialog = (market: Market) => {
    setEditingMarket(market);
    setNewMarket(market);
    setIsAddDialogOpen(true);
  };

  if (!investorId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select an investor to view/edit markets
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Markets ({markets.length})</h3>
          <p className="text-sm text-muted-foreground">for: {investorName}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditingMarket(null); setNewMarket({ market_type: "primary", states: [], zip_codes: [] }); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Market
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingMarket ? "Edit Market" : "Add New Market"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Market Type</Label>
                <Select
                  value={newMarket.market_type || "primary"}
                  onValueChange={(value) => setNewMarket({ ...newMarket, market_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary</SelectItem>
                    <SelectItem value="direct_purchase">Direct Purchase</SelectItem>
                    <SelectItem value="full_coverage">Full Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newMarket.market_type === "full_coverage" ? (
                <div>
                  <Label>States (comma-separated)</Label>
                  <Textarea
                    value={(newMarket.states || []).join(", ")}
                    onChange={(e) =>
                      setNewMarket({
                        ...newMarket,
                        states: e.target.value.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
                        zip_codes: [],
                      })
                    }
                    placeholder="e.g. TX, CA, NY"
                    rows={3}
                  />
                </div>
              ) : (
                <div>
                  <Label>ZIP Codes (comma-separated)</Label>
                  <Textarea
                    value={(newMarket.zip_codes || []).join(", ")}
                    onChange={(e) =>
                      setNewMarket({
                        ...newMarket,
                        zip_codes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        states: [],
                      })
                    }
                    placeholder="e.g. 75001, 75002, 75003"
                    rows={6}
                  />
                </div>
              )}

              <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
                {saveMutation.isPending ? "Saving..." : editingMarket ? "Update Market" : "Add Market"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {markets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No markets found. Click "Add Market" to create one.
            </div>
          ) : (
            markets.map((market) => (
              <div key={market.id} className="border rounded-lg p-3 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <button onClick={() => toggleExpanded(market.id)} className="p-1 hover:bg-muted rounded">
                      {expandedMarkets.has(market.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <Badge variant="default">{market.market_type}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {market.market_type === "full_coverage"
                        ? `${(market.states || []).length} states`
                        : `${(market.zip_codes || []).length} zip codes`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(market)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteMarketId(market.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {expandedMarkets.has(market.id) && (
                  <div className="mt-3 pl-8 text-sm space-y-1">
                    {market.market_type === "full_coverage" ? (
                      <div>
                        <div className="font-medium mb-1">States:</div>
                        <div className="flex flex-wrap gap-1">
                          {(market.states || []).map((state) => (
                            <Badge key={state} variant="secondary" className="text-xs">
                              {state}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium mb-1">ZIP Codes:</div>
                        <div className="text-muted-foreground max-h-32 overflow-auto">
                          {(market.zip_codes || []).join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteMarketId} onOpenChange={() => setDeleteMarketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Market?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the market record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMarketId && deleteMutation.mutate(deleteMarketId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
