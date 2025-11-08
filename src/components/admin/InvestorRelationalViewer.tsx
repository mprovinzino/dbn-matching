import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { InvestorPanel } from "./InvestorPanel";
import { BuyBoxPanel } from "./BuyBoxPanel";
import { MarketsPanel } from "./MarketsPanel";
import { useInvestorWithRelations } from "@/hooks/useInvestorWithRelations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const InvestorRelationalViewer = () => {
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);
  const [showDiagram, setShowDiagram] = useState(true);

  const { data: relationData, isLoading } = useInvestorWithRelations(selectedInvestorId);

  return (
    <div className="flex flex-col h-full">
      <Collapsible open={showDiagram} onOpenChange={setShowDiagram}>
        <div className="border-b p-4 bg-muted/30">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="font-semibold">Database Relationship Diagram</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showDiagram ? "" : "-rotate-90"}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <div className="p-6 bg-muted/10 border-b">
            <div className="max-w-3xl mx-auto">
              <pre className="text-xs bg-card p-4 rounded-lg border overflow-auto">
                <code>{`
┌─────────────────────────────────────────────────────────────┐
│                  Database Schema Relationships               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐           ┌──────────────┐               │
│  │  investors   │           │   buy_box    │               │
│  ├──────────────┤           ├──────────────┤               │
│  │ • id (PK)    │───────────│ • id (PK)    │               │
│  │ • company_name  1      1 │ • investor_id (FK)          │
│  │ • tier       │           │ • property_types            │
│  │ • status     │           │ • price_min/max             │
│  │ • coverage   │           │ • year_built_min/max        │
│  └──────┬───────┘           │ • conditions                │
│         │                   └──────────────┘               │
│         │ 1                                                 │
│         │                                                   │
│         │ N                                                 │
│         │                                                   │
│  ┌──────▼───────┐                                          │
│  │   markets    │                                          │
│  ├──────────────┤                                          │
│  │ • id (PK)    │                                          │
│  │ • investor_id (FK)                                      │
│  │ • market_type                                           │
│  │ • states     │  (for full_coverage)                     │
│  │ • zip_codes  │  (for primary/direct_purchase)           │
│  └──────────────┘                                          │
│                                                              │
│  Relationships:                                             │
│  • 1 Investor : 1 Buy Box (one-to-one)                     │
│  • 1 Investor : N Markets (one-to-many)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                `}</code>
              </pre>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20}>
            <InvestorPanel
              selectedInvestorId={selectedInvestorId}
              onSelectInvestor={setSelectedInvestorId}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={37.5} minSize={25}>
            <BuyBoxPanel
              investorId={selectedInvestorId}
              investorName={relationData?.investor?.company_name || null}
              buyBox={relationData?.buyBox || null}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={37.5} minSize={25}>
            <MarketsPanel
              investorId={selectedInvestorId}
              investorName={relationData?.investor?.company_name || null}
              markets={relationData?.markets || []}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
