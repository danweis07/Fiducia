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
 * admin.designSystem.get — Read current design system configuration
 */
export async function getDesignSystem(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const { data } = await ctx.db
    .from('banking_tenant_theme')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .single();

  if (!data) {
    return { data: { designSystem: null } };
  }

  return {
    data: {
      designSystem: data.design_system ?? null,
      // Include flat fields for reference
      tenantName: data.tenant_name,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      accentColor: data.accent_color,
    },
  };
}

/**
 * admin.designSystem.update — Save full design system configuration
 *
 * Params:
 *   - designSystem: DesignSystemConfig (full JSONB config)
 *
 * Also writes through to flat columns for backward compatibility.
 */
export async function updateDesignSystem(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const { designSystem } = ctx.params as { designSystem?: Record<string, unknown> };

  if (!designSystem || typeof designSystem !== 'object') {
    return { error: { code: 'INVALID_PARAMS', message: 'designSystem object is required' }, status: 400 };
  }

  // Validate version field
  if (designSystem.version !== 1) {
    return { error: { code: 'INVALID_PARAMS', message: 'Unsupported design system version' }, status: 400 };
  }

  // Cap custom CSS length
  if (typeof designSystem.customCss === 'string' && designSystem.customCss.length > 50000) {
    return { error: { code: 'INVALID_PARAMS', message: 'Custom CSS exceeds 50KB limit' }, status: 400 };
  }

  // Write-through: extract flat column values from the design system for legacy queries
  const colors = designSystem.colors as Record<string, Record<string, unknown>> | undefined;
  const lightPalette = colors?.light as Record<string, Record<string, string>> | undefined;
  const logos = designSystem.logos as Record<string, string | null> | undefined;
  const typography = designSystem.typography as Record<string, string> | undefined;
  const surfaces = designSystem.surfaces as Record<string, string> | undefined;

  const upsertData: Record<string, unknown> = {
    firm_id: ctx.firmId!,
    design_system: designSystem,
    updated_at: new Date().toISOString(),
    // Write-through to flat columns
    primary_color: lightPalette?.primary?.base ?? null,
    accent_color: lightPalette?.accent?.base ?? null,
    secondary_color: lightPalette?.secondary?.base ?? null,
    logo_url: logos?.primary ?? null,
    font_family: typography?.bodyFont ?? 'Inter',
    layout_theme: surfaces?.layoutTheme ?? 'modern',
    custom_css: (designSystem.customCss as string) ?? '',
  };

  const { data, error } = await ctx.db
    .from('banking_tenant_theme')
    .upsert(upsertData, { onConflict: 'firm_id' })
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to update design system' }, status: 500 };
  }

  return {
    data: {
      designSystem: data.design_system,
    },
  };
}

/**
 * @deprecated Use updateDesignSystem instead
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
