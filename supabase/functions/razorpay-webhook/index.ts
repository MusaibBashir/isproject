import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle payment.captured or payment.authorized events
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload.payment.entity
      const paymentId = payment.id

      console.log(`Processing payment: ${paymentId}`)

      // 1. CAPTURE THE PAYMENT (only needed for payment.authorized)
      // If the payment is already captured, Razorpay returns 400 with "already been captured" — treat that as OK.
      if (event.event === 'payment.authorized') {
        const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (rzpKeyId && rzpKeySecret) {
          console.log(`Attempting to auto-capture payment ${paymentId} for amount ${payment.amount}...`)
          try {
            const authHeader = "Basic " + btoa(`${rzpKeyId}:${rzpKeySecret}`);
            const captureRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
              },
              body: JSON.stringify({
                amount: payment.amount,
                currency: payment.currency
              })
            })
            
            if (!captureRes.ok) {
              const errorText = await captureRes.text()
              // Check if payment was already captured — that's fine, treat it as success
              if (captureRes.status === 400 && errorText.includes('already been captured')) {
                console.log(`Payment ${paymentId} was already captured — continuing with sale update.`)
              } else {
                console.error(`Razorpay capture API failed with status ${captureRes.status}: ${errorText}`)
              }
            } else {
              console.log(`Successfully captured payment ${paymentId}`)
            }
          } catch (e) {
            console.error(`Error during payment capture:`, e)
          }
        } else {
          console.log(`Skipping auto-capture: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET missing from environment.`)
        }
      }

      // 2. WAIT FOR FRONTEND TO INSERT SALE RECORD (with retry loop)
      // The webhook fires quickly, but the frontend React app makes several sequential DB calls
      // (find/create customer, insert sale, insert items, deduct inventory).
      // Poll up to 10 times with 2-second intervals (max 20 seconds total).
      console.log(`Waiting for frontend to insert sale record for payment ${paymentId}...`)
      
      let saleData = null;
      const MAX_ATTEMPTS = 10;
      const RETRY_DELAY_MS = 2000;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .contains('payment_details', { razorpay_payment_id: paymentId })
          .maybeSingle()

        if (error) {
          console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} — DB error:`, error)
          break; // Stop retrying on hard DB errors
        }

        if (data) {
          saleData = data;
          console.log(`Found sale on attempt ${attempt}/${MAX_ATTEMPTS}`)
          break;
        }

        console.log(`Attempt ${attempt}/${MAX_ATTEMPTS} — Sale not yet found, retrying in ${RETRY_DELAY_MS / 1000}s...`)
      }

      if (saleData) {
        // Update the sale to mark it as verified by webhook
        const updatedPaymentDetails = {
          ...saleData.payment_details,
          webhook_verified: true,
          webhook_verified_at: new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('sales')
          .update({ payment_details: updatedPaymentDetails })
          .eq('id', saleData.id)

        if (updateError) {
          console.error(`Failed to update sale ${saleData.id}:`, updateError)
        } else {
          console.log(`Successfully verified and updated sale: ${saleData.id}`)
        }
      } else {
        console.warn(`Sale with payment ID ${paymentId} not found after ${MAX_ATTEMPTS} attempts. The frontend may have failed to record it.`)
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
