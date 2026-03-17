/**
 * AML Screening Gateway Handlers
 *
 * Handles real-time watchlist screening (OFAC, UN, EU Sanctions),
 * ongoing monitoring subscriptions, and alert management.
 *
 * IMPORTANT: PII (names, DOBs, IDs) MUST NEVER appear in logs or error responses.
 * Only screening IDs, risk levels, and match counts may be logged.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type { AMLScreeningAdapter, ScreeningSubject, WatchlistSource } from '../../_shared/adapters/aml-screening/types.ts';
import { MockAMLScreeningAdapter } from '../../_shared/adapters/aml-screening/mock-adapter.ts';

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

async function getAMLAdapter(): Promise<AMLScreeningAdapter> {
  const provider = Deno.env.get('AML_SCREENING_PROVIDER') ?? 'mock';

  switch (provider) {
    case 'complyadvantage': {
      const mod = await import('../../_shared/adapters/aml-screening/complyadvantage-adapter.ts');
      return new mod.ComplyAdvantageAMLAdapter();
    }
    case 'lexisnexis': {
      const mod = await import('../../_shared/adapters/aml-screening/lexisnexis-adapter.ts');
      return new mod.LexisNexisAMLAdapter();
    }
    default:
      return new MockAMLScreeningAdapter();
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * aml.screen — Screen a subject against global watchlists in real-time
 *
 * Required params:
 *   - subject: { customerId, firstName, lastName, entityType }
 *   - subject.entityType: 'individual' | 'organization'
 *
 * Optional params:
 *   - subject.middleName, dateOfBirth, nationality, countryOfResidence
 *   - subject.organizationName (required if entityType is 'organization')
 *   - subject.idNumber, idType
 *   - watchlists: WatchlistSource[] (defaults to all)
 *   - matchThreshold: number (0.0 - 1.0, default 0.7)
 *   - enableMonitoring: boolean
 *   - monitoringIntervalHours: number (default 24)
 */
export async function screenAML(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const subject = params.subject as Record<string, unknown> | undefined;
  if (!subject) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing required field: subject' },
      status: 400,
    };
  }

  const requiredFields = ['customerId', 'firstName', 'lastName', 'entityType'];
  for (const field of requiredFields) {
    if (!subject[field]) {
      return {
        error: { code: 'BAD_REQUEST', message: `Missing required subject field: ${field}` },
        status: 400,
      };
    }
  }

  const entityType = subject.entityType as string;
  if (entityType !== 'individual' && entityType !== 'organization') {
    return {
      error: { code: 'BAD_REQUEST', message: 'entityType must be "individual" or "organization"' },
      status: 400,
    };
  }

  if (entityType === 'organization' && !subject.organizationName) {
    return {
      error: { code: 'BAD_REQUEST', message: 'organizationName is required for organization entity type' },
      status: 400,
    };
  }

  const screeningSubject: ScreeningSubject = {
    customerId: subject.customerId as string,
    firstName: subject.firstName as string,
    middleName: subject.middleName as string | undefined,
    lastName: subject.lastName as string,
    dateOfBirth: subject.dateOfBirth as string | undefined,
    nationality: subject.nationality as string | undefined,
    countryOfResidence: subject.countryOfResidence as string | undefined,
    entityType: entityType as 'individual' | 'organization',
    organizationName: subject.organizationName as string | undefined,
    idNumber: subject.idNumber as string | undefined,
    idType: subject.idType as ScreeningSubject['idType'],
  };

  // Log WITHOUT PII — only log that screening is happening
  console.warn(JSON.stringify({
    level: 'info',
    handler: 'aml.screen',
    customerId: screeningSubject.customerId,
    entityType: screeningSubject.entityType,
    userId: ctx.userId ?? null,
    timestamp: new Date().toISOString(),
  }));

  const adapter = await getAMLAdapter();
  const response = await adapter.screen({
    tenantId: ctx.firmId ?? '',
    subject: screeningSubject,
    watchlists: params.watchlists as WatchlistSource[] | undefined,
    matchThreshold: params.matchThreshold as number | undefined,
    enableMonitoring: params.enableMonitoring as boolean | undefined,
    monitoringIntervalHours: params.monitoringIntervalHours as number | undefined,
  });

  return {
    data: {
      screening: response.result,
      monitoring: response.monitoring ?? null,
    },
  };
}

