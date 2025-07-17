import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleSheetsResponse {
  values: string[][];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { rowData, rowIndex } = await req.json();
    console.log('Updating row data:', { rowData, rowIndex });

    // Get Google Service Account credentials from environment variables
    const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      throw new Error("Google Service Account JSON not found in environment variables");
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('Service account loaded for:', serviceAccount.client_email);

    // Generate JWT and get access token
    const jwt = await generateJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);
    console.log('Access token obtained for Google Sheets update');

    // Update Google Sheets - using a simpler single cell update approach
    const spreadsheetId = '1LBrM_EJg5FFQgg1xcJTKRjdgND-35po1_FHeToz1yzQ';
    
    // Calculate the actual row number in the sheet (adding 2 for header + 0-based index)
    const sheetRowNumber = rowIndex + 2;
    console.log('Updating row number:', sheetRowNumber);
    
    // Update each field individually using the column letters from the headers we know:
    // From the working function, we know: Status=K(10), Lost Reason=L(11), Last Price=M(12)
    const updates = [];
    
    if (rowData.Status) {
      console.log('Adding Status update:', rowData.Status);
      updates.push({
        range: `Status!K${sheetRowNumber}`,
        values: [[rowData.Status]]
      });
    }
    
    if (rowData['Lost Reason'] !== undefined) {
      console.log('Adding Lost Reason update:', rowData['Lost Reason']);
      updates.push({
        range: `Lost Reason!L${sheetRowNumber}`,
        values: [[rowData['Lost Reason'] || '']]
      });
    }
    
    if (rowData['Last Price'] !== undefined) {
      const priceValue = rowData['Last Price'].toString().replace(/[$,]/g, '');
      console.log('Adding Last Price update:', priceValue);
      updates.push({
        range: `Last Price!M${sheetRowNumber}`,
        values: [[priceValue]]
      });
    }

    console.log('Total updates to make:', updates.length);

    // Use individual cell updates instead of batch update
    let successCount = 0;
    for (const update of updates) {
      try {
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${update.range}?valueInputOption=USER_ENTERED`;
        
        console.log('Updating cell:', update.range, 'with value:', update.values[0][0]);
        
        const cellUpdateResponse = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: update.values
          })
        });

        if (!cellUpdateResponse.ok) {
          const errorText = await cellUpdateResponse.text();
          console.error('Cell update failed for', update.range, ':', {
            status: cellUpdateResponse.status,
            statusText: cellUpdateResponse.statusText,
            errorText: errorText
          });
        } else {
          successCount++;
          console.log('Successfully updated:', update.range);
        }
      } catch (error) {
        console.error('Error updating cell', update.range, ':', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${successCount} of ${updates.length} fields`,
        updatedCells: successCount 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error updating sheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Helper function to generate JWT for Google API authentication
async function generateJWT(serviceAccount: any): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/spreadsheets https://www.googleapis.com/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Convert PEM private key to binary
  const pemKey = serviceAccount.private_key;
  const pemContent = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0));

  // Import the private key
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${unsignedToken}.${encodedSignature}`;
}

// Helper function to get access token from Google
async function getAccessToken(jwt: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}