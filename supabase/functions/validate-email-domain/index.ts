import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email domain - only allow @listwithclever.com and @movewithclever.com
    const allowedDomains = ['@listwithclever.com', '@movewithclever.com'];
    const emailDomain = email.substring(email.lastIndexOf('@')).toLowerCase();
    
    const isValid = allowedDomains.some(domain => emailDomain === domain.toLowerCase());
    
    if (!isValid) {
      console.log(`Invalid email domain attempted: ${emailDomain}`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Only @listwithclever.com and @movewithclever.com email addresses are allowed.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error validating email domain:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
