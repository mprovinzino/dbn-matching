import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle } from "lucide-react";
import { importDmaZipCodes } from "@/utils/importDmaZipCodes";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DmaImportButton() {
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setShowDialog(true);

    try {
      const result = await importDmaZipCodes(file);
      
      setImportComplete(true);
      toast({
        title: "Import Successful",
        description: `Imported ${result.imported.toLocaleString()} zip codes across ${result.uniqueDmas} DMAs`,
      });

      // Reset after 3 seconds
      setTimeout(() => {
        setShowDialog(false);
        setImportComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Import failed:', error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import DMA data",
        variant: "destructive",
      });
      setShowDialog(false);
    } finally {
      setImporting(false);
      // Clear file input
      event.target.value = '';
    }
  };

  return (
    <>
      <div>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
          id="dma-import-input"
        />
        <label htmlFor="dma-import-input">
          <Button asChild variant="outline" disabled={importing}>
            <span>
              {importing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import DMA Data
            </span>
          </Button>
        </label>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importComplete ? "Import Complete" : "Importing DMA Data"}
            </DialogTitle>
            <DialogDescription>
              {importComplete 
                ? "DMA zip code data has been successfully imported to the database."
                : "Please wait while we import zip code and DMA data..."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-6">
            {importComplete ? (
              <CheckCircle className="h-12 w-12 text-green-500" />
            ) : (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
