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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Database, RefreshCw } from 'lucide-react';
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

      const { data: tableData, error, count } = await supabase
        .from(selectedTable as any)
        .select('*', { count: 'exact' })
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setData(tableData || []);
      setTotalCount(count || 0);
      
      if (tableData && tableData.length > 0) {
        setColumns(Object.keys(tableData[0]));
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

  const formatValue = (value: any) => {
    if (value === null) return <Badge variant="outline">NULL</Badge>;
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
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

    if (typeof value === 'boolean' || key.includes('_accepts') || key.includes('cold_accepts')) {
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
            <ScrollArea className="h-[500px] w-full">
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
                    <TableRow key={row.id || idx}>
                      {columns.map((col) => (
                        <TableCell key={col} className="whitespace-nowrap">
                          {formatValue(row[col])}
                        </TableCell>
                      ))}
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(row)}
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
            {columns.map((key) => (
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
