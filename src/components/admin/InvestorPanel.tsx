import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllInvestors } from "@/hooks/useInvestorWithRelations";

interface InvestorPanelProps {
  selectedInvestorId: string | null;
  onSelectInvestor: (id: string) => void;
}

export const InvestorPanel = ({ selectedInvestorId, onSelectInvestor }: InvestorPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: investors, isLoading } = useAllInvestors();

  const filteredInvestors = investors?.filter((inv) =>
    inv.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-lg">Investors ({investors?.length || 0})</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search investors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredInvestors?.map((investor) => (
            <button
              key={investor.id}
              onClick={() => onSelectInvestor(investor.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedInvestorId === investor.id
                  ? "bg-primary/10 border-primary"
                  : "bg-card hover:bg-muted/50 border-border"
              }`}
            >
              <div className="font-medium text-sm mb-1">{investor.company_name}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  Tier {investor.tier}
                </Badge>
                <Badge
                  variant={investor.status === "active" ? "default" : "outline"}
                  className="text-xs"
                >
                  {investor.status}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {investor.coverage_type}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
