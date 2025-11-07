import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseGoogleSheetRow, ParsedSheetRow } from "@/utils/parseGoogleSheetRow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";

interface QuickAddFromSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickAddFromSheet({ open, onClose, onSuccess }: QuickAddFromSheetProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedSheetRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleParse = () => {
    try {
      const parsed = parseGoogleSheetRow(rawText);
      setParsedData(parsed);
      setStep(2);
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse the row. Make sure you copied the entire row with all columns.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert investor
      const { data: investor, error: investorError } = await supabase
        .from("investors")
        .insert({
          user_id: user.id,
          company_name: parsedData.company_name,
          main_poc: parsedData.poc_name,
          tier: parsedData.tier,
          weekly_cap: parsedData.weekly_cap,
          cold_accepts: parsedData.cold_accepts,
          coverage_type: parsedData.coverage_type,
          status: "active",
          tags: [],
          offer_types: [],
        })
        .select()
        .single();

      if (investorError) throw investorError;

      // Insert buy_box
      const { error: buyBoxError } = await supabase
        .from("buy_box")
        .insert({
          investor_id: investor.id,
          property_types: parsedData.property_types,
          lead_types: parsedData.lead_types,
          year_built_min: parsedData.year_built_min,
          year_built_max: parsedData.year_built_max,
          condition_types: parsedData.condition_types,
          price_min: parsedData.price_min,
          price_max: parsedData.price_max,
          timeframe: parsedData.timeframe,
          notes: parsedData.notes,
        });

      if (buyBoxError) throw buyBoxError;

      // Insert markets
      const marketInserts = [];
      
      if (parsedData.primary_states.length > 0) {
        marketInserts.push({
          investor_id: investor.id,
          market_type: "primary",
          states: parsedData.primary_states,
          zip_codes: [],
        });
      }

      if (parsedData.secondary_states.length > 0) {
        marketInserts.push({
          investor_id: investor.id,
          market_type: "full_coverage",
          states: parsedData.secondary_states,
          zip_codes: [],
        });
      }

      if (parsedData.direct_purchase_states.length > 0) {
        marketInserts.push({
          investor_id: investor.id,
          market_type: "direct_purchase",
          states: parsedData.direct_purchase_states,
          zip_codes: [],
        });
      }

      if (marketInserts.length > 0) {
        const { error: marketsError } = await supabase
          .from("markets")
          .insert(marketInserts);

        if (marketsError) throw marketsError;
      }

      // Insert documents
      const documentInserts = [];

      parsedData.primary_zip_sheet_urls.forEach((url, idx) => {
        documentInserts.push({
          investor_id: investor.id,
          document_type: "primary_zips",
          url,
          label: `Primary Zip Sheet ${idx + 1}`,
        });
      });

      parsedData.past_experience_urls.forEach((url, idx) => {
        documentInserts.push({
          investor_id: investor.id,
          document_type: "past_experience",
          url,
          label: `Experience Doc ${idx + 1}`,
        });
      });

      if (documentInserts.length > 0) {
        const { error: documentsError } = await supabase
          .from("investor_documents")
          .insert(documentInserts);

        if (documentsError) throw documentsError;
      }

      toast({
        title: "Success",
        description: `${parsedData.company_name} has been added to your network.`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error saving investor:", error);
      toast({
        title: "Error",
        description: "Failed to save investor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setRawText("");
    setParsedData(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Quick Add from Google Sheet" : "Review Parsed Data"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Instructions:</strong>
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                <li>Open your Google Sheet</li>
                <li>Select the entire row (click the row number)</li>
                <li>Copy the row (Cmd+C or Ctrl+C)</li>
                <li>Paste it into the box below</li>
              </ol>
            </div>

            <Textarea
              placeholder="Paste the entire row here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[200px] font-mono text-xs"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleParse} disabled={!rawText.trim()}>
                Parse & Preview →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {parsedData && (
              <>
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{parsedData.company_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {parsedData.poc_name} • {parsedData.poc_email}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">Tier {parsedData.tier}</Badge>
                        <Badge variant="outline">Cap: {parsedData.weekly_cap}/week</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Markets</p>
                        <div className="space-y-1 text-sm">
                          {parsedData.primary_states.length > 0 && (
                            <div>
                              <span className="font-medium">Primary:</span> {parsedData.primary_states.join(", ")}
                            </div>
                          )}
                          {parsedData.secondary_states.length > 0 && (
                            <div>
                              <span className="font-medium">Full Coverage:</span>{" "}
                              {parsedData.secondary_states.includes("ALL_OTHER_STATES")
                                ? "All other states"
                                : parsedData.secondary_states.join(", ")}
                            </div>
                          )}
                          {parsedData.direct_purchase_states.length > 0 && (
                            <div>
                              <span className="font-medium">Direct Purchase:</span>{" "}
                              {parsedData.direct_purchase_states.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Buy Box</p>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Property Types:</span>{" "}
                            {parsedData.property_types.length} types
                          </div>
                          {parsedData.year_built_min && parsedData.year_built_max && (
                            <div>
                              <span className="font-medium">Year:</span> {parsedData.year_built_min}-
                              {parsedData.year_built_max}
                            </div>
                          )}
                          {parsedData.price_min && parsedData.price_max && (
                            <div>
                              <span className="font-medium">Price:</span> $
                              {parsedData.price_min.toLocaleString()}-$
                              {parsedData.price_max.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(parsedData.primary_zip_sheet_urls.length > 0 ||
                      parsedData.past_experience_urls.length > 0) && (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Documents:</span>
                          {parsedData.primary_zip_sheet_urls.length > 0 && (
                            <Badge variant="secondary">
                              {parsedData.primary_zip_sheet_urls.length} Zip Sheets
                            </Badge>
                          )}
                          {parsedData.past_experience_urls.length > 0 && (
                            <Badge variant="secondary">
                              {parsedData.past_experience_urls.length} Experience Docs
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm">
                    Ready to save! You can add zip codes later from the investor detail view.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Investor"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
