import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { parseGoogleSheetRow } from '@/utils/parseGoogleSheetRow';
import { CheckCircle2, XCircle, AlertCircle, Upload, Loader2 } from 'lucide-react';

interface ParsedRow {
  rowNumber: number;
  data: any;
  status: 'valid' | 'warning' | 'error' | 'duplicate';
  messages: string[];
  existingInvestorId?: string;
}

export function BatchSheetImport() {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; updated: number; failed: number }>({
    success: 0,
    updated: 0,
    failed: 0
  });
  const { toast } = useToast();

  const handleParse = async () => {
    setLoading(true);
    try {
      const lines = rawText.trim().split('\n').filter(line => line.trim());
      const rows: ParsedRow[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const rowNumber = i + 1;

        try {
          const data = parseGoogleSheetRow(line);
          const messages: string[] = [];
          let status: 'valid' | 'warning' | 'error' | 'duplicate' = 'valid';

          if (!data.company_name || data.company_name.trim() === '') {
            status = 'error';
            messages.push('Company name is required');
          }

          if (!data.poc_name || data.poc_name.trim() === '') {
            status = 'warning';
            messages.push('Main POC is missing');
          }

          if (!data.tier || data.tier < 1) {
            status = 'error';
            messages.push('Valid tier is required');
          }

          const { data: existing, error } = await supabase
            .from('investors')
            .select('id, company_name')
            .ilike('company_name', data.company_name)
            .maybeSingle();

          if (existing) {
            status = 'duplicate';
            messages.push(`Exists as "${existing.company_name}" - will update`);
          }

          rows.push({
            rowNumber,
            data,
            status,
            messages,
            existingInvestorId: existing?.id
          });
        } catch (error) {
          rows.push({
            rowNumber,
            data: null,
            status: 'error',
            messages: [`Failed to parse: ${error.message}`]
          });
        }
      }

      setParsedRows(rows);
      setStep(2);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Parse Error',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    let successCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const row of parsedRows) {
        if (row.status === 'error' || !row.data) {
          failedCount++;
          continue;
        }

        try {
          if (row.existingInvestorId) {
            const { error: updateError } = await supabase
              .from('investors')
              .update({
                company_name: row.data.company_name,
                main_poc: row.data.poc_name,
                tier: row.data.tier,
                weekly_cap: row.data.weekly_cap || 0,
                cold_accepts: row.data.cold_accepts,
                coverage_type: row.data.coverage_type,
                updated_at: new Date().toISOString()
              })
              .eq('id', row.existingInvestorId);

            if (updateError) throw updateError;

            const { error: buyBoxError } = await supabase
              .from('buy_box')
              .upsert({
                investor_id: row.existingInvestorId,
                property_types: row.data.property_types,
                lead_types: row.data.lead_types,
                condition_types: row.data.condition_types,
                timeframe: row.data.timeframe,
                year_built_min: row.data.year_built_min,
                year_built_max: row.data.year_built_max,
                price_min: row.data.price_min,
                price_max: row.data.price_max,
                notes: row.data.notes
              });

            if (buyBoxError) throw buyBoxError;

            await supabase
              .from('markets')
              .delete()
              .eq('investor_id', row.existingInvestorId);

            const marketsToInsert = [];
            if (row.data.primary_states.length > 0) {
              marketsToInsert.push({
                investor_id: row.existingInvestorId,
                market_type: 'primary',
                states: row.data.primary_states
              });
            }
            if (row.data.secondary_states.length > 0) {
              marketsToInsert.push({
                investor_id: row.existingInvestorId,
                market_type: 'secondary',
                states: row.data.secondary_states
              });
            }
            if (row.data.direct_purchase_states.length > 0) {
              marketsToInsert.push({
                investor_id: row.existingInvestorId,
                market_type: 'direct_purchase',
                states: row.data.direct_purchase_states
              });
            }

            if (marketsToInsert.length > 0) {
              const { error: marketsError } = await supabase
                .from('markets')
                .insert(marketsToInsert);
              if (marketsError) throw marketsError;
            }

            updatedCount++;
          } else {
            const { data: newInvestor, error: investorError } = await supabase
              .from('investors')
              .insert({
                user_id: user.id,
                company_name: row.data.company_name,
                main_poc: row.data.poc_name,
                tier: row.data.tier,
                weekly_cap: row.data.weekly_cap || 0,
                cold_accepts: row.data.cold_accepts,
                coverage_type: row.data.coverage_type
              })
              .select('id')
              .single();

            if (investorError) throw investorError;

            const { error: buyBoxError } = await supabase
              .from('buy_box')
              .insert({
                investor_id: newInvestor.id,
                property_types: row.data.property_types,
                lead_types: row.data.lead_types,
                condition_types: row.data.condition_types,
                timeframe: row.data.timeframe,
                year_built_min: row.data.year_built_min,
                year_built_max: row.data.year_built_max,
                price_min: row.data.price_min,
                price_max: row.data.price_max,
                notes: row.data.notes
              });

            if (buyBoxError) throw buyBoxError;

            const marketsToInsert = [];
            if (row.data.primary_states.length > 0) {
              marketsToInsert.push({
                investor_id: newInvestor.id,
                market_type: 'primary',
                states: row.data.primary_states
              });
            }
            if (row.data.secondary_states.length > 0) {
              marketsToInsert.push({
                investor_id: newInvestor.id,
                market_type: 'secondary',
                states: row.data.secondary_states
              });
            }
            if (row.data.direct_purchase_states.length > 0) {
              marketsToInsert.push({
                investor_id: newInvestor.id,
                market_type: 'direct_purchase',
                states: row.data.direct_purchase_states
              });
            }

            if (marketsToInsert.length > 0) {
              const { error: marketsError } = await supabase
                .from('markets')
                .insert(marketsToInsert);
              if (marketsError) throw marketsError;
            }

            successCount++;
          }
        } catch (error) {
          console.error(`Failed to import row ${row.rowNumber}:`, error);
          failedCount++;
        }
      }

      setImportResults({ success: successCount, updated: updatedCount, failed: failedCount });
      setStep(3);

      toast({
        title: 'Import Complete',
        description: `${successCount} new, ${updatedCount} updated, ${failedCount} failed`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setParsedRows([]);
    setStep(1);
    setImportResults({ success: 0, updated: 0, failed: 0 });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default">Valid</Badge>;
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>;
      case 'duplicate':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Update</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  if (step === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Batch Import from Google Sheets</CardTitle>
          <CardDescription>
            Paste multiple rows from your Google Sheet. Each row should be tab-delimited with 18 columns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your Google Sheet rows here (one row per line)..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleParse}
              disabled={!rawText.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Parse & Validate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 2) {
    const validCount = parsedRows.filter(r => r.status === 'valid').length;
    const warningCount = parsedRows.filter(r => r.status === 'warning').length;
    const duplicateCount = parsedRows.filter(r => r.status === 'duplicate').length;
    const errorCount = parsedRows.filter(r => r.status === 'error').length;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Review Import</CardTitle>
          <CardDescription>
            {parsedRows.length} rows parsed - {validCount} valid, {warningCount} warnings, {duplicateCount} updates, {errorCount} errors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Messages</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row) => (
                  <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(row.status)}
                        {getStatusBadge(row.status)}
                      </div>
                    </TableCell>
                    <TableCell>{row.data?.company_name || '-'}</TableCell>
                    <TableCell>{row.data?.tier || '-'}</TableCell>
                    <TableCell>
                      {row.messages.length > 0 ? (
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {row.messages.map((msg, i) => (
                            <li key={i}>• {msg}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm text-green-600">Ready to import</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline">
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={errorCount === parsedRows.length || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parsedRows.length - errorCount} Rows
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 3) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
          <CardDescription>Summary of import results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-green-500 border-l-4">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                <p className="text-sm text-muted-foreground">New Investors</p>
              </CardContent>
            </Card>
            <Card className="border-blue-500 border-l-4">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                <p className="text-sm text-muted-foreground">Updated Investors</p>
              </CardContent>
            </Card>
            <Card className="border-destructive border-l-4">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{importResults.failed}</div>
                <p className="text-sm text-muted-foreground">Failed Imports</p>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleReset}>
            Import More
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