/**
 * aml.getScreening — Retrieve a previous screening result
 */
export async function getAMLScreening(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const screeningId = params.screeningId as string;

  if (!screeningId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'screeningId is required' },
      status: 400,
    };
  }

  const adapter = await getAMLAdapter();
  const response = await adapter.getScreening({
    tenantId: ctx.firmId ?? '',
    screeningId,
  });

  return { data: { screening: response.result } };
}

/**
 * aml.monitoring.list — List ongoing monitoring subscriptions
 */
export async function listAMLMonitoring(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const adapter = await getAMLAdapter();
  const response = await adapter.listMonitoring({
    tenantId: ctx.firmId ?? '',
    customerId: params.customerId as string | undefined,
    status: params.status as 'active' | 'paused' | 'expired' | 'removed' | undefined,
    limit: params.limit as number | undefined,
    offset: params.offset as number | undefined,
  });

  return {
    data: { subscriptions: response.subscriptions },
    meta: {
      pagination: {
        total: response.total,
        limit: (params.limit as number) ?? 25,
        offset: (params.offset as number) ?? 0,
        hasMore: ((params.offset as number) ?? 0) + ((params.limit as number) ?? 25) < response.total,
      },
    },
  };
}

/**
 * aml.monitoring.update — Update a monitoring subscription
 */
export async function updateAMLMonitoring(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const subscriptionId = params.subscriptionId as string;

  if (!subscriptionId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'subscriptionId is required' },
      status: 400,
    };
  }

  const adapter = await getAMLAdapter();
  const response = await adapter.updateMonitoring({
    tenantId: ctx.firmId ?? '',
    subscriptionId,
    status: params.status as 'active' | 'paused' | 'expired' | 'removed' | undefined,
    watchlists: params.watchlists as WatchlistSource[] | undefined,
    refreshIntervalHours: params.refreshIntervalHours as number | undefined,
  });

  return { data: { subscription: response.subscription } };
}

/**
 * aml.alerts.list — List monitoring alerts
 */
export async function listAMLAlerts(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const adapter = await getAMLAdapter();
  const response = await adapter.listAlerts({
    tenantId: ctx.firmId ?? '',
    customerId: params.customerId as string | undefined,
    subscriptionId: params.subscriptionId as string | undefined,
    unreviewedOnly: params.unreviewedOnly as boolean | undefined,
    limit: params.limit as number | undefined,
    offset: params.offset as number | undefined,
  });

  return {
    data: { alerts: response.alerts },
    meta: {
      pagination: {
        total: response.total,
        limit: (params.limit as number) ?? 25,
        offset: (params.offset as number) ?? 0,
        hasMore: ((params.offset as number) ?? 0) + ((params.limit as number) ?? 25) < response.total,
      },
    },
  };
}

/**
 * aml.alerts.review — Review/disposition a monitoring alert
 */
export async function reviewAMLAlert(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const alertId = params.alertId as string;

  if (!alertId) {
    return {
      error: { code: 'BAD_REQUEST', message: 'alertId is required' },
      status: 400,
    };
  }

  if (typeof params.confirmedMatch !== 'boolean') {
    return {
      error: { code: 'BAD_REQUEST', message: 'confirmedMatch (boolean) is required' },
      status: 400,
    };
  }

  if (!params.notes) {
    return {
      error: { code: 'BAD_REQUEST', message: 'notes is required for alert review' },
      status: 400,
    };
  }

  const adapter = await getAMLAdapter();
  const response = await adapter.reviewAlert({
    tenantId: ctx.firmId ?? '',
    alertId,
    confirmedMatch: params.confirmedMatch as boolean,
    notes: params.notes as string,
  });

  return { data: { alert: response.alert } };
}
