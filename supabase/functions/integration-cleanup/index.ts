// Integration Cleanup
// Cleans up old webhook logs, sync logs, and expired OAuth states
// Can be called via cron (daily recommended) or manually

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface CleanupInput {
  webhookRetentionDays?: number; // Default: 30
  syncRetentionDays?: number; // Default: 90
}

interface CleanupResult {
  webhookLogsDeleted: number;
  syncLogsDeleted: number;
  oauthStatesDeleted: number;
  executedAt: string;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Accept POST for manual calls, or GET for cron
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse input (POST body or query params)
    let input: CleanupInput = {};
    if (req.method === "POST") {
      try {
        input = await req.json();
      } catch {
        // Empty body is fine, use defaults
      }
    } else {
      const url = new URL(req.url);
      const webhookDays = url.searchParams.get("webhookRetentionDays");
      const syncDays = url.searchParams.get("syncRetentionDays");
      if (webhookDays) input.webhookRetentionDays = parseInt(webhookDays, 10);
      if (syncDays) input.syncRetentionDays = parseInt(syncDays, 10);
    }

    // Validate retention days (minimum 1 day)
    const webhookRetentionDays = Math.max(1, input.webhookRetentionDays ?? 30);
    const syncRetentionDays = Math.max(1, input.syncRetentionDays ?? 90);

    // Call the cleanup function
    const { data, error } = await supabase.rpc("cleanup_integration_data", {
      webhook_retention_days: webhookRetentionDays,
      sync_retention_days: syncRetentionDays,
    });

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }

    const result: CleanupResult = {
      webhookLogsDeleted: data?.[0]?.webhook_logs_deleted ?? 0,
      syncLogsDeleted: data?.[0]?.sync_logs_deleted ?? 0,
      oauthStatesDeleted: data?.[0]?.oauth_states_deleted ?? 0,
      executedAt: new Date().toISOString(),
    };

    console.warn(
      `Integration cleanup completed: ${result.webhookLogsDeleted} webhook logs, ${result.syncLogsDeleted} sync logs, ${result.oauthStatesDeleted} oauth states deleted`,
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error in integration-cleanup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
