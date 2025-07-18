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

    // Fetch product details for line items
    let transformedLineItems = [];
    if (lineItems && lineItems.length > 0) {
      const productIds = lineItems.map((item: any) => item.productId);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, product2_id, pricebook2_id, unit_price')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
        // Continue with basic structure if product fetch fails
        transformedLineItems = lineItems.map((item: any) => ({
          OrderId: jobData.sfOrderId,
          Product2Id: item.productId,
          Quantity: item.quantity,
          UnitPrice: item.unitPrice,
          PricebookEntryId: null
        }));
      } else {
        // Create a map for quick product lookup
        const productMap = products.reduce((map: any, product: any) => {
          map[product.id] = product;
          return map;
        }, {});

        transformedLineItems = lineItems.map((item: any) => {
          const product = productMap[item.productId];
          return {
            OrderId: jobData.sfOrderId,
            Product2Id: product?.product2_id || item.productId,
            Quantity: item.quantity,
            UnitPrice: product?.unit_price || item.unitPrice,
            PricebookEntryId: product?.pricebook2_id || null
          };
        });
      }
    }

    // Prepare webhook payload with new schema
    const payload = transformedLineItems;

    console.log('Sending webhook to n8n:', webhookUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Send webhook to n8n
    let webhookResponse;
    let responseData = '';
    let webhookSuccess = false;
    
    try {
      console.log('=== WEBHOOK DEBUG INFO ===');
      console.log('Webhook URL:', webhookUrl);
      console.log('Payload size:', JSON.stringify(payload).length);
      console.log('Number of line items:', payload.length);
      console.log('About to send webhook request...');
      
      webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log('Webhook response received!');
      console.log('Status:', webhookResponse.status);
      console.log('Status text:', webhookResponse.statusText);
      console.log('Headers:', Object.fromEntries(webhookResponse.headers.entries()));
      
      responseData = await webhookResponse.text();
      console.log('Response body:', responseData);
      
      if (webhookResponse.ok) {
        webhookSuccess = true;
        console.log('✅ Webhook sent successfully');
      } else {
        console.error(`❌ Webhook failed with status: ${webhookResponse.status}, response: ${responseData}`);
      }
    } catch (fetchError) {
      console.error('❌ Error sending webhook:', fetchError);
      console.error('Error details:', fetchError.message);
      responseData = `Failed to send webhook: ${fetchError.message}`;
    }

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