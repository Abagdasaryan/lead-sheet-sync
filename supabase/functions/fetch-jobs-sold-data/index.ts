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

    // For now, return mock data to test if the function deploys
    const mockData = [
      {
        client: 'Test Client 1',
        jobNumber: 'JOB001',
        rep: userRepSlug,
        leadSoldFor: 5000,
        paymentType: 'Finance',
        installDate: '2025-07-18',
        sfOrderId: 'SF001'
      },
      {
        client: 'Test Client 2', 
        jobNumber: 'JOB002',
        rep: userRepSlug,
        leadSoldFor: 7500,
        paymentType: 'Cash',
        installDate: '2025-07-17',
        sfOrderId: 'SF002'
      }
    ];

    console.log('Returning mock data for testing');
    
    return new Response(
      JSON.stringify({ rows: mockData }),
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