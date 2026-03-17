/**
 * Notification Preferences Handlers
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

export async function getNotificationPreferences(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: row, error } = await ctx.db
    .from('notification_preferences')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .maybeSingle();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Return defaults if no preferences set
  const prefs = row ? toPreferences(row) : defaultPreferences();
  return { data: { preferences: prefs } };
}

export async function updateNotificationPreferences(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { channels, categories } = ctx.params as {
    channels?: Record<string, boolean>;
    categories?: Record<string, { enabled: boolean; channels: string[] }>;
  };

  const upsertData: Record<string, unknown> = {
    user_id: ctx.userId,
    firm_id: ctx.firmId,
    updated_at: new Date().toISOString(),
  };
  if (channels) upsertData.channels = channels;
  if (categories) upsertData.categories = categories;

  const { data: row, error } = await ctx.db
    .from('notification_preferences')
    .upsert(upsertData, { onConflict: 'user_id,firm_id' })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { preferences: toPreferences(row) } };
}

export async function testNotification(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const channel = ctx.params.channel as string;
  if (!channel || !['email', 'sms', 'push', 'in_app'].includes(channel)) {
    return { error: { code: 'INVALID_PARAMS', message: 'Valid channel required (email, sms, push, in_app)' }, status: 400 };
  }

  // In production, this would trigger a real test notification via the messaging adapter
  return { data: { sent: true, channel, message: `Test ${channel} notification sent successfully` } };
}

function defaultPreferences() {
  return {
    channels: { email: true, sms: false, push: true, in_app: true },
    categories: {
      transactions: { enabled: true, channels: ['push', 'in_app'] },
      transfers: { enabled: true, channels: ['email', 'push', 'in_app'] },
      security: { enabled: true, channels: ['email', 'sms', 'push', 'in_app'] },
      marketing: { enabled: false, channels: ['email'] },
      account_alerts: { enabled: true, channels: ['email', 'push', 'in_app'] },
      bill_reminders: { enabled: true, channels: ['push', 'in_app'] },
      statements: { enabled: true, channels: ['email', 'in_app'] },
      loan_updates: { enabled: true, channels: ['email', 'push'] },
    },
  };
}

function toPreferences(row: Record<string, unknown>) {
  const defaults = defaultPreferences();
  return {
    channels: (row.channels as Record<string, boolean>) ?? defaults.channels,
    categories: (row.categories as Record<string, { enabled: boolean; channels: string[] }>) ?? defaults.categories,
  };
}
