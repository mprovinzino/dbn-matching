import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Database, RefreshCw, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_TABLES = [
  { value: 'investors', label: 'Investors', description: 'Main investor records' },
  { value: 'markets', label: 'Markets', description: 'Market coverage data' },
  { value: 'buy_box', label: 'Buy Box', description: 'Buy box criteria' },
  { value: 'investor_documents', label: 'Investor Documents', description: 'Document links' },
  { value: 'zip_code_reference', label: 'ZIP Code Reference', description: 'ZIP code data (read-only)' },
  { value: 'user_roles', label: 'User Roles', description: 'User permissions' },
  { value: 'user_seed_status', label: 'User Seed Status', description: 'User seed tracking' },
];

export const DatabaseTableViewer = () => {
  const [selectedTable, setSelectedTable] = useState<string>('investors');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editedRecord, setEditedRecord] = useState<any>({});
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const pageSize = 50;

  useEffect(() => {
    loadTableData();
  }, [selectedTable, page]);

  const loadTableData = async () => {
    setLoading(true);
    try {
      const start = page * pageSize;
      const end = start + pageSize - 1;

      let query;
      
      // For buy_box and markets, join with investors to get company name
      if (selectedTable === 'buy_box') {
        query = supabase
          .from('buy_box')
          .select('*, investors(company_name)', { count: 'exact' })
          .range(start, end)
          .order('created_at', { ascending: false });
      } else if (selectedTable === 'markets') {
        query = supabase
          .from('markets')
          .select('*, investors(company_name)', { count: 'exact' })
          .range(start, end)
          .order('created_at', { ascending: false });
      } else {
        query = supabase
          .from(selectedTable as any)
          .select('*', { count: 'exact' })
          .range(start, end)
          .order('created_at', { ascending: false });
      }

      const { data: tableData, error, count } = await query;

      if (error) throw error;

      // Flatten the joined data
      let processedData = tableData;
      if (selectedTable === 'buy_box' || selectedTable === 'markets') {
        processedData = tableData?.map((row: any) => ({
          ...row,
          company_name: row.investors?.company_name || 'Unknown'
        }));
      }

      setData(processedData || []);
      setTotalCount(count || 0);
      
      if (processedData && processedData.length > 0) {
        let cols = Object.keys(processedData[0]).filter(k => k !== 'investors');
        
        // Reorder columns: company_name first, then investor_id, then others
        if (selectedTable === 'buy_box' || selectedTable === 'markets') {
          const priorityCols = ['company_name', 'investor_id'];
          const otherCols = cols.filter(c => !priorityCols.includes(c));
          cols = [...priorityCols.filter(c => cols.includes(c)), ...otherCols];
        }
        
        setColumns(cols);
      } else {
        setColumns([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: any) => {
    setSelectedRecord(record);
    setEditedRecord({ ...record });
    setIsNewRecord(false);
    setEditDialogOpen(true);
  };

  const handleAdd = () => {
    const newRecord: any = {};
    columns.forEach(col => {
      if (col === 'created_at' || col === 'updated_at') {
        newRecord[col] = new Date().toISOString();
      } else if (col.includes('_id') && col !== 'user_id' && col !== 'investor_id') {
        newRecord[col] = crypto.randomUUID();
      } else {
        newRecord[col] = null;
      }
    });
    setSelectedRecord(null);
    setEditedRecord(newRecord);
    setIsNewRecord(true);
    setEditDialogOpen(true);
  };

  const handleDelete = (record: any) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;

    try {
      const { error } = await supabase
        .from(selectedTable as any)
        .delete()
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Record deleted successfully',
      });
      
      loadTableData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error deleting record',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const saveRecord = async () => {
    try {
      if (isNewRecord) {
        const { error } = await supabase
          .from(selectedTable as any)
          .insert([editedRecord]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Record created successfully',
        });
      } else {
        const { error } = await supabase
          .from(selectedTable as any)
          .update(editedRecord)
          .eq('id', selectedRecord.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Record updated successfully',
        });
      }

      loadTableData();
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error saving record',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatValue = (value: any, columnName?: string) => {
    if (value === null) return <Badge variant="outline">NULL</Badge>;
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Truncate UUIDs for readability
    if (columnName?.includes('_id') && typeof value === 'string' && value.length > 30) {
      return value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }
    
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  };

  const renderEditField = (key: string, value: any) => {
    const isIdField = key === 'id' || key === 'created_at' || key === 'updated_at';
    
    if (isIdField && !isNewRecord) {
      return (
        <Input
          value={value || ''}
          disabled
          className="bg-muted"
        />
      );
    }

    // Enum field: coverage_type
    if (key === 'coverage_type') {
      return (
        <Select
          value={editedRecord[key] || ''}
          onValueChange={(val) => setEditedRecord({ ...editedRecord, [key]: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select coverage type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="national">National</SelectItem>
            <SelectItem value="regional">Regional</SelectItem>
            <SelectItem value="local">Local</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Enum field: market_type
    if (key === 'market_type') {
      return (
        <Select
          value={editedRecord[key] || ''}
          onValueChange={(val) => setEditedRecord({ ...editedRecord, [key]: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select market type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="direct_purchase">Direct Purchase</SelectItem>
            <SelectItem value="full_coverage">Full Coverage</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Enum field: status (investor_status)
    if (key === 'status') {
      return (
        <Select
          value={editedRecord[key] || ''}
          onValueChange={(val) => setEditedRecord({ ...editedRecord, [key]: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Enum field: role (app_role)
    if (key === 'role') {
      return (
        <Select
          value={editedRecord[key] || ''}
          onValueChange={(val) => setEditedRecord({ ...editedRecord, [key]: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (typeof value === 'boolean' || key.includes('_accepts') || key.includes('cold_accepts') || key === 'seeded') {
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={editedRecord[key] || false}
            onCheckedChange={(checked) => 
              setEditedRecord({ ...editedRecord, [key]: checked })
            }
          />
          <Label>Yes</Label>
        </div>
      );
    }

    // Multi-select for lead_types
    if (key === 'lead_types') {
      const options = ['Probate', 'Pre-Foreclosure', 'Divorce', 'Tax Delinquent', 'Absentee Owner', 'High Equity', 'Vacant', 'Inherited', 'Free and Clear', 'Distressed', 'Motivated Seller'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select lead types'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Multi-select for timeframe
    if (key === 'timeframe') {
      const options = ['Immediate (0-30 days)', '1-3 months', '3-6 months', '6-12 months', '12+ months', 'Flexible'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select timeframe'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Multi-select for condition_types
    if (key === 'condition_types') {
      const options = ['Move in Ready with newer finishes', 'Move in Ready with Older Finishes', 'Needs Few Repairs', 'Needs Major Repairs'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select property conditions'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Multi-select for property_types
    if (key === 'property_types') {
      const options = ['Single Family', 'Multi Family', 'Condo', 'Townhouse', 'Land', 'Commercial', 'Mobile Home'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select property types'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Multi-select for on_market_status
    if (key === 'on_market_status') {
      const options = ['On Market', 'Off Market', 'Pre-Market', 'For Sale By Owner'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select market status'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Multi-select for offer_types
    if (key === 'offer_types') {
      const options = ['Cash', 'Financing', 'Subject To', 'Seller Finance', 'Lease Option', 'Wholesale', 'Assignment'];
      const currentValues = Array.isArray(editedRecord[key]) ? editedRecord[key] : [];
      
      return (
        <Accordion type="single" collapsible className="w-full border rounded-md">
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="text-sm">{currentValues.length > 0 ? `${currentValues.length} selected` : 'Select offer types'}</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      checked={currentValues.includes(option)}
                      onCheckedChange={(checked) => {
                        const newValues = checked
                          ? [...currentValues, option]
                          : currentValues.filter((v: string) => v !== option);
                        setEditedRecord({ ...editedRecord, [key]: newValues });
                      }}
                    />
                    <Label className="font-normal cursor-pointer">{option}</Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    }

    // Generic array handling for other arrays (states, zip_codes, tags, dmas)
    if (Array.isArray(value)) {
      return (
        <Textarea
          value={Array.isArray(editedRecord[key]) ? editedRecord[key].join(', ') : ''}
          onChange={(e) => {
            const arrayValue = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
            setEditedRecord({ ...editedRecord, [key]: arrayValue });
          }}
          placeholder="Comma-separated values"
          rows={3}
        />
      );
    }

    if (key.includes('notes') || key.includes('reason') || key.includes('description')) {
      return (
        <Textarea
          value={editedRecord[key] || ''}
          onChange={(e) => setEditedRecord({ ...editedRecord, [key]: e.target.value })}
          rows={3}
        />
      );
    }

    return (
      <Input
        value={editedRecord[key] || ''}
        onChange={(e) => setEditedRecord({ ...editedRecord, [key]: e.target.value })}
        type={typeof value === 'number' ? 'number' : 'text'}
      />
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const isReadOnly = selectedTable === 'zip_code_reference';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Database Tables</CardTitle>
              <CardDescription>
                View and manage database records
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedTable} onValueChange={(value) => { setSelectedTable(value); setPage(0); }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_TABLES.map((table) => (
                  <SelectItem key={table.value} value={table.value}>
                    <div>
                      <div className="font-medium">{table.label}</div>
                      <div className="text-xs text-muted-foreground">{table.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={loadTableData} variant="outline" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {!isReadOnly && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No records found
          </div>
        ) : (
          <>
            <ScrollArea className="h-[500px] w-full rounded-md border">
              <div className="w-max min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                      {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, idx) => (
                      <TableRow 
                        key={row.id || idx}
                        onClick={!isReadOnly ? () => handleEdit(row) : undefined}
                        className={!isReadOnly ? "cursor-pointer hover:bg-muted/50" : ""}
                      >
                        {columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap">
                            {formatValue(row[col], col)}
                          </TableCell>
                        ))}
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(row);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(row);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewRecord ? 'Add New Record' : 'Edit Record'}
            </DialogTitle>
            <DialogDescription>
              {isNewRecord ? 'Create a new record in' : 'Update record in'} {selectedTable}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(selectedTable === 'buy_box' || selectedTable === 'markets') && editedRecord.company_name && (
              <div className="col-span-2 p-3 bg-muted rounded-md">
                <Label className="text-xs text-muted-foreground">Investor</Label>
                <div className="font-medium">{editedRecord.company_name}</div>
              </div>
            )}
            {columns.filter(key => key !== 'company_name').map((key) => (
              <div key={key} className="grid gap-2">
                <Label htmlFor={key}>{key}</Label>
                {renderEditField(key, editedRecord[key])}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRecord}>
              {isNewRecord ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the record from {selectedTable}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
