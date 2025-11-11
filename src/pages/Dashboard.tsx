import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Plus, Filter, FlaskConical, PauseCircle, LayoutGrid, List, ExternalLink, MapPin, Shield, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InvestorCard } from "@/components/InvestorCard";
import { InvestorDetailModal } from "@/components/InvestorDetailModal";
import { AddInvestorForm } from "@/components/AddInvestorForm";
import { EditInvestorForm } from "@/components/EditInvestorForm";
import { LeadMatchingSearch } from "@/components/LeadMatchingSearch";

import { InvestorDmaSummary } from "@/components/InvestorDmaSummary";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBuyBox, setSelectedBuyBox] = useState<any>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tiles" | "list">("tiles");
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [allMarkets, setAllMarkets] = useState<Record<string, any[]>>({});
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadInvestors();
        checkAdminStatus();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });
    setIsAdmin(data === true);
  };


  const loadInvestors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('tier', { ascending: true });

      if (error) throw error;
      setInvestors(data || []);
      
      // Fetch all markets for DMA summary
      if (data && data.length > 0) {
        const investorIds = data.map(inv => inv.id);
        const { data: marketsData } = await supabase
          .from('markets')
          .select('investor_id, market_type, zip_codes, states')
          .in('investor_id', investorIds);
        
        // Group markets by investor_id
        const marketsByInvestor: Record<string, any[]> = {};
        marketsData?.forEach(market => {
          if (!marketsByInvestor[market.investor_id]) {
            marketsByInvestor[market.investor_id] = [];
          }
          marketsByInvestor[market.investor_id].push(market);
        });
        setAllMarkets(marketsByInvestor);
      }
    } catch (error) {
      console.error('Error loading investors:', error);
    } finally {
      setLoading(false);
    }
  };



  const handleInvestorClick = async (investor: any) => {
    setSelectedInvestor(investor);
    
    // Load buy box
    const { data: buyBox } = await supabase
      .from('buy_box')
      .select('*')
      .eq('investor_id', investor.id)
      .single();
    
    setSelectedBuyBox(buyBox);

    // Load markets
    const { data: markets } = await supabase
      .from('markets')
      .select('*')
      .eq('investor_id', investor.id);
    
    setSelectedMarkets(markets || []);
    setDetailModalOpen(true);
  };

  // Handle deep linking from Data Quality Dashboard
  useEffect(() => {
    const deepLinkInvestorId = searchParams.get('investorId');
    const deepLinkOpen = searchParams.get('open');
    
    if (!deepLinkHandled && deepLinkInvestorId && investors.length > 0) {
      const investor = investors.find(inv => inv.id === deepLinkInvestorId);
      if (investor) {
        handleInvestorClick(investor).then(() => {
          if (deepLinkOpen === 'edit') {
            setEditModalOpen(true);
            setDetailModalOpen(false);
          }
          setDeepLinkHandled(true);
        });
      }
    }
  }, [searchParams, investors, deepLinkHandled]);

  const filteredInvestors = investors.filter(investor => {
    const matchesSearch = 
      investor.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.main_poc.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || investor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getSortedInvestors = () => {
    const sorted = [...filteredInvestors];
    
    switch(sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.company_name.localeCompare(b.company_name));
      case 'name-desc':
        return sorted.sort((a, b) => b.company_name.localeCompare(a.company_name));
      case 'tier-asc':
        return sorted.sort((a, b) => a.tier - b.tier);
      case 'tier-desc':
        return sorted.sort((a, b) => b.tier - a.tier);
      case 'weekly-cap':
        return sorted.sort((a, b) => b.weekly_cap - a.weekly_cap);
      case 'updated':
        return sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      case 'status':
        const statusOrder = { active: 0, test: 1, paused: 2, inactive: 3 };
        return sorted.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      default:
        return sorted;
    }
  };

  const sortedInvestors = getSortedInvestors();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const stats = {
    total: investors.length,
    active: investors.filter(i => i.status === 'active').length,
    test: investors.filter(i => i.status === 'test').length,
    paused: investors.filter(i => i.status === 'paused').length,
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-sidebar-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clever Offers</h1>
            <p className="text-sm text-muted-foreground">Investor Management System</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
          <p className="text-muted-foreground">
            Manage your investor network and track opportunities.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card 
            className={`border-l-2 border-l-muted-foreground bg-muted/30 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === null ? 'ring-2 ring-muted-foreground' : ''
            }`}
            onClick={() => setStatusFilter(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {statusFilter === null ? 'Showing all investors' : 'Click to show all'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`border-l-2 border-l-green-500 bg-muted/30 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === 'active' ? 'ring-2 ring-green-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'active' ? null : 'active')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'active' ? 'Click to show all' : 'Ready to receive leads'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`border-l-2 border-l-blue-500 bg-muted/30 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === 'test' ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'test' ? null : 'test')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Test Investors</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.test}</div>
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'test' ? 'Click to show all' : 'In testing phase'}
              </p>
            </CardContent>
          </Card>

          <Card 
            className={`border-l-2 border-l-amber-500 bg-muted/30 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === 'paused' ? 'ring-2 ring-amber-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === 'paused' ? null : 'paused')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Paused Investors</CardTitle>
              <PauseCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.paused}</div>
              <p className="text-xs text-muted-foreground">
                {statusFilter === 'paused' ? 'Click to show all' : 'Temporarily on hold'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Matching Search */}
        <LeadMatchingSearch />

        {/* Search and Actions */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search investors by name or POC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="tier-asc">Tier (Low to High)</SelectItem>
              <SelectItem value="tier-desc">Tier (High to Low)</SelectItem>
              <SelectItem value="weekly-cap">Weekly Cap (High to Low)</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "tiles" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("tiles")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate("/coverage-map")}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Coverage Map
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investor
            </Button>
          )}
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Investor Grid/List */}
        {investors.length > 0 && viewMode === "tiles" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedInvestors.map((investor) => (
              <InvestorCard
                key={investor.id}
                investor={investor}
                marketData={allMarkets[investor.id]}
                onClick={() => handleInvestorClick(investor)}
              />
            ))}
          </div>
        )}

        {investors.length > 0 && viewMode === "list" && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Main POC</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>DMA Coverage</TableHead>
                  <TableHead>Weekly Cap</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedInvestors.map((investor) => (
                  <TableRow 
                    key={investor.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleInvestorClick(investor)}
                  >
                    <TableCell className="font-medium">{investor.company_name}</TableCell>
                    <TableCell>{investor.main_poc}</TableCell>
                    <TableCell>
                      <Badge variant={investor.tier === 1 ? "default" : investor.tier === 2 ? "secondary" : "outline"}>
                        Tier {investor.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          investor.status === 'active' ? 'default' : 
                          investor.status === 'test' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {investor.status.charAt(0).toUpperCase() + investor.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{investor.coverage_type.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <InvestorDmaSummary 
                        investorId={investor.id}
                        coverageType={investor.coverage_type}
                        marketData={allMarkets[investor.id]}
                        compact
                      />
                    </TableCell>
                    <TableCell>{investor.weekly_cap} leads/week</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInvestorClick(investor);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {filteredInvestors.length === 0 && investors.length > 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No investors match your search</p>
            </CardContent>
          </Card>
        )}
      </main>

      <InvestorDetailModal
        open={detailModalOpen && !editModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInvestor(null);
        }}
        investor={selectedInvestor}
        buyBox={selectedBuyBox}
        markets={selectedMarkets}
        isAdmin={isAdmin}
        onEdit={() => {
          setDetailModalOpen(false);
          setEditModalOpen(true);
        }}
      />

      <EditInvestorForm
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedInvestor(null);
        }}
        onSuccess={() => {
          loadInvestors();
          setEditModalOpen(false);
          setSelectedInvestor(null);
        }}
        investor={selectedInvestor}
        buyBox={selectedBuyBox}
        markets={selectedMarkets}
      />

      <AddInvestorForm
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={loadInvestors}
      />

    </div>
  );
};

export default Dashboard;
