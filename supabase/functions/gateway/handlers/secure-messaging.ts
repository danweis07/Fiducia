/**
 * Secure Messaging Domain Handlers
 *
 * Gateway handlers for member-to-support secure messaging threads.
 *
 * IMPORTANT:
 * - NEVER log PII (message bodies, member names).
 * - All data is scoped by ctx.firmId for tenant isolation.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * List message threads for the current user, ordered by last message timestamp.
 * Params: limit?, offset?, status?
 */
export async function listThreads(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min(Number(ctx.params.limit) || 20, 100);
  const offset = Number(ctx.params.offset) || 0;
  const status = ctx.params.status as string | undefined;

  let query = ctx.db
    .from('message_threads')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  } else {
    // By default, exclude archived threads
    query = query.neq('status', 'archived');
  }

  const { data: rows, count, error } = await query;

  if (error) {
    console.error('listThreads query error:', error.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to list threads' }, status: 500 };
  }

  const threads = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    subject: r.subject,
    status: r.status,
    priority: r.priority,
    departmentId: r.department_id,
    departmentName: r.department_name,
    userId: r.user_id,
    lastMessageAt: r.last_message_at,
    unreadCount: Number(r.unread_count ?? 0),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return {
    data: { threads },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

/**
 * Get a single thread with all its messages. Also marks unread messages as read.
 * Params: threadId
 */
export async function getThread(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const threadId = ctx.params.threadId as string;
  if (!threadId) {
    return { error: { code: 'BAD_REQUEST', message: 'threadId is required' }, status: 400 };
  }

  // Fetch thread — scoped to tenant + user
  const { data: thread, error: threadErr } = await ctx.db
    .from('message_threads')
    .select('*')
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (threadErr || !thread) {
    return { error: { code: 'NOT_FOUND', message: 'Thread not found' }, status: 404 };
  }

  // Fetch messages
  const { data: msgRows, error: msgErr } = await ctx.db
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: true });

  if (msgErr) {
    console.error('getThread messages error:', msgErr.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to load messages' }, status: 500 };
  }

  const messages = (msgRows ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    threadId: m.thread_id,
    senderId: m.sender_id,
    senderName: m.sender_name,
    senderType: m.sender_type,
    body: m.body,
    attachmentIds: m.attachment_ids ?? [],
    isRead: m.is_read,
    createdAt: m.created_at,
  }));

  // Mark unread messages as read (fire-and-forget for the current user's unread)
  await ctx.db
    .from('messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('is_read', false)
    .neq('sender_id', ctx.userId);

  // Reset unread count on thread
  await ctx.db
    .from('message_threads')
    .update({ unread_count: 0 })
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  return {
    data: {
      thread: {
        id: thread.id,
        subject: thread.subject,
        status: thread.status,
        priority: thread.priority,
        departmentId: thread.department_id,
        departmentName: thread.department_name,
        userId: thread.user_id,
        lastMessageAt: thread.last_message_at,
        unreadCount: 0,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
      },
      messages,
    },
  };
}

/**
 * Create a new message thread.
 * Params: subject, body, departmentId?, priority?
 */
