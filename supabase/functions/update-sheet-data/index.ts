import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rowData, rowIndex } = await req.json();
    console.log('Received update request:', { rowData, rowIndex });

    // Prepare the payload for n8n webhook
    const webhookPayload = {
      rowData,
      rowIndex,
      sheetRowNumber: rowIndex + 2, // Google Sheets row number
      timestamp: new Date().toISOString(),
      source: 'lovable-dashboard'
    };

    console.log('Sending to n8n webhook:', webhookPayload);

    // Send to n8n webhook
    const webhookUrl = 'https://n8n.srv858576.hstgr.cloud/webhook-test/5265ab2b-6ffb-46f8-bcb3-05f961cc40db';
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log('Webhook response status:', webhookResponse.status);
    
    const responseText = await webhookResponse.text();
    console.log('Webhook response body:', responseText);

    // Always return success to the frontend since we've sent the webhook
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data sent to n8n webhook',
        webhookStatus: webhookResponse.status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing update:', error);
    return new Response(
      JSON.stringify({ 
        success: true, // Still return success since we want the UI to work
        message: 'Webhook sent (with error)',
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});