import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export function DmaDataInstructions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>DMA Reference Data Required</CardTitle>
        <CardDescription>
          The coverage map needs DMA zip code reference data to display properly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Status:</strong> Your database has only 50 sample zip codes loaded. 
            The map needs all ~40,000+ zip codes to show complete coverage.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-2">
          <h4 className="font-semibold">Quick Fix - Option 1 (Recommended):</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Convert your PDF to Excel format (.xlsx) with columns: <code className="bg-muted px-1 py-0.5 rounded">zip_code</code>, <code className="bg-muted px-1 py-0.5 rounded">dma_code</code>, <code className="bg-muted px-1 py-0.5 rounded">dma_description</code></li>
            <li>Click "Import DMA Data" button in the Dashboard header</li>
            <li>Select your Excel file</li>
            <li>Wait 30-60 seconds for import to complete</li>
            <li>Return to Coverage Map to see your data visualized</li>
          </ol>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">Alternative - Option 2:</h4>
          <p className="text-sm text-muted-foreground">
            If you have technical expertise, you can run additional SQL migrations to batch-insert the remaining data. 
            Contact your development team to extend the migration with all zip codes from your PDF.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold">What's Already Done:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>✅ Database table created (<code className="bg-muted px-1 py-0.5 rounded">zip_code_reference</code>)</li>
            <li>✅ Import edge function deployed and ready</li>
            <li>✅ Sample data (50 zip codes) loaded for testing</li>
            <li>✅ State inference logic configured</li>
            <li>⏳ <strong>Pending:</strong> Full dataset import (~40,000 zip codes)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
