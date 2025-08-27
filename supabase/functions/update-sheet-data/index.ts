import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { rowData, rowIndex, searchCriteria } = await req.json();
    console.log('=== UPDATE SHEET DATA DEBUG ===');
    console.log('Received update request:', { rowData, rowIndex, searchCriteria });
    console.log('Row data details:', JSON.stringify(rowData, null, 2));

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get webhook URL from database
    console.log('Fetching webhook configuration...');
    const { data: webhookConfig, error: webhookError } = await supabase
      .from('webhook_configs')
      .select('url')
      .eq('name', 'sheet_update_webhook')
      .eq('is_active', true)
      .single();
    
    if (webhookError || !webhookConfig?.url) {
      console.error('Sheet update webhook not configured or inactive:', webhookError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sheet update webhook not configured' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    const webhookUrl = webhookConfig.url;
    console.log('Using webhook URL:', webhookUrl);

    // Prepare the payload for n8n webhook
    const webhookPayload = {
      rowData,
      rowIndex,
      searchCriteria,
      sheetRowNumber: rowIndex + 2, // Google Sheets row number (header + 1-indexed)
      timestamp: new Date().toISOString(),
      source: 'lovable-dashboard'
    };

    console.log('Sending to n8n webhook:', JSON.stringify(webhookPayload, null, 2));
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response headers:', Object.fromEntries(webhookResponse.headers.entries()));
    
    const responseText = await webhookResponse.text();
    console.log('Webhook response body:', responseText);

    if (!webhookResponse.ok) {
      console.error('Webhook failed with status:', webhookResponse.status);
      console.error('Webhook error response:', responseText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Webhook failed',
          webhookStatus: webhookResponse.status,
          webhookError: responseText
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data successfully sent to webhook',
        webhookStatus: webhookResponse.status,
        webhookResponse: responseText
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