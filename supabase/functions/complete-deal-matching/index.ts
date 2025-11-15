import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dealId, investorsAttached, partialMatchReason } = await req.json();
    
    console.log('Completing deal matching:', { dealId, investorsAttached });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Update HubSpot deal stage
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY');
    if (!hubspotApiKey) {
      console.warn('HUBSPOT_API_KEY not configured - skipping HubSpot update');
    } else {
      const hubspotResponse = await fetch(
        `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: {
              clever_offers_deal_stage: 'Buyers Introduced'
            }
          })
        }
      );

      if (!hubspotResponse.ok) {
        const errorText = await hubspotResponse.text();
        console.error('HubSpot API error:', errorText);
        throw new Error(`HubSpot API error: ${hubspotResponse.status}`);
      }

      console.log('Successfully updated HubSpot deal stage');
    }

    // Update matching queue
    const { error: queueError } = await supabase
      .from('matching_queue')
      .update({
        status: 'matched',
        matched_at: new Date().toISOString(),
        investors_attached: investorsAttached,
        partial_match_reason: partialMatchReason || null,
        updated_at: new Date().toISOString()
      })
      .eq('deal_id', dealId);

    if (queueError) {
      console.error('Error updating queue:', queueError);
      throw queueError;
    }

    console.log('Deal matching completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error completing deal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
