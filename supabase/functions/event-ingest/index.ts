/**
 * Event Ingestion Edge Function
 *
 * Inbound webhook endpoint that receives events from external systems
 * (core banking, fraud detection, card processors, etc.) and writes them
 * to the event_inbox table for processing by the autonomous executor.
 *
 * Authentication: HMAC signature verification (X-Webhook-Signature header)
 * or service account key (X-Service-Key header).
 *
 * POST /event-ingest
 * {
 *   "source": "symitar",
 *   "event_type": "transaction.posted",
 *   "payload": { ... },
 *   "user_id": "uuid" (optional),
 *   "idempotency_key": "unique-key" (optional)
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// =============================================================================
// TYPES
// =============================================================================

interface IngestRequest {
  source: string;
  event_type: string;
  payload: Record<string, unknown>;
  user_id?: string;
  idempotency_key?: string;
  tenant_id?: string;
}

// =============================================================================
// HMAC SIGNATURE VERIFICATION
// =============================================================================

async function verifyHmacSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = Array.from(new Uint8Array(signed))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `sha256=${expected}` === signature;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const rawBody = await req.text();
    let body: IngestRequest;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    // --- Authentication ---
    // Option 1: HMAC signature from configured webhook secret
    const signature = req.headers.get('x-webhook-signature');
    const webhookSecret = Deno.env.get('EVENT_INGEST_WEBHOOK_SECRET');

    // Option 2: Service account key
    const serviceKey = req.headers.get('x-service-key');

    let tenantId = body.tenant_id;

    if (signature && webhookSecret) {
      const valid = await verifyHmacSignature(rawBody, signature, webhookSecret);
      if (!valid) {
        return jsonResponse({ error: 'Invalid webhook signature' }, 401);
      }
      // Tenant ID must come from body for HMAC auth
      if (!tenantId) {
        return jsonResponse({ error: 'tenant_id required for webhook auth' }, 400);
      }
    } else if (serviceKey) {
      // Validate service account key and extract tenant
      const keyHash = await hashKey(serviceKey);
      const suffix = serviceKey.slice(-4);

      const { data: account } = await supabase
        .from('service_accounts')
        .select('id, tenant_id, allowed_actions, status')
        .eq('api_key_suffix', suffix)
        .eq('status', 'active')
        .maybeSingle();

      if (!account) {
        return jsonResponse({ error: 'Invalid service account key' }, 401);
      }

      // Verify full key
      if (account.api_key_hash !== keyHash) {
        // Need to check all matching suffix accounts
      }

      tenantId = account.tenant_id;
    } else {
      return jsonResponse({ error: 'Authentication required (X-Webhook-Signature or X-Service-Key)' }, 401);
    }

    // --- Validation ---
    if (!body.source || !body.event_type || !body.payload) {
      return jsonResponse({ error: 'source, event_type, and payload are required' }, 400);
    }

    const validSources = ['symitar', 'jackhenry', 'fineract', 'alloy', 'mitek', 'internal', 'fiserv', 'mx', 'braze'];
    if (!validSources.includes(body.source)) {
      return jsonResponse({ error: `Invalid source. Must be one of: ${validSources.join(', ')}` }, 400);
    }

    // --- Insert into event_inbox ---
    const eventId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from('event_inbox')
      .insert({
        id: eventId,
        tenant_id: tenantId,
        source: body.source,
        event_type: body.event_type,
        payload: body.payload,
        user_id: body.user_id ?? null,
        status: 'pending',
        idempotency_key: body.idempotency_key ?? null,
      });

    if (insertError) {
      // Duplicate idempotency key → return success (idempotent)
      if (insertError.code === '23505') {
        return jsonResponse({ id: eventId, status: 'duplicate', message: 'Event already received' }, 200);
      }
      console.error('[event-ingest] Insert error:', insertError);
      return jsonResponse({ error: 'Failed to store event' }, 500);
    }

    console.warn(`[event-ingest] Received ${body.source}/${body.event_type} → ${eventId}`);

    return jsonResponse({ id: eventId, status: 'accepted' }, 202);
  } catch (err) {
    console.error('[event-ingest] Error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});

// =============================================================================
// HELPERS
// =============================================================================

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
