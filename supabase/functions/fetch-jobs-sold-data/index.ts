const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('=== EDGE FUNCTION START ===');
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { userRepSlug, requestId } = requestBody;
    console.log('Fetching jobs sold data for rep slug:', userRepSlug);
    console.log('Request ID:', requestId);

    // Get the authorization header for database access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Call the fetch-sheet-data function to get Google Sheets data
    const sheetResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-sheet-data`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
      },
      body: JSON.stringify({
        userEmail: requestBody.userEmail || 'abgutterinstall@gmail.com',
        userAlias: userRepSlug,
        sheetType: 'jobs-sold',
        requestId
      })
    });

    if (!sheetResponse.ok) {
      throw new Error(`Sheet fetch failed: ${sheetResponse.status}`);
    }

    const sheetData = await sheetResponse.json();
    console.log('Sheet data received:', JSON.stringify(sheetData, null, 2));

    // Now fetch database data to check status and merge
    const dbResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/jobs_sold?select=sf_order_id,webhook_sent_at,id`, {
      headers: {
        'Authorization': authHeader,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
        'Content-Type': 'application/json'
      }
    });

    let existingJobs = [];
    if (dbResponse.ok) {
      existingJobs = await dbResponse.json();
      console.log('Existing jobs in database:', existingJobs.length);
    }

    // Create a map for quick lookup
    const jobStatusMap = new Map(
      existingJobs.map(job => [job.sf_order_id, {
        id: job.id,
        webhookSent: !!job.webhook_sent_at,
        webhookSentAt: job.webhook_sent_at
      }])
    );

    // Merge sheet data with database status
    const enrichedRows = sheetData.rows.map(row => {
      const dbStatus = jobStatusMap.get(row.sf_order_id);
      return {
        ...row,
        // Convert price_sold to lead_sold_for for backwards compatibility
        lead_sold_for: parseFloat(row.price_sold) || 0,
        leadSoldFor: parseFloat(row.price_sold) || 0,
        // Add database status
        hasLineItems: !!dbStatus,
        webhookSent: dbStatus?.webhookSent || false,
        webhookSentAt: dbStatus?.webhookSentAt || null,
        jobId: dbStatus?.id || null
      };
    });

    console.log('Enriched data with database status:', enrichedRows.length, 'rows');
    
    return new Response(
      JSON.stringify({ rows: enrichedRows }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ error: 'Edge function error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}