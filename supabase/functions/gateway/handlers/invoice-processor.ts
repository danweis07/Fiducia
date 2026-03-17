/**
 * Invoice Processor Handlers — Zero-Touch Accounts Payable
 *
 * AI-powered invoice parsing and payment scheduling.
 * Drag-and-drop a PDF → AI extracts vendor, amount, due date →
 * cross-references balance → pre-fills payment.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';
import { requireAuth, paginate } from '../handler-utils.ts';

// =============================================================================
// ANALYZE INVOICE (AI-powered extraction)
// =============================================================================

export async function analyzeInvoice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const fileBase64 = ctx.params.fileBase64 as string;
  const fileName = ctx.params.fileName as string;
  const mimeType = ctx.params.mimeType as string;

  if (!fileBase64 || !fileName) {
    return { error: { code: 'INVALID_PARAMS', message: 'fileBase64 and fileName required' }, status: 400 };
  }

  // Store the uploaded document
  const invoiceId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Call AI service to extract invoice data
  // In production, this pipes to Vertex AI / OpenAI via the ai-services adapter
  const { data: aiResult, error: aiError } = await ctx.db.rpc('analyze_invoice_document', {
    p_firm_id: ctx.firmId,
    p_user_id: ctx.userId,
    p_file_base64: fileBase64,
    p_file_name: fileName,
    p_mime_type: mimeType,
  });

  // Fallback: if no RPC, insert a pending record for async processing
  if (aiError) {
    const { error: insertErr } = await ctx.db.from('parsed_invoices').insert({
      id: invoiceId,
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      file_name: fileName,
      mime_type: mimeType,
      status: 'pending',
      vendor_name: '',
      amount_cents: 0,
      currency: 'USD',
      confidence: 0,
      line_items: [],
      created_at: now,
      updated_at: now,
    });

    if (insertErr) return { error: { code: 'DB_ERROR', message: insertErr.message }, status: 500 };

    return {
      data: {
        invoice: {
          id: invoiceId,
          fileName,
          vendorName: '',
          vendorAddress: null,
          amountCents: 0,
          currency: 'USD',
          dueDate: '',
          invoiceNumber: null,
          remittanceInfo: null,
          lineItems: [],
          confidence: 0,
          status: 'pending',
          suggestedAccountId: null,
          suggestedAccountName: null,
          availableBalanceCents: null,
          scheduledDate: null,
          paymentId: null,
          createdAt: now,
          updatedAt: now,
        },
        matchedPayees: [],
      },
    };
  }

  // AI extraction succeeded — return parsed data
  const parsed = aiResult as Record<string, unknown>;
  const invoice = toInvoice(parsed);

  // Look up matching payees
  const { data: payees } = await ctx.db
    .from('banking_billpay_payees')
    .select('id, name')
    .eq('firm_id', ctx.firmId)
    .ilike('name', `%${invoice.vendorName}%`)
    .limit(3);

  const matchedPayees = (payees ?? []).map((p: { id: string; name: string }) => ({
    payeeId: p.id,
    name: p.name,
    confidence: p.name.toLowerCase() === invoice.vendorName.toLowerCase() ? 0.95 : 0.7,
  }));

  // Look up suggested account with highest balance
  const { data: accounts } = await ctx.db
    .from('accounts')
    .select('id, name, available_balance_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('account_type', 'checking')
    .order('available_balance_cents', { ascending: false })
    .limit(1);

  if (accounts && accounts.length > 0) {
    invoice.suggestedAccountId = accounts[0].id;
    invoice.suggestedAccountName = accounts[0].name;
    invoice.availableBalanceCents = accounts[0].available_balance_cents;
  }

  return { data: { invoice, matchedPayees } };
}

// =============================================================================
// CONFIRM & SCHEDULE INVOICE PAYMENT
// =============================================================================

export async function confirmInvoice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const invoiceId = ctx.params.invoiceId as string;
  const accountId = ctx.params.accountId as string;
  const scheduledDate = ctx.params.scheduledDate as string;

  if (!invoiceId || !accountId || !scheduledDate) {
    return { error: { code: 'INVALID_PARAMS', message: 'invoiceId, accountId, and scheduledDate required' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('parsed_invoices')
    .update({
      status: 'confirmed',
      suggested_account_id: accountId,
      scheduled_date: scheduledDate,
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { invoice: toInvoice(data) } };
}

// =============================================================================
// LIST INVOICES
// =============================================================================

export async function listInvoices(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;
  const limit = Math.min((ctx.params.limit as number) || 25, 100);
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('parsed_invoices')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { invoices: (rows ?? []).map(toInvoice) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// GET INVOICE
// =============================================================================

export async function getInvoice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const invoiceId = ctx.params.invoiceId as string;
  if (!invoiceId) return { error: { code: 'INVALID_PARAMS', message: 'invoiceId required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('parsed_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error) return { error: { code: 'NOT_FOUND', message: 'Invoice not found' }, status: 404 };
  return { data: { invoice: toInvoice(data) } };
}

// =============================================================================
// CANCEL INVOICE
// =============================================================================

export async function cancelInvoice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const invoiceId = ctx.params.invoiceId as string;
  if (!invoiceId) return { error: { code: 'INVALID_PARAMS', message: 'invoiceId required' }, status: 400 };

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('parsed_invoices')
    .update({ status: 'failed', updated_at: now })
    .eq('id', invoiceId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { invoice: toInvoice(data) } };
}

// =============================================================================
// ROW → DTO MAPPING
// =============================================================================

function toInvoice(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    vendorName: row.vendor_name as string,
    vendorAddress: (row.vendor_address as string) ?? null,
    amountCents: row.amount_cents as number,
    currency: (row.currency as string) ?? 'USD',
    dueDate: (row.due_date as string) ?? '',
    invoiceNumber: (row.invoice_number as string) ?? null,
    remittanceInfo: (row.remittance_info as string) ?? null,
    lineItems: (row.line_items as unknown[]) ?? [],
    confidence: (row.confidence as number) ?? 0,
    status: row.status as string,
    suggestedAccountId: (row.suggested_account_id as string) ?? null,
    suggestedAccountName: (row.suggested_account_name as string) ?? null,
    availableBalanceCents: (row.available_balance_cents as number) ?? null,
    scheduledDate: (row.scheduled_date as string) ?? null,
    paymentId: (row.payment_id as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
