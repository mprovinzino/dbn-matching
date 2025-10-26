import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { zipCodeData } = await req.json();

    if (!zipCodeData || !Array.isArray(zipCodeData)) {
      return new Response(
        JSON.stringify({ error: 'Invalid data format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting import of ${zipCodeData.length} zip codes`);

    // Clear existing data first
    const { error: deleteError } = await supabaseAdmin
      .from('zip_code_reference')
      .delete()
      .neq('zip_code', '00000'); // Delete all

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      throw deleteError;
    }

    // Batch insert in chunks of 1000
    let imported = 0;
    const chunkSize = 1000;
    
    for (let i = 0; i < zipCodeData.length; i += chunkSize) {
      const chunk = zipCodeData.slice(i, i + chunkSize);
      
      const { error } = await supabaseAdmin
        .from('zip_code_reference')
        .insert(chunk);

      if (error) {
        console.error(`Error inserting chunk at index ${i}:`, error);
        throw error;
      }

      imported += chunk.length;
      console.log(`Imported ${imported}/${zipCodeData.length} zip codes`);
    }

    console.log(`Successfully imported ${imported} zip codes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported,
        total: zipCodeData.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
