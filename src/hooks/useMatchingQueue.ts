import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MatchingQueueItem {
  id: string;
  deal_id: string;
  deal_name: string;
  autosourcer_id: string | null;
  address: string | null;
  city: string | null;
  state: string;
  zip_code: string;
  property_type: string | null;
  condition: string | null;
  year_built: number | null;
  ask_price: number | null;
  arv: number | null;
  status: string;
  assigned_to_matcher: string | null;
  investors_requested: number;
  investors_attached: number;
  partial_match_reason: string | null;
  created_at: string;
  matched_at: string | null;
  updated_at: string;
}

export interface LeadAssignment {
  id: string;
  deal_id: string;
  investor_id: string;
  match_quality_score: number;
  calculated_score: number;
  score_overridden: boolean;
  match_reasons: string[] | null;
  location_specificity: string | null;
  hubspot_company_id: string | null;
  hubspot_connection_id: string | null;
  attachment_status: string;
  assigned_by: string | null;
  assigned_at: string;
  attached_at: string | null;
}

export function useMatchingQueue(status?: string) {
  return useQuery({
    queryKey: ['matching-queue', status],
    queryFn: async () => {
      let query = supabase
        .from('matching_queue')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MatchingQueueItem[];
    },
  });
}

export function useQueueItem(dealId: string) {
  return useQuery({
    queryKey: ['queue-item', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matching_queue')
        .select('*')
        .eq('deal_id', dealId)
        .single();

      if (error) throw error;
      return data as MatchingQueueItem;
    },
    enabled: !!dealId,
  });
}

export function useLeadAssignments(dealId: string) {
  return useQuery({
    queryKey: ['lead-assignments', dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_assignments')
        .select('*')
        .eq('deal_id', dealId)
        .order('attached_at', { ascending: false });

      if (error) throw error;
      return data as LeadAssignment[];
    },
    enabled: !!dealId,
  });
}

export function useAttachInvestor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      investorId,
      matchQualityScore,
      calculatedScore,
      matchReasons,
      locationSpecificity,
    }: {
      dealId: string;
      investorId: string;
      matchQualityScore: number;
      calculatedScore: number;
      matchReasons: string[];
      locationSpecificity: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('attach-investor-to-deal', {
        body: {
          dealId,
          investorId,
          matchQualityScore,
          calculatedScore,
          matchReasons,
          locationSpecificity,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queue-item', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['lead-assignments', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['matching-queue'] });
      toast.success('Investor attached successfully');
    },
    onError: (error) => {
      toast.error(`Failed to attach investor: ${error.message}`);
    },
  });
}

export function useCompleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      investorsAttached,
      partialMatchReason,
    }: {
      dealId: string;
      investorsAttached: number;
      partialMatchReason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('complete-deal-matching', {
        body: {
          dealId,
          investorsAttached,
          partialMatchReason,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['queue-item', variables.dealId] });
      queryClient.invalidateQueries({ queryKey: ['matching-queue'] });
      toast.success('Deal matching completed');
    },
    onError: (error) => {
      toast.error(`Failed to complete deal: ${error.message}`);
    },
  });
}
