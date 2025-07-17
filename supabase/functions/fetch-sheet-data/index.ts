import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleSheetsResponse {
  values: string[][];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, filterDate } = await req.json();
    console.log('Fetching data for user email:', userEmail, 'filterDate:', filterDate);

    // Get Google Service Account credentials from environment
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('Google Service Account JSON not found in environment variables');
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Service account loaded for:', serviceAccount.client_email);

    // Get access token using JWT
    console.log('Generating JWT...');
    const jwt = await generateJWT(serviceAccount);
    console.log('JWT generated successfully, getting access token...');
    const accessToken = await getAccessToken(jwt);
    console.log('Access token obtained, length:', accessToken.length);

    // Using the provided sandbox Google Sheet
    const spreadsheetId = '1LBrM_EJg5FFQgg1xcJTKRjdgND-35po1_FHeToz1yzQ';
    const range = 'A1:Z1000'; // Simplified range without sheet name
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Range:', range);

    // Fetch data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    console.log('Making request to:', sheetsUrl);
    
    const response = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Google Sheets API response status:', response.status);
    console.log('Google Sheets API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Google Sheets API error response:', errorText);
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GoogleSheetsResponse = await response.json();
    console.log('Raw sheet data received, rows:', data.values?.length || 0);

    if (!data.values || data.values.length === 0) {
      return new Response(JSON.stringify({ rows: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process the data - first row is headers
    const headers = data.values[0];
    const rows = data.values.slice(1);

    // Find the RepEmail column index
    const repEmailIndex = headers.findIndex(header => 
      header.toLowerCase().includes('repemail') || 
      header.toLowerCase().includes('rep email') ||
      header.toLowerCase() === 'repemail'
    );

    if (repEmailIndex === -1) {
      console.log('RepEmail column not found in headers:', headers);
      throw new Error('RepEmail column not found in the sheet');
    }

    console.log('RepEmail column found at index:', repEmailIndex);

    // Date is in column C (index 2)
    const dateColumnIndex = 2;
    console.log('Using column C (index 2) for date filtering');

    // Filter rows by user email and optionally by date
    const filteredRows = rows.filter(row => {
      const repEmail = row[repEmailIndex];
      
      // First filter by email
      if (!repEmail || repEmail.toLowerCase() !== userEmail.toLowerCase()) {
        return false;
      }

      // If no date filter is specified, return the row
      if (!filterDate) {
        return true;
      }

      // Check if the row's date matches the filter date
      const rowDate = row[dateColumnIndex];
      if (!rowDate) {
        return false;
      }

      // Parse the date in format "7/2/2025" and compare
      try {
        // Handle the MM/DD/YYYY or M/D/YYYY format
        const parsedRowDate = new Date(rowDate);
        const filterDateObj = new Date(filterDate);
        
        // Compare dates (ignore time)
        return parsedRowDate.toDateString() === filterDateObj.toDateString();
      } catch (error) {
        console.log('Error parsing date:', rowDate, error);
        return false;
      }
    });

    console.log('Filtered rows for user:', filteredRows.length);

    // Convert to objects with headers as keys
    const processedRows = filteredRows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return new Response(JSON.stringify({ rows: processedRows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-sheet-data function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  try {
    console.log('Processing private key...');
    
    // Convert PEM private key to DER format
    let privateKeyPem = serviceAccount.private_key;
    
    // Remove PEM headers/footers and whitespace
    privateKeyPem = privateKeyPem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/\s/g, '');
    
    console.log('PEM content length after cleanup:', privateKeyPem.length);
    
    // Decode base64 to get DER format
    const binaryDer = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
    console.log('DER binary length:', binaryDer.length);
    
    // Import the private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Sign the JWT
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${signatureInput}.${encodedSignature}`;
  } catch (error) {
    console.error('Error in generateJWT:', error);
    throw new Error(`JWT generation failed: ${error.message}`);
  }
}

async function getAccessToken(jwt: string): Promise<string> {
  console.log('Requesting access token...');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  console.log('Access token response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.log('Access token error response:', errorText);
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Access token received successfully');
  return data.access_token;
}