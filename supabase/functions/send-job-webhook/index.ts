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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user ID from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save job to Supabase
    const { data: savedJob, error: jobError } = await supabase
      .from('jobs_sold')
      .insert({
        user_id: user.id,
        client: jobData.client,
        job_number: jobData.jobNumber,
        rep: jobData.rep,
        lead_sold_for: jobData.leadSoldFor,
        payment_type: jobData.paymentType,
        install_date: jobData.installDate,
        sf_order_id: jobData.sfOrderId
      })
      .select()
      .single();

    if (jobError) {
      console.error('Error saving job:', jobError);
      return new Response(
        JSON.stringify({ error: 'Failed to save job to database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save line items to Supabase
    if (lineItems && lineItems.length > 0) {
      const lineItemsToInsert = lineItems.map((item: any) => ({
        job_id: savedJob.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { error: lineItemsError } = await supabase
        .from('job_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        console.error('Error saving line items:', lineItemsError);
        // Continue with webhook even if line items fail
      }
    }

    // Prepare webhook payload
    const payload = {
      jobData,
      lineItems: lineItems || [],
      timestamp: new Date().toISOString(),
      source: 'lovable-jobs-sold',
      supabaseJobId: savedJob.id
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
        message: 'Job saved and webhook sent successfully',
        jobId: savedJob.id,
        response: responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-job-webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process job', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});