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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const dealData = await req.json();
    console.log('Received deal from HubSpot:', dealData);

    // Extract deal properties
    const properties = dealData.properties || {};
    
    // Insert into matching_queue
    const { data, error } = await supabase
      .from('matching_queue')
      .insert({
        deal_id: dealData.id || dealData.objectId,
        deal_name: properties.dealname,
        autosourcer_id: properties.autosourcer_id,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zip_code: properties.zip,
        property_type: properties.property_type,
        condition: properties.property_condition,
        year_built: properties.year_built ? parseInt(properties.year_built) : null,
        ask_price: properties.amount ? parseFloat(properties.amount) : null,
        arv: properties.arv ? parseFloat(properties.arv) : null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting into queue:', error);
      throw error;
    }

    console.log('Deal added to matching queue:', data);

    return new Response(
      JSON.stringify({ success: true, queueItem: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
