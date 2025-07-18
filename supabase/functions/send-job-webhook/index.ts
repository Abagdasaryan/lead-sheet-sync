import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, jobData, lineItems } = await req.json();

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ error: 'Webhook URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare the payload for n8n
    const payload = {
      job: jobData,
      lineItems: lineItems,
      timestamp: new Date().toISOString(),
      source: 'lovable-jobs-app'
    };

    console.log('Sending webhook to n8n:', webhookUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Send webhook to n8n
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed with status: ${webhookResponse.status}`);
    }

    const responseData = await webhookResponse.text();
    console.log('n8n webhook response:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook sent successfully',
        response: responseData 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send webhook', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});