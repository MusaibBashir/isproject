import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Background task: capture payment (if needed) and update the sale in Supabase.
// Called via EdgeRuntime.waitUntil() so Razorpay gets an immediate 200 response.
async function processPaymentBackground(
  paymentId: string,
  paymentAmount: number,
  paymentCurrency: string,
  isAuthorizedEvent: boolean,
  supabase: ReturnType<typeof createClient>
) {
  // 1. CAPTURE (only for payment.authorized)
  if (isAuthorizedEvent) {
    const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID')
    const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (rzpKeyId && rzpKeySecret) {
      console.log(`Attempting to auto-capture payment ${paymentId} for amount ${paymentAmount}...`)
      try {
        const authHeader = "Basic " + btoa(`${rzpKeyId}:${rzpKeySecret}`)
        const captureRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
          body: JSON.stringify({ amount: paymentAmount, currency: paymentCurrency })
        })

        if (!captureRes.ok) {
          const errorText = await captureRes.text()
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
      console.log(`Skipping auto-capture: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set.`)
    }
  }

  // 2. FIND THE SALE — retry loop (up to 10 × 2s = 20s)
  console.log(`Waiting for frontend to insert sale record for payment ${paymentId}...`)

  const MAX_ATTEMPTS = 10
  const RETRY_DELAY_MS = 2000
  let saleData = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .contains('payment_details', { razorpay_payment_id: paymentId })
      .maybeSingle()

    if (error) {
      console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} — DB error:`, error)
      break
    }

    // Already verified by a previous webhook invocation — skip to avoid duplicate updates
    if (data?.payment_details?.webhook_verified) {
      console.log(`Sale ${data.id} already webhook-verified (by a previous invocation). Skipping.`)
      return
    }

    if (data) {
      saleData = data
      console.log(`Found sale on attempt ${attempt}/${MAX_ATTEMPTS}`)
      break
    }

    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS} — Sale not yet found, retrying in ${RETRY_DELAY_MS / 1000}s...`)
  }

  // 3. MARK AS WEBHOOK-VERIFIED
  if (saleData) {
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
    console.warn(`Sale with payment ID ${paymentId} not found after ${MAX_ATTEMPTS} attempts.`)
  }
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

    // Read raw body for signature verification
    const bodyText = await req.text()

    // Verify HMAC-SHA256 signature using native Web Crypto
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText))
    const expectedSignature = Array.from(new Uint8Array(sigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (expectedSignature !== signature) {
      console.error('Invalid signature')
      return new Response('Invalid signature', { status: 400 })
    }

    const event = JSON.parse(bodyText)
    console.log(`Received verified Razorpay webhook: ${event.event}`)

    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload.payment.entity
      console.log(`Processing payment: ${payment.id}`)

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Kick off the slow work (capture + retry loop) in the background so Razorpay
      // gets an immediate 200 OK and does NOT retry the webhook.
      // deno-lint-ignore no-explicit-any
      const ctx = (globalThis as any).EdgeRuntime
      if (ctx?.waitUntil) {
        ctx.waitUntil(processPaymentBackground(
          payment.id,
          payment.amount,
          payment.currency,
          event.event === 'payment.authorized',
          supabase
        ))
      } else {
        // Fallback for local dev / environments without EdgeRuntime
        processPaymentBackground(
          payment.id,
          payment.amount,
          payment.currency,
          event.event === 'payment.authorized',
          supabase
        ).catch(e => console.error('Background processing error:', e))
      }
    }

    // Respond immediately — do NOT wait for the retry loop above
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(`Error processing webhook: ${error.message}`, { status: 400 })
  }
})
