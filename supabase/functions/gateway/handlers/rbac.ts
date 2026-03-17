/**
 * Role-Based Access Control Handlers
 * Fine-grained permissions for admin roles.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

const ADMIN_ROLES = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to all admin features',
    permissions: ['*'],
  },
  {
    id: 'compliance_officer',
    name: 'Compliance Officer',
    description: 'KYC, AML, GDPR, and audit management',
    permissions: [
      'admin.compliance.*',
      'admin.audit.read',
      'admin.users.read',
      'exports.compliance',
      'exports.audit',
    ],
  },
  {
    id: 'marketing_admin',
    name: 'Marketing Admin',
    description: 'Content, experiments, and branding management',
    permissions: [
      'admin.content.*',
      'admin.experiments.*',
      'admin.branding.*',
      'admin.analytics.read',
    ],
  },
  {
    id: 'it_admin',
    name: 'IT Admin',
    description: 'Integrations, SSO, and system configuration',
    permissions: [
      'admin.integrations.*',
      'admin.sso.*',
      'admin.settings.*',
      'admin.api_tokens.*',
      'admin.audit.read',
    ],
  },
  {
    id: 'operations_admin',
    name: 'Operations Admin',
    description: 'User management and account oversight',
    permissions: [
      'admin.users.*',
      'admin.accounts.*',
      'admin.analytics.read',
      'exports.accounts',
      'exports.transactions',
    ],
  },
  {
    id: 'viewer',
    name: 'Read-Only Viewer',
    description: 'View dashboards and reports only',
    permissions: [
      'admin.dashboard.read',
      'admin.analytics.read',
      'admin.audit.read',
    ],
  },
];

export async function listRoles(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Check for custom roles first
  const { data: customRoles, error } = await ctx.db
    .from('admin_roles')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('name');

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const custom = (customRoles ?? []).map(toRole);
  return { data: { builtInRoles: ADMIN_ROLES, customRoles: custom } };
}

export async function createRole(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { name, description, permissions } = ctx.params as {
    name: string;
    description?: string;
    permissions: string[];
  };

  if (!name || !permissions?.length) {
    return { error: { code: 'INVALID_PARAMS', message: 'name and permissions are required' }, status: 400 };
  }

  const { data: row, error } = await ctx.db
    .from('admin_roles')
    .insert({
      firm_id: ctx.firmId,
      name,
      description: description ?? '',
      permissions,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { role: toRole(row) } };
}

export async function updateRole(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { roleId, name, description, permissions } = ctx.params as {
    roleId: string;
    name?: string;
    description?: string;
    permissions?: string[];
  };

  if (!roleId) return { error: { code: 'INVALID_PARAMS', message: 'roleId is required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (permissions) updates.permissions = permissions;

  const { data: row, error } = await ctx.db
    .from('admin_roles')
    .update(updates)
    .eq('id', roleId)
    .eq('firm_id', ctx.firmId)
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { role: toRole(row) } };
}

export async function deleteRole(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleId = ctx.params.roleId as string;
  if (!roleId) return { error: { code: 'INVALID_PARAMS', message: 'roleId is required' }, status: 400 };

  const { error } = await ctx.db
    .from('admin_roles')
    .delete()
    .eq('id', roleId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function assignRole(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { userId, roleId } = ctx.params as { userId: string; roleId: string };
  if (!userId || !roleId) {
    return { error: { code: 'INVALID_PARAMS', message: 'userId and roleId are required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('admin_role_assignments')
    .upsert({
      user_id: userId,
      firm_id: ctx.firmId,
      role_id: roleId,
      assigned_by: ctx.userId,
      assigned_at: new Date().toISOString(),
    }, { onConflict: 'user_id,firm_id' });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function getUserPermissions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const targetUserId = (ctx.params.userId as string) || ctx.userId;

  const { data: assignment } = await ctx.db
    .from('admin_role_assignments')
    .select('role_id')
    .eq('user_id', targetUserId)
    .eq('firm_id', ctx.firmId)
    .maybeSingle();

  if (!assignment) {
    return { data: { roleId: null, roleName: null, permissions: [] } };
  }

  // Check built-in roles first
  const builtIn = ADMIN_ROLES.find(r => r.id === assignment.role_id);
  if (builtIn) {
    return { data: { roleId: builtIn.id, roleName: builtIn.name, permissions: builtIn.permissions } };
  }

  // Check custom roles
  const { data: customRole } = await ctx.db
    .from('admin_roles')
    .select('*')
    .eq('id', assignment.role_id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (customRole) {
    return { data: { roleId: customRole.id, roleName: customRole.name, permissions: customRole.permissions } };
  }

  return { data: { roleId: null, roleName: null, permissions: [] } };
}

function toRole(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    permissions: (row.permissions as string[]) ?? [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
