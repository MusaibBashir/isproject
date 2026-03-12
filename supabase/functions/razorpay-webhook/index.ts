import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
// Removed external hmac import due to denopkg.com deployment block

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!secret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not set')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Read the raw body text for signature verification
    const bodyText = await req.text()
    
    // Verify signature using native Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(bodyText)
    );
    // Convert buffer to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (expectedSignature !== signature) {
      console.error('Invalid signature')
      return new Response('Invalid signature', { status: 400 })
    }

    // Parse the payload now that signature is verified
    const event = JSON.parse(bodyText)
    console.log(`Received verified Razorpay webhook: ${event.event}`)

    // Create a Supabase client with the Service Role key
    // This allows us to bypass RLS and update any matching sale
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle payment.captured event (successful payment)
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload.payment.entity
      const paymentId = payment.id
      const method = payment.method // upi, card, netbanking, etc

      // We need to look up the sale containing this payment ID
      // Since Option A was chosen, the frontend already inserted the sale
      // with the paymentID stored in the JSONB payment_details column or via transactionId
      console.log(`Processing payment: ${paymentId}`)

      // Update the sale to specifically mark this payment as verified by webhook
      // First find the sale that has this payment ID inside its payment_details JSONB
      // Assuming frontend stores `{ "method": amount, "razorpay_payment_id": "pay_xyz" }`
      // Or we can just search if it's in the payment_details anywhere
      
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .contains('payment_details', { razorpay_payment_id: paymentId })
        .maybeSingle()

      if (error) {
        console.error('Error finding sale:', error)
      } else if (data) {
        // Update the sale to indicate it was verified by webhook
        const updatedPaymentDetails = {
          ...data.payment_details,
          webhook_verified: true,
          webhook_verified_at: new Date().toISOString()
        }

        await supabase
          .from('sales')
          .update({ payment_details: updatedPaymentDetails })
          .eq('id', data.id)
          
        console.log(`Successfully verified and updated sale: ${data.id}`)
      } else {
        console.log(`Sale with payment ID ${paymentId} not found. The frontend might still be inserting it, or it was never inserted.`)
        // NOTE: If you decide to go with Option B later, this is where you would update the "pending" sale to "completed"
      }
    }

    // Respond to Razorpay immediately
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(`Error processing webhook: ${error.message}`, { status: 400 })
  }
})
