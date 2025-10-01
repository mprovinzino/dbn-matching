import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Plus, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InvestorCard } from "@/components/InvestorCard";
import { InvestorDetailModal } from "@/components/InvestorDetailModal";
import { AddInvestorForm } from "@/components/AddInvestorForm";
import { EditInvestorForm } from "@/components/EditInvestorForm";
import { useToast } from "@/hooks/use-toast";
import { seedActualInvestors } from "@/utils/seedActualInvestors";

const Dashboard = () => {
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvestor, setSelectedInvestor] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBuyBox, setSelectedBuyBox] = useState<any>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadInvestors();
  }, []);

  const loadInvestors = async () => {
    try {
      const { data, error } = await supabase
        .from('investors')
        .select('*')
        .order('tier', { ascending: true });

      if (error) throw error;
      setInvestors(data || []);
    } catch (error) {
      console.error('Error loading investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      
      toast({
        title: "Importing Full Network",
        description: "Loading all investors from your Excel file. This may take a few minutes...",
      });
      
      const { seedFullInvestorNetwork } = await import('@/utils/seedFullInvestorNetwork');
      // Using dummy user ID since RLS is temporarily disabled
      const results = await seedFullInvestorNetwork("00000000-0000-0000-0000-000000000000");
      
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        toast({
          title: "Import Complete!",
          description: `Successfully imported ${successCount} of ${results.length} investors from your network`,
        });
      }
      
      if (failedCount > 0) {
        console.error('Failed to import some investors:', results.filter(r => !r.success));
        toast({
          title: "Partial Import",
          description: `${failedCount} investor(s) failed to import. Check console for details.`,
          variant: "destructive"
        });
      }
      
      await loadInvestors();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({
        title: "Error",
        description: "Failed to import investor data. Check console for details.",
        variant: "destructive"
      });
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

  const filteredInvestors = investors.filter(investor =>
    investor.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    investor.main_poc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: investors.length,
    active: investors.filter(i => i.tags?.includes('Active')).length,
    avgTier: investors.length > 0 
      ? (investors.reduce((acc, i) => acc + i.tier, 0) / investors.length).toFixed(1)
      : '-'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
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
            {investors.length === 0 && (
              <Button onClick={handleSeedData}>
                Load Investor Network
              </Button>
            )}
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
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total === 0 ? 'No investors yet' : 'In your network'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Ready to receive leads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Tier</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgTier}</div>
              <p className="text-xs text-muted-foreground">Across all investors</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search investors by name or POC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Investor
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Investor Grid */}
        {investors.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Investors Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Get started by loading your investor network
              </p>
              <Button onClick={handleSeedData}>
                Load Investor Network
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredInvestors.map((investor) => (
              <InvestorCard
                key={investor.id}
                investor={investor}
                onClick={() => handleInvestorClick(investor)}
              />
            ))}
          </div>
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
