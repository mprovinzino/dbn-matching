import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export async function loadFullDmaData() {
  try {
    toast({
      title: "Loading DMA Data",
      description: "Fetching and processing Excel file...",
    });

    // Fetch the Excel file from the project
    const response = await fetch('/data/DMA_Zipcodes.xlsx');
    if (!response.ok) {
      throw new Error(`Failed to fetch DMA Excel: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel file
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Process data - skip header rows and filter valid entries
    const dmaRecords = jsonData
      .slice(1) // Skip first row (header)
      .filter((row: any) => {
        // Filter out rows that don't have valid zip codes
        return row[0] && row[1] && row[2] && !row[0].toString().includes('Method');
      })
      .map((row: any) => ({
        zip_code: String(row[0]).padStart(5, '0'),
        dma_code: String(row[1]),
        dma_description: String(row[2])
      }));

    console.log(`Parsed ${dmaRecords.length} DMA records from Excel`);

    toast({
      title: "Uploading to Database",
      description: `Processing ${dmaRecords.length} zip codes...`,
    });

    // Send to edge function for processing
    const { data, error } = await supabase.functions.invoke('seed-dma-reference-data', {
      body: dmaRecords
    });

    if (error) {
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to load DMA data');
    }

    toast({
      title: "Success!",
      description: `Loaded ${data.imported} zip codes across ${data.unique_dmas} DMAs`,
    });

    return data;
    
  } catch (error: any) {
    console.error('Error loading DMA data:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to load DMA data",
      variant: "destructive",
    });
    throw error;
  }
}
