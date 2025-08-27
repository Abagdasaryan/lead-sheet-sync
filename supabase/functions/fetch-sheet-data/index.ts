import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    
    // Validate required fields
    if (!requestBody || typeof requestBody !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { userFullName, requestId } = requestBody;
    
    // Validate userFullName is provided
    if (!userFullName) {
      return new Response(
        JSON.stringify({ error: 'userFullName is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Sanitize inputs
    const sanitizedUserFullName = userFullName ? String(userFullName).substring(0, 100) : null;
    console.log('Request details:', { userFullName: sanitizedUserFullName, requestId });
    console.log('Fetching leads data for user full name:', sanitizedUserFullName);

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

    // Get sheet configuration from database
    const { data: sheetConfig, error: configError } = await supabase
      .from('sheet_configs')
      .select('spreadsheet_id')
      .eq('name', 'leads_sheet')
      .eq('is_active', true)
      .single();

    if (configError || !sheetConfig) {
      console.error('Failed to get sheet configuration:', configError);
      return new Response(
        JSON.stringify({ error: 'Sheet configuration not found or inactive' }),
        { 
          status: 500, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const spreadsheetId = sheetConfig.spreadsheet_id;
    const range = 'A1:ZZ15000';
    console.log('Using LEADS sheet');
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
    
    console.log('Headers found:', headers);
    console.log('Total rows to process:', rows.length);
    
    // DEBUG: Log all headers to see what columns exist
    console.log('=== ALL HEADERS DEBUG ===');
    headers.forEach((header, index) => {
      console.log(`Column ${index}: "${header}"`);
    });
    
    // DEBUG: Check if RepAssigned column exists
    const repAssignedIndex = headers.findIndex(h => h.toLowerCase().includes('assigned') || h.toLowerCase().includes('rep'));
    console.log('RepAssigned-like columns found at indices:', 
      headers.map((h, i) => ({ index: i, header: h })).filter(item => 
        item.header.toLowerCase().includes('assigned') || 
        item.header.toLowerCase().includes('rep')
      )
    );

    // Leads Sheet schema
    const allowedColumns = ['date', 'CLIENT NAME', 'AppointmentName', 'Status', 'Lost Reason', 'Last Price'];
    const slugColumn = 'RepAssigned';
    console.log('Using LEADS schema');
    console.log('Looking for slug column:', slugColumn);
    console.log('Expected data columns:', allowedColumns);
    
    // Find the RepAssigned column for leads
    const slugIndex = headers.findIndex(header => {
      const lowerHeader = header.toLowerCase().trim();
      const targetSlug = slugColumn.toLowerCase().replace(/_/g, '');
      return lowerHeader.includes(targetSlug) || 
             lowerHeader.replace(/[_\s]/g, '') === targetSlug ||
             lowerHeader === slugColumn.toLowerCase();
    });
    
    if (slugIndex === -1) {
      console.log(`${slugColumn} column not found in headers:`, headers);
      console.log('=== COLUMN SEARCH DEBUG ===');
      console.log('Looking for column containing:', slugColumn.toLowerCase());
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase().trim();
        const targetSlug = slugColumn.toLowerCase().replace(/_/g, '');
        console.log(`Header "${header}" (index ${index}): normalized="${lowerHeader}", target="${targetSlug}"`);
        console.log(`  - includes target: ${lowerHeader.includes(targetSlug)}`);
        console.log(`  - replace spaces/underscores: ${lowerHeader.replace(/[_\s]/g, '')} === ${targetSlug} : ${lowerHeader.replace(/[_\s]/g, '') === targetSlug}`);
      });
      throw new Error(`${slugColumn} column not found in the sheet`);
    }
    
    console.log(`${slugColumn} column found at index:`, slugIndex);
    
    // Use column C (index 2) for leads date
    const dateColumnIndex = 2;
    console.log('Using date column index:', dateColumnIndex);
    console.log('Date column header:', headers[dateColumnIndex]);
    
    // Helper function to normalize values for comparison
    const normalizeValue = (value) => {
      if (!value) return '';
      return value.toLowerCase().trim().replace(/\s+/g, '');
    };
    
    console.log('=== FILTERING DEBUG ===');
    console.log('userFullName:', sanitizedUserFullName);
    console.log('Filter value:', sanitizedUserFullName);

    // First, let's see all unique values in the RepAssigned column for debugging
    const uniqueRepAssigned = [...new Set(rows.map(row => row[slugIndex]).filter(Boolean))];
    console.log('All unique RepAssigned values in sheet:', uniqueRepAssigned.slice(0, 20)); // Show first 20
    console.log('=== EXACT VALUES DEBUG ===');
    uniqueRepAssigned.slice(0, 10).forEach((value, index) => {
      console.log(`Value ${index + 1}: "${value}" (length: ${value?.length})`);
    });
    
    // Also check for partial matches to see if there are variations
    const potentialMatches = rows.filter((row, index) => {
      const slugValue = row[slugIndex];
      if (!slugValue) return false;
      const slugValueLower = slugValue.toLowerCase().trim();
      const fullNameLower = sanitizedUserFullName?.toLowerCase().trim() || '';
      return slugValueLower.includes(fullNameLower.split(' ')[0]) || slugValueLower.includes(fullNameLower.split(' ')[1]);
    });
    console.log('Potential matches containing name parts:', potentialMatches.length);
    potentialMatches.slice(0, 10).forEach((row, index) => {
      console.log(`Potential match ${index + 1}:`, {
        repAssigned: row[slugIndex],
        date: row[dateColumnIndex],
        client: row[headers.findIndex(h => h.toLowerCase().includes('client'))] || 'N/A',
        rowIndex: rows.indexOf(row) + 1
      });
    });

    // Filter rows using the appropriate slug column
    const filteredRows = rows.filter((row, index) => {
      const slugValue = row[slugIndex];
      const slugValueNormalized = normalizeValue(slugValue);
      const filterValueNormalized = normalizeValue(sanitizedUserFullName);
      
      // Check slug match
      const isSlugMatch = slugValueNormalized === filterValueNormalized;
      
      // For leads, return all matches (date filtering is done on frontend)
      if (isSlugMatch) {
        console.log(`✓ EXACT MATCH found at row ${index + 1}:`, {
          slugValue: slugValue,
          normalized: slugValueNormalized,
          date: row[dateColumnIndex],
          client: row[headers.findIndex(h => h.toLowerCase().includes('client'))] || 'N/A'
        });
      }
      
      return isSlugMatch;
    });
    
    console.log('Total rows checked:', rows.length);
    console.log('Filtered rows count:', filteredRows.length);
    
    // Find the indices of allowed columns with exact matching for critical fields
    const columnIndices = allowedColumns.map(allowedCol => {
      let index = -1;
      
      // Special handling for specific columns to ensure correct mapping
      if (allowedCol === 'AppointmentName') {
        index = headers.findIndex(header => 
          header.toLowerCase().trim() === 'appointmentname' ||
          header === 'AppointmentName'
        );
      } else if (allowedCol === 'Status') {
        // Map to "Status" column, not "AppointmentStatus"
        index = headers.findIndex(header => 
          header === 'Status'
        );
      } else {
        // For other columns, use flexible matching
        index = headers.findIndex(header => {
          const headerLower = header.toLowerCase().replace(/[_\s]/g, '');
          const allowedLower = allowedCol.toLowerCase().replace(/[_\s]/g, '');
          return headerLower === allowedLower || 
                 headerLower.includes(allowedLower) ||
                 allowedLower.includes(headerLower);
        });
      }
      
      return { name: allowedCol, index, originalName: index >= 0 ? headers[index] : null };
    }).filter(col => col.index >= 0);

    console.log('Column mapping:', columnIndices);

    // Convert to objects with mapped column names
    const processedRows = filteredRows.map(row => {
      const obj: Record<string, string> = {};
      columnIndices.forEach(({ name, index }) => {
        obj[name] = row[index] || '';
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