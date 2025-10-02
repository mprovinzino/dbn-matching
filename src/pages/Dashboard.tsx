import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Plus, Filter, FlaskConical, PauseCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InvestorCard } from "@/components/InvestorCard";
import { InvestorDetailModal } from "@/components/InvestorDetailModal";
import { AddInvestorForm } from "@/components/AddInvestorForm";
import { EditInvestorForm } from "@/components/EditInvestorForm";
import { useToast } from "@/hooks/use-toast";

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
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [hasCheckedForSeed, setHasCheckedForSeed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadInvestors();
  }, []);

  // Check seed status and auto-import on first load
  useEffect(() => {
    const checkSeedStatus = async () => {
      if (hasCheckedForSeed || loading) return;

      setHasCheckedForSeed(true);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has been seeded
        const { data: seedStatus, error: seedError } = await supabase
          .from('user_seed_status')
          .select('seeded')
          .eq('user_id', user.id)
          .maybeSingle();

        if (seedError) {
          console.error('Error checking seed status:', seedError);
          return;
        }

        // If not seeded yet, trigger import
        if (!seedStatus || !seedStatus.seeded) {
          console.log('User not seeded, starting auto-import...');
          await handleAutoImport();
        }
      } catch (error) {
        console.error('Error in seed check:', error);
      }
    };

    checkSeedStatus();
  }, [loading, hasCheckedForSeed]);

  const loadInvestors = async () => {
    try {
      setLoading(true);
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

  const handleAutoImport = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('No authenticated user for auto-import');
        return;
      }
      
      setImportProgress("Clearing existing data and importing full investor network...");
      console.log('Starting migration for user:', user.id);
      
      const { migrateInvestorsToDatabase } = await import('@/utils/migrateInvestorsToDatabase');
      const result = await migrateInvestorsToDatabase(user.id);
      
      if (result.success) {
        // Mark user as seeded
        const { error: seedError } = await supabase
          .from('user_seed_status')
          .upsert({
            user_id: user.id,
            seeded: true,
            seeded_at: new Date().toISOString(),
          });

        if (seedError) {
          console.error('Error updating seed status:', seedError);
        }

        toast({
          title: "Import Successful",
          description: `Successfully imported ${result.successCount} investors from your network`,
        });
        await loadInvestors();
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${result.successCount} investors, ${result.failedCount} failed`,
          variant: "destructive",
        });
        console.error('Import errors:', result.errors);
      }
      
      setImportProgress(null);
    } catch (error) {
      console.error('Error during auto-import:', error);
      setImportProgress(null);
      toast({
        title: "Import Error",
        description: "Failed to load investor data. Please refresh the page.",
        variant: "destructive"
      });
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
    active: investors.filter(i => i.status === 'active').length,
    test: investors.filter(i => i.status === 'test').length,
    paused: investors.filter(i => i.status === 'paused').length,
  };

  if (loading || importProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">
            {importProgress || "Loading..."}
          </p>
          {importProgress && (
            <p className="text-sm text-muted-foreground">
              This may take a moment...
            </p>
          )}
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
          <Card className="bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total === 0 ? 'No investors yet' : 'In your network'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-green-500 bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Active Investors</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Ready to receive leads</p>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-blue-500 bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Test Investors</CardTitle>
              <FlaskConical className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.test}</div>
              <p className="text-xs text-muted-foreground">In testing phase</p>
            </CardContent>
          </Card>

          <Card className="border-l-2 border-l-amber-500 bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium">Paused Investors</CardTitle>
              <PauseCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl font-bold">{stats.paused}</div>
              <p className="text-xs text-muted-foreground">Temporarily on hold</p>
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
        {investors.length > 0 && (
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
