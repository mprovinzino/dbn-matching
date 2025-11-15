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
    const { dealId, investorId, matchQualityScore, calculatedScore, matchReasons, locationSpecificity } = await req.json();
    
    console.log('Attaching investor to deal:', { dealId, investorId, matchQualityScore });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get investor details including HubSpot IDs
    const { data: investor, error: investorError } = await supabase
      .from('investors')
      .select('id, company_name, hubspot_company_id, hubspot_contact_id')
      .eq('id', investorId)
      .single();

    if (investorError || !investor) {
      throw new Error('Investor not found');
    }

    if (!investor.hubspot_company_id) {
      throw new Error('Investor missing HubSpot Company ID');
    }

    // Update HubSpot deal with "Attach a Cash Buyer" property
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
              attach_a_cash_buyer: investor.company_name
            }
          })
        }
      );

      if (!hubspotResponse.ok) {
        const errorText = await hubspotResponse.text();
        console.error('HubSpot API error:', errorText);
        throw new Error(`HubSpot API error: ${hubspotResponse.status}`);
      }

      console.log('Successfully updated HubSpot deal');
    }

    // Get auth header for assigned_by
    const authHeader = req.headers.get('authorization');
    let assignedBy = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      assignedBy = user?.id || null;
    }

    // Record assignment in database
    const { data: assignment, error: assignmentError } = await supabase
      .from('lead_assignments')
      .insert({
        deal_id: dealId,
        investor_id: investorId,
        match_quality_score: matchQualityScore,
        calculated_score: calculatedScore,
        score_overridden: matchQualityScore !== calculatedScore,
        match_reasons: matchReasons,
        location_specificity: locationSpecificity,
        hubspot_company_id: investor.hubspot_company_id,
        attachment_status: 'attached',
        assigned_by: assignedBy,
        attached_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error recording assignment:', assignmentError);
      throw assignmentError;
    }

    // Update matching_queue - increment investors_attached
    const { data: queueItem } = await supabase
      .from('matching_queue')
      .select('investors_attached')
      .eq('deal_id', dealId)
      .single();

    const { error: queueError } = await supabase
      .from('matching_queue')
      .update({
        investors_attached: (queueItem?.investors_attached || 0) + 1,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('deal_id', dealId);

    if (queueError) {
      console.error('Error updating queue:', queueError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        investor: investor.company_name,
        assignment 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error attaching investor:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
