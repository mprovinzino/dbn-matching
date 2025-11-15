import { useState } from 'react';
import { useMatchingQueue } from '@/hooks/useMatchingQueue';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MatchingDashboard() {
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  
  const { data: queueItems, isLoading } = useMatchingQueue(statusFilter);
  const navigate = useNavigate();

  const filteredItems = queueItems?.filter(item => 
    !searchId || item.autosourcer_id?.toLowerCase().includes(searchId.toLowerCase())
  );

  const handleMatchDeal = (dealId: string) => {
    navigate(`/matching-dashboard/${dealId}`);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Matching Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Attach investors to deals from the matching queue
            </p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Autosourcer ID..."
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="matched">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Matched
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading deals...
              </div>
            ) : filteredItems?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No deals found in this status
              </div>
            ) : (
              filteredItems?.map((item) => (
                <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">
                          {item.deal_name}
                        </h3>
                        <Badge variant={item.status === 'matched' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Autosourcer ID:</span>
                          <span className="ml-2 font-medium">{item.autosourcer_id || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <span className="ml-2 font-medium">
                            {item.city}, {item.state} {item.zip_code}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Property Type:</span>
                          <span className="ml-2 font-medium">{item.property_type || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ask Price:</span>
                          <span className="ml-2 font-medium">
                            {item.ask_price ? `$${item.ask_price.toLocaleString()}` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Investors:</span>
                          <span className="ml-2 font-medium">
                            {item.investors_attached} / {item.investors_requested} attached
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-2 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleMatchDeal(item.deal_id)}
                      className="ml-6"
                    >
                      {item.status === 'pending' ? 'Match Now' : 'View Details'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
