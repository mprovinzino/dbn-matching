import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataQualityChecks } from "@/hooks/useDataQualityChecks";
import { useState } from "react";
import { AlertCircle, CheckCircle2, AlertTriangle, Info, Loader2, Download } from "lucide-react";
import { DataQualityIssue } from "@/utils/dataQualityValidation";
import { useNavigate } from "react-router-dom";

export const DataQualityDashboard = () => {
  const { data, isLoading, refetch } = useDataQualityChecks();
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const { issues = [], stats } = data || {};

  // Filter issues
  const filteredIssues = issues.filter((issue: DataQualityIssue) => {
    if (severityFilter !== "all" && issue.issue_severity !== severityFilter) return false;
    if (typeFilter !== "all" && issue.issue_type !== typeFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Critical</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1"><AlertTriangle className="w-3 h-3" />Warning</Badge>;
      case 'info':
        return <Badge variant="outline" className="gap-1"><Info className="w-3 h-3" />Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getIssueTypeLabel = (type: string) => {
    switch (type) {
      case 'duplicate_buybox':
        return 'Duplicate Buy Box';
      case 'incomplete_buybox':
        return 'Incomplete Buy Box';
      case 'missing_buybox':
        return 'Missing Buy Box';
      case 'no_markets':
        return 'No Markets';
      case 'invalid_coverage':
        return 'Invalid Coverage';
      default:
        return type;
    }
  };

  const exportToCSV = () => {
    const headers = ['Company Name', 'Issue Type', 'Severity', 'Description', 'Fix Action'];
    const rows = filteredIssues.map((issue: DataQualityIssue) => [
      issue.company_name,
      getIssueTypeLabel(issue.issue_type),
      issue.issue_severity,
      issue.issue_description,
      issue.fix_action
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-quality-issues-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Active Investors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActiveInvestors || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total active investors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Critical Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.criticalIssues || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.warningIssues || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Should be reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Duplicate Buy Boxes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.duplicateBuyBoxes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Investors with duplicates</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Quality Issues</CardTitle>
              <CardDescription>
                Review and fix data quality issues across all investors
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="duplicate_buybox">Duplicate Buy Box</SelectItem>
                  <SelectItem value="incomplete_buybox">Incomplete Buy Box</SelectItem>
                  <SelectItem value="missing_buybox">Missing Buy Box</SelectItem>
                  <SelectItem value="no_markets">No Markets</SelectItem>
                  <SelectItem value="invalid_coverage">Invalid Coverage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
              <p className="text-muted-foreground">
                All active investors have complete and valid data
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue: DataQualityIssue, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{issue.company_name}</TableCell>
                    <TableCell>{getIssueTypeLabel(issue.issue_type)}</TableCell>
                    <TableCell>{getSeverityBadge(issue.issue_severity)}</TableCell>
                    <TableCell className="max-w-md">{issue.issue_description}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `/admin?tab=relations&investorId=${issue.investor_id}`;
                          window.open(url, '_blank');
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
