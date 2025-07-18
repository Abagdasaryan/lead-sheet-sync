const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleSheetsResponse {
  values: string[][];
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('=== EDGE FUNCTION START ===');
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { userRepSlug } = requestBody;
    console.log('Fetching jobs sold data for rep slug:', userRepSlug);

    // Get service account credentials from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('Google service account credentials not found');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Service account loaded for:', serviceAccount.client_email);

    // Generate JWT and get access token
    console.log('Generating JWT...');
    const jwt = await generateJWT(serviceAccount);
    console.log('JWT generated successfully, getting access token...');
    const accessToken = await getAccessToken(jwt);
    console.log('Access token obtained, length:', accessToken.length);

    // Jobs sold sheet ID
    const spreadsheetId = '1dIUosPCFVqn3UCU34X_XS4VZbXI6At8pE1lScoYp_TA';
    const range = 'A1:ZZ8000'; // Search entire sheet
    
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Range:', range);
    console.log('Making request to:', `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`);

    // Fetch data from Google Sheets
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Google Sheets API response status:', sheetsResponse.status);
    console.log('Google Sheets API response headers:', Object.fromEntries(sheetsResponse.headers.entries()));

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Google Sheets API error:', errorText);
      throw new Error(`Google Sheets API error: ${sheetsResponse.status} ${errorText}`);
    }

    const sheetsData: GoogleSheetsResponse = await sheetsResponse.json();
    console.log('Raw sheet data received, rows:', sheetsData.values?.length || 0);

    if (!sheetsData.values || sheetsData.values.length === 0) {
      return new Response(
        JSON.stringify({ rows: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = sheetsData.values[0];
    const rows = sheetsData.values.slice(1);

    console.log('Headers found:', headers);
    console.log('Total rows to process:', rows.length);

    // Find column indices
    const repSlugIndex = headers.findIndex(h => h?.toLowerCase().includes('rep_slug') || h?.toLowerCase().includes('repslug'));
    const installDateIndex = headers.findIndex(h => h?.toLowerCase().includes('install_date') || h?.toLowerCase().includes('installdate'));
    const clientIndex = headers.findIndex(h => h?.toLowerCase().includes('client') || h?.toLowerCase().includes('customer'));
    const jobNumberIndex = headers.findIndex(h => h?.toLowerCase().includes('job_number') || h?.toLowerCase().includes('jobnumber'));
    const leadSoldForIndex = headers.findIndex(h => h?.toLowerCase().includes('lead_sold_for') || h?.toLowerCase().includes('amount') || h?.toLowerCase().includes('price'));
    const paymentTypeIndex = headers.findIndex(h => h?.toLowerCase().includes('payment_type') || h?.toLowerCase().includes('paymenttype'));
    const sfOrderIdIndex = headers.findIndex(h => h?.toLowerCase().includes('sf_order_id') || h?.toLowerCase().includes('order_id') || h?.toLowerCase().includes('salesforce'));

    console.log('Column indices found:');
    console.log('Rep Slug:', repSlugIndex);
    console.log('Install Date:', installDateIndex);
    console.log('Client:', clientIndex);
    console.log('Job Number:', jobNumberIndex);
    console.log('Lead Sold For:', leadSoldForIndex);
    console.log('Payment Type:', paymentTypeIndex);
    console.log('SF Order ID:', sfOrderIdIndex);

    if (repSlugIndex === -1 || installDateIndex === -1) {
      console.error('Required columns not found');
      return new Response(
        JSON.stringify({ error: 'Required columns (rep_slug, install_date) not found in sheet' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate 7 days ago for filtering (install_date > 7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log('Seven days ago cutoff (jobs must be after this date):', sevenDaysAgo.toISOString());

    // Filter and process rows
    console.log('=== STARTING ROW FILTERING ===');
    console.log('Looking for rep slug:', userRepSlug);
    
    const filteredRows = rows
      .filter(row => {
        const repSlug = row[repSlugIndex]?.trim();
        const installDateStr = row[installDateIndex]?.trim();

        console.log(`Row check - Rep slug: "${repSlug}", Install date: "${installDateStr}"`);

        // Check rep slug match
        if (!repSlug || repSlug.toLowerCase() !== userRepSlug.toLowerCase()) {
          console.log(`❌ Rep slug mismatch: "${repSlug}" !== "${userRepSlug}"`);
          return false;
        }
        
        console.log(`✅ Rep slug match: "${repSlug}" === "${userRepSlug}"`);

        // Check date filter (install_date > 7 days ago)
        if (installDateStr) {
          try {
            const installDate = new Date(installDateStr);
            console.log(`Date check: ${installDate.toISOString()} > ${sevenDaysAgo.toISOString()}?`);
            if (installDate <= sevenDaysAgo) {
              console.log(`❌ Date too old: ${installDate.toISOString()} <= ${sevenDaysAgo.toISOString()}`);
              return false;
            }
            console.log(`✅ Date within range: ${installDate.toISOString()} > ${sevenDaysAgo.toISOString()}`);
          } catch (error) {
            console.warn('Invalid date format:', installDateStr);
            return false;
          }
        }

        return true;
      })
      .map(row => {
        const mappedRow = {
          client: row[clientIndex] || '',
          jobNumber: row[jobNumberIndex] || '',
          rep: userRepSlug,
          leadSoldFor: parseFloat(row[leadSoldForIndex]?.replace(/[$,]/g, '') || '0'),
          paymentType: row[paymentTypeIndex] || '',
          installDate: row[installDateIndex] || '',
          sfOrderId: row[sfOrderIdIndex] || '',
        };
        console.log('Mapped row:', mappedRow);
        return mappedRow;
      });

    console.log('=== FILTERING COMPLETE ===');
    console.log('Filtered rows count:', filteredRows.length);
    console.log('Final filtered data:', filteredRows);

    return new Response(
      JSON.stringify({ rows: filteredRows }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching jobs sold data:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch jobs sold data', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function generateJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  console.log('Processing private key...');
  const privateKey = serviceAccount.private_key;
  
  // Clean up the PEM format
  const pemContent = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  
  console.log('PEM content length after cleanup:', pemContent.length);

  // Decode base64 to get DER format
  const binaryString = atob(pemContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  console.log('DER binary length:', bytes.length);

  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Create JWT
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${signatureInput}.${signatureB64}`;
}

async function getAccessToken(jwt: string): Promise<string> {
  console.log('Requesting access token...');
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  console.log('Access token response status:', tokenResponse.status);

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token request failed:', errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('Access token received successfully');
  
  return tokenData.access_token;
}