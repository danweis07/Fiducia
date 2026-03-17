/**
 * Admin Branding Configuration Handler
 *
 * Gateway handler for managing tenant branding/theme settings.
 * Upserts into the banking_tenant_theme table, which is also read
 * by the existing getTenantTheme handler in banking.ts.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Caller must have 'owner' or 'admin' role in firm_users.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function requireAdminRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const { data: firmUser, error } = await ctx.db
    .from('firm_users')
    .select('role')
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !firmUser) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (firmUser.role !== 'owner' && firmUser.role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin or owner role required' }, status: 403 };
  }

  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * admin.branding.update — Upsert tenant branding/theme configuration
 *
 * Params:
 *   - primaryColor: string (optional) — Primary brand color hex
 *   - secondaryColor: string (optional) — Secondary brand color hex
 *   - accentColor: string (optional) — Accent color hex
 *   - logoUrl: string (optional) — URL to tenant logo
 *   - fontFamily: string (optional) — Custom font family
 *   - layoutTheme: string (optional) — Layout theme identifier
 *   - customCss: string (optional) — Custom CSS overrides
 */
export async function updateBranding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const {
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    fontFamily,
    layoutTheme,
    customCss,
  } = ctx.params as Record<string, string | undefined>;

  // Build the upsert payload — only include fields that were provided
  const upsertData: Record<string, unknown> = {
    firm_id: ctx.firmId!,
    updated_at: new Date().toISOString(),
  };

  if (primaryColor !== undefined) upsertData.primary_color = primaryColor;
  if (secondaryColor !== undefined) upsertData.secondary_color = secondaryColor;
  if (accentColor !== undefined) upsertData.accent_color = accentColor;
  if (logoUrl !== undefined) upsertData.logo_url = logoUrl;
  if (fontFamily !== undefined) upsertData.font_family = fontFamily;
  if (layoutTheme !== undefined) upsertData.layout_theme = layoutTheme;
  if (customCss !== undefined) upsertData.custom_css = customCss;

  const { data, error } = await ctx.db
    .from('banking_tenant_theme')
    .upsert(upsertData, { onConflict: 'firm_id' })
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to update branding' }, status: 500 };
  }

  return {
    data: {
      branding: {
        tenantId: data.firm_id,
        name: data.tenant_name,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color,
        accentColor: data.accent_color,
        logoUrl: data.logo_url,
        faviconUrl: data.favicon_url,
        fontFamily: data.font_family,
        layoutTheme: data.layout_theme,
        customCss: data.custom_css,
      },
    },
  };
}