export async function createThread(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const subject = ctx.params.subject as string;
  const body = ctx.params.body as string;
  const departmentId = (ctx.params.departmentId as string) || null;
  const priority = (ctx.params.priority as string) || 'normal';

  if (!subject || !body) {
    return { error: { code: 'BAD_REQUEST', message: 'subject and body are required' }, status: 400 };
  }

  if (!['normal', 'urgent'].includes(priority)) {
    return { error: { code: 'BAD_REQUEST', message: 'priority must be normal or urgent' }, status: 400 };
  }

  // Resolve department name if departmentId provided
  let departmentName: string | null = null;
  if (departmentId) {
    const { data: dept } = await ctx.db
      .from('message_departments')
      .select('name')
      .eq('id', departmentId)
      .eq('firm_id', ctx.firmId)
      .eq('is_active', true)
      .single();
    departmentName = dept?.name ?? null;
  }

  const now = new Date().toISOString();

  // Create the thread
  const { data: thread, error: threadErr } = await ctx.db
    .from('message_threads')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      subject,
      status: 'open',
      priority,
      department_id: departmentId,
      department_name: departmentName,
      unread_count: 0,
      last_message_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (threadErr || !thread) {
    console.error('createThread error:', threadErr?.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to create thread' }, status: 500 };
  }

  // Create the initial message
  const { error: msgErr } = await ctx.db
    .from('messages')
    .insert({
      firm_id: ctx.firmId,
      thread_id: thread.id,
      sender_id: ctx.userId,
      sender_name: 'Member',
      sender_type: 'member',
      body,
      attachment_ids: [],
      is_read: true,
      created_at: now,
    });

  if (msgErr) {
    console.error('createThread message error:', msgErr.code);
    return { error: { code: 'DB_ERROR', message: 'Thread created but failed to save message' }, status: 500 };
  }

  return {
    data: {
      thread: {
        id: thread.id,
        subject: thread.subject,
        status: thread.status,
        priority: thread.priority,
        departmentId: thread.department_id,
        departmentName: thread.department_name,
        userId: thread.user_id,
        lastMessageAt: thread.last_message_at,
        unreadCount: 0,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
      },
    },
    status: 201,
  };
}

/**
 * Reply to an existing thread.
 * Params: threadId, body, attachmentIds?
 */
export async function replyToThread(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const threadId = ctx.params.threadId as string;
  const body = ctx.params.body as string;
  const attachmentIds = (ctx.params.attachmentIds as string[]) || [];

  if (!threadId || !body) {
    return { error: { code: 'BAD_REQUEST', message: 'threadId and body are required' }, status: 400 };
  }

  // Verify thread belongs to this user and tenant
  const { data: thread, error: threadErr } = await ctx.db
    .from('message_threads')
    .select('id, status')
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (threadErr || !thread) {
    return { error: { code: 'NOT_FOUND', message: 'Thread not found' }, status: 404 };
  }

  if (thread.status === 'archived') {
    return { error: { code: 'BAD_REQUEST', message: 'Cannot reply to an archived thread' }, status: 400 };
  }

  const now = new Date().toISOString();

  // Insert message
  const { data: message, error: msgErr } = await ctx.db
    .from('messages')
    .insert({
      firm_id: ctx.firmId,
      thread_id: threadId,
      sender_id: ctx.userId,
      sender_name: 'Member',
      sender_type: 'member',
      body,
      attachment_ids: attachmentIds,
      is_read: true,
      created_at: now,
    })
    .select()
    .single();

  if (msgErr || !message) {
    console.error('replyToThread error:', msgErr?.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to send reply' }, status: 500 };
  }

  // Update thread timestamp and re-open if closed
  await ctx.db
    .from('message_threads')
    .update({
      last_message_at: now,
      updated_at: now,
      status: 'open',
    })
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId);

  return {
    data: {
      message: {
        id: message.id,
        threadId: message.thread_id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderType: message.sender_type,
        body: message.body,
        attachmentIds: message.attachment_ids ?? [],
        isRead: message.is_read,
        createdAt: message.created_at,
      },
    },
    status: 201,
  };
}

/**
 * Mark all messages in a thread as read.
 * Params: threadId
 */
export async function markThreadRead(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const threadId = ctx.params.threadId as string;
  if (!threadId) {
    return { error: { code: 'BAD_REQUEST', message: 'threadId is required' }, status: 400 };
  }

  // Verify thread belongs to this user and tenant
  const { data: thread } = await ctx.db
    .from('message_threads')
    .select('id')
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!thread) {
    return { error: { code: 'NOT_FOUND', message: 'Thread not found' }, status: 404 };
  }

  // Mark all messages as read
  await ctx.db
    .from('messages')
    .update({ is_read: true })
    .eq('thread_id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('is_read', false)
    .neq('sender_id', ctx.userId);

  // Reset unread count
  await ctx.db
    .from('message_threads')
    .update({ unread_count: 0 })
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  return { data: { success: true } };
}

/**
 * Archive a thread (soft delete).
 * Params: threadId
 */
export async function archiveThread(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const threadId = ctx.params.threadId as string;
  if (!threadId) {
    return { error: { code: 'BAD_REQUEST', message: 'threadId is required' }, status: 400 };
  }

  const { data: thread, error } = await ctx.db
    .from('message_threads')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select('id')
    .single();

  if (error || !thread) {
    return { error: { code: 'NOT_FOUND', message: 'Thread not found' }, status: 404 };
  }

  return { data: { success: true } };
}

/**
 * List available departments for messaging.
 * No params required.
 */
export async function listDepartments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('message_departments')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('listDepartments error:', error.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to list departments' }, status: 500 };
  }

  const departments = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isActive: r.is_active,
  }));

  return { data: { departments } };
}

/**
 * Get count of unread messages for the current user.
 */
export async function getUnreadMessageCount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('message_threads')
    .select('unread_count')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .neq('status', 'archived');

  if (error) {
    console.error('getUnreadMessageCount error:', error.code);
    return { error: { code: 'DB_ERROR', message: 'Failed to get unread count' }, status: 500 };
  }

  const count = (rows ?? []).reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.unread_count ?? 0), 0);

  return { data: { count } };
}
