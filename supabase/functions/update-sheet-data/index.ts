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

    // Calculate the actual row number in the sheet (adding 2 for header + 0-based index)
    const sheetRowNumber = rowIndex + 2;
    console.log('Sheet row number:', sheetRowNumber);

    // Prepare the payload for n8n webhook
    const webhookPayload = {
      rowData,
      rowIndex,
      sheetRowNumber,
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

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook request failed:', {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        errorText: errorText
      });
      throw new Error(`Webhook request failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    const responseData = await webhookResponse.text();
    console.log('Webhook response:', responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data sent to n8n webhook successfully',
        webhookResponse: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing update:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});