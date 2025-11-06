import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";

interface ZipCodeManagerProps {
  open: boolean;
  onClose: () => void;
  marketId: string;
  marketType: "primary" | "direct_purchase";
  currentZipCodes: string[];
  onUpdate: () => void;
  referenceSheetUrls?: string[];
}

export function ZipCodeManager({
  open,
  onClose,
  marketId,
  marketType,
  currentZipCodes,
  onUpdate,
  referenceSheetUrls = [],
}: ZipCodeManagerProps) {
  const [rawText, setRawText] = useState("");
  const [validZips, setValidZips] = useState<string[]>([]);
  const [invalidZips, setInvalidZips] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && currentZipCodes.length > 0) {
      setRawText(currentZipCodes.join(", "));
    }
  }, [open, currentZipCodes]);

  const validateZipCodes = async (zipCodes: string[]) => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase
        .from("zip_code_reference")
        .select("zip_code")
        .in("zip_code", zipCodes);

      if (error) throw error;

      const validCodes = data.map((row) => row.zip_code);
      const valid = zipCodes.filter((zip) => validCodes.includes(zip));
      const invalid = zipCodes.filter((zip) => !validCodes.includes(zip));

      setValidZips(valid.sort());
      setInvalidZips(invalid);
    } catch (error) {
      console.error("Error validating zip codes:", error);
      toast({
        title: "Validation Error",
        description: "Failed to validate zip codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const parseZipCodes = (text: string): string[] => {
    // Extract all 5-digit numbers
    const matches = text.match(/\b\d{5}\b/g) || [];
    // Remove duplicates
    const unique = [...new Set(matches)];
    return unique;
  };

  useEffect(() => {
    const zipCodes = parseZipCodes(rawText);
    if (zipCodes.length > 0) {
      validateZipCodes(zipCodes);
    } else {
      setValidZips([]);
      setInvalidZips([]);
    }
  }, [rawText]);

  const handleSave = async () => {
    if (validZips.length === 0) {
      toast({
        title: "No Valid Zip Codes",
        description: "Please add at least one valid zip code.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("markets")
        .update({ zip_codes: validZips })
        .eq("id", marketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${validZips.length} zip codes.`,
      });

      onUpdate();
      handleClose();
    } catch (error) {
      console.error("Error saving zip codes:", error);
      toast({
        title: "Error",
        description: "Failed to save zip codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setRawText("");
    setValidZips([]);
    setInvalidZips([]);
    onClose();
  };

  const handleClear = () => {
    setRawText("");
  };

  const marketTypeLabel = {
    primary: "Primary Market",
    direct_purchase: "Direct Purchase",
  }[marketType];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Zip Codes - {marketTypeLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {referenceSheetUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Reference Sheets:</p>
              <div className="space-y-1">
                {referenceSheetUrls.map((url, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Zip Code Sheet {idx + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Paste zip codes below (comma, space, or line-separated):
            </p>
            <Textarea
              placeholder="75001, 75002, 75003&#10;or&#10;75001 75002 75003&#10;or&#10;75001&#10;75002&#10;75003"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating zip codes...
            </div>
          )}

          {!isValidating && (validZips.length > 0 || invalidZips.length > 0) && (
            <div className="space-y-2">
              {validZips.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-semibold">{validZips.length} valid zip codes</span> detected
                  </AlertDescription>
                </Alert>
              )}

              {invalidZips.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">{invalidZips.length} invalid codes removed:</p>
                      <p className="text-xs font-mono">{invalidZips.join(", ")}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
            {validZips.length > 0 && (
              <Badge variant="secondary">{validZips.length} codes ready to save</Badge>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || validZips.length === 0}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Zip Codes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
