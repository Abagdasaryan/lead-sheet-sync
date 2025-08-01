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
    const { jobData, lineItems } = await req.json();
    
    // Initialize Supabase client first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webhook URL from database
    const { data: webhookConfig, error: webhookError } = await supabase
      .from('webhook_configs')
      .select('url')
      .eq('name', 'job_webhook')
      .eq('is_active', true)
      .single();
    
    if (webhookError || !webhookConfig?.url) {
      console.error('Job webhook not configured or inactive:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Job webhook not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const webhookUrl = webhookConfig.url;

    // Supabase client already initialized above

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

    // Get user's profile to match with rep field
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    // Find existing job or create if doesn't exist
    let jobId;
    const { data: existingJobs } = await supabase
      .from('jobs_sold')
      .select('id')
      .eq('sf_order_id', jobData.sfOrderId)
      .eq('rep', userProfile?.full_name);

    if (existingJobs && existingJobs.length > 0) {
      jobId = existingJobs[0].id;
      console.log('Using existing job ID:', jobId);
    } else {
      // Create job if it doesn't exist
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
      jobId = savedJob.id;
      console.log('Created new job ID:', jobId);
    }

    // Check if line items already exist for this job
    const { data: existingLineItems } = await supabase
      .from('job_line_items')
      .select('id')
      .eq('job_id', jobId);

    // Only save line items if none exist yet (avoid duplicates)
    if (lineItems && lineItems.length > 0 && (!existingLineItems || existingLineItems.length === 0)) {
      const lineItemsToInsert = lineItems.map((item: any) => ({
        job_id: jobId,
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
    } else if (existingLineItems && existingLineItems.length > 0) {
      console.log('Line items already exist for this job, skipping insertion');
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
          ProductName: item.productName,
          Quantity: item.quantity,
          UnitPrice: item.unitPrice,
          PricebookEntryId: null,
          installDate: jobData.installDate,
          jobNumber: jobData.jobNumber
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
            ProductName: item.productName,
            Quantity: item.quantity,
            UnitPrice: product?.unit_price || item.unitPrice,
            PricebookEntryId: product?.pricebook2_id || null,
            installDate: jobData.installDate,
            jobNumber: jobData.jobNumber
          };
        });
      }
    }

    // Prepare webhook payload - now just the line items array with embedded data
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
        
        // Mark webhook as sent in the database
        await supabase
          .from('jobs_sold')
          .update({ webhook_sent_at: new Date().toISOString() })
          .eq('id', jobId);
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
        jobId: jobId,
        webhookSuccess: webhookSuccess,
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