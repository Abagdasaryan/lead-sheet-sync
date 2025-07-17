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

    // Update Google Sheets directly with known column positions
    const spreadsheetId = '1LBrM_EJg5FFQgg1xcJTKRjdgND-35po1_FHeToz1yzQ';
    
    // Calculate the actual row number in the sheet (adding 2 for header + 0-based index)
    const sheetRowNumber = rowIndex + 2;
    
    // Known column positions from the working fetch function
    // Status = Column K (index 10), Lost Reason = Column L (index 11), Last Price = Column M (index 12)
    const updates = [];
    
    if (rowData.Status) {
      updates.push({
        range: `K${sheetRowNumber}`, // Status column
        values: [[rowData.Status]]
      });
    }
    
    if (rowData['Lost Reason'] !== undefined) {
      updates.push({
        range: `L${sheetRowNumber}`, // Lost Reason column
        values: [[rowData['Lost Reason'] || '']]
      });
    }
    
    if (rowData['Last Price'] !== undefined) {
      // Remove $ and commas for storage
      const priceValue = rowData['Last Price'].toString().replace(/[$,]/g, '');
      updates.push({
        range: `M${sheetRowNumber}`, // Last Price column
        values: [[priceValue]]
      });
    }

    console.log('Preparing to update cells:', updates);

    // Perform batch update
    if (updates.length > 0) {
      const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      
      const batchUpdateResponse = await fetch(batchUpdateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updates
        })
      });

      if (!batchUpdateResponse.ok) {
        const errorText = await batchUpdateResponse.text();
        console.error('Batch update failed:', {
          status: batchUpdateResponse.status,
          statusText: batchUpdateResponse.statusText,
          errorText: errorText
        });
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to update sheet: ${batchUpdateResponse.status} ${batchUpdateResponse.statusText}`,
            details: errorText
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const updateResult = await batchUpdateResponse.json();
      console.log('Sheet update successful:', updateResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sheet updated successfully',
          updatedCells: updates.length 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No updates needed' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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