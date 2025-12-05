import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl } = await req.json();
    
    const testPayload = {
      rowData: {
        date: "12/5/2025",
        "CLIENT NAME": "TEST CLIENT",
        AppointmentName: "Test Appointment",
        Status: "Closed - Won",
        "Lost Reason": "",
        "Last Price": "$5000",
        GutterDowns_Footage: "150",
        Guard_Footage: "200",
        Par_Price: "$4500"
      },
      rowIndex: 0,
      searchCriteria: {
        date: "12/5/2025",
        clientName: "TEST CLIENT",
        appointmentName: "Test Appointment"
      },
      sheetRowNumber: 2,
      timestamp: new Date().toISOString(),
      source: "lovable-dashboard-test"
    };

    console.log('Sending test payload to:', webhookUrl);
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    console.log('Webhook response status:', response.status);
    console.log('Webhook response:', responseText);

    return new Response(
      JSON.stringify({ 
        success: response.ok, 
        status: response.status,
        response: responseText 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
