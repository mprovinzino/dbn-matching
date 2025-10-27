import * as XLSX from 'xlsx';

// This utility generates an Excel file from the parsed PDF DMA data
// Run this once to create the importable Excel file

export function generateDmaExcelFile() {
  // Sample data structure - replace with full parsed PDF data
  const dmaData = [
    { zip_code: '01001', dma_code: '543', dma_description: 'SPRINGFIELD - HOLYOKE', Sales_Territory: 'Midwest' },
    { zip_code: '01002', dma_code: '543', dma_description: 'SPRINGFIELD - HOLYOKE', Sales_Territory: 'Midwest' },
    // Add all 40,000+ rows here from PDF parsing
  ];

  const worksheet = XLSX.utils.json_to_sheet(dmaData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DMA Data');
  
  // Download file
  XLSX.writeFile(workbook, 'DMA_Zipcodes.xlsx');
}
