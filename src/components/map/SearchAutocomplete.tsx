import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Building2, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  type: "investor" | "dma" | "state";
  id: string;
  label: string;
  sublabel?: string;
  status?: string;
}

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchAutocomplete({ value, onChange }: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      const searchLower = value.toLowerCase().trim();
      const results: SearchSuggestion[] = [];

      try {
        // Search investors
        const { data: investors } = await supabase
          .from('investors')
          .select('id, company_name, status')
          .ilike('company_name', `%${searchLower}%`)
          .limit(5);

        console.log('🔍 Autocomplete search:', searchLower);
        console.log('📊 Investors found:', investors?.length, investors);

        if (investors) {
          investors.forEach(inv => {
            results.push({
              type: "investor",
              id: inv.id,
              label: inv.company_name,
              sublabel: "Investor",
              status: inv.status
            });
          });
        }

        // Search DMAs and states
        const { data: dmas } = await supabase
          .from('zip_code_reference')
          .select('dma, state')
          .or(`dma.ilike.%${searchLower}%,state.ilike.%${searchLower}%`)
          .limit(100);

        if (dmas) {
          // Group by DMA and state
          const dmaMap = new Map<string, string>();
          const stateSet = new Set<string>();

          dmas.forEach(row => {
            if (row.dma && row.dma.toLowerCase().includes(searchLower)) {
              dmaMap.set(row.dma, row.state);
            }
            if (row.state && row.state.toLowerCase().includes(searchLower)) {
              stateSet.add(row.state);
            }
          });

          // Add unique DMAs (limit to 5)
          Array.from(dmaMap.entries()).slice(0, 5).forEach(([dma, state]) => {
            results.push({
              type: "dma",
              id: dma,
              label: dma,
              sublabel: state
            });
          });

          // Add unique states (limit to 3)
          Array.from(stateSet).slice(0, 3).forEach(state => {
            results.push({
              type: "state",
              id: state,
              label: state,
              sublabel: "State"
            });
          });
        }

        console.log('🎯 Suggestions:', results.length);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.label);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'investor':
        return <Building2 className="h-4 w-4 text-blue-500" />;
      case 'dma':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'state':
        return <MapPin className="h-4 w-4 text-purple-500" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor="search" className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Search Investor or DMA
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="search"
          placeholder="Type to search..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] max-h-[300px] overflow-y-auto"
        >
          <div className="py-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-3 hover:bg-accent transition-colors text-left",
                  index === selectedIndex && "bg-accent"
                )}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {getIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    {suggestion.label}
                    {suggestion.status && suggestion.status !== 'active' && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                        {suggestion.status}
                      </span>
                    )}
                  </div>
                  {suggestion.sublabel && (
                    <div className="text-xs text-muted-foreground">
                      {suggestion.sublabel}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
