/**
 * Search Gateway Handlers
 *
 * Handles full-text search, indexing, and autocomplete suggestions
 * across banking content, transactions, and documents.
 *
 * Actions:
 *   - search.query   — Execute a search query against an index
 *   - search.index   — Index (upsert) objects into an index
 *   - search.suggest — Get autocomplete suggestions
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type { SearchAdapter } from '../../_shared/adapters/search/types.ts';
import { MockSearchAdapter } from '../../_shared/adapters/search/mock-adapter.ts';

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

async function getSearchAdapter(): Promise<SearchAdapter> {
  const provider = Deno.env.get('SEARCH_PROVIDER') ?? 'mock';

  switch (provider) {
    case 'algolia': {
      const mod = await import('../../_shared/adapters/search/algolia-adapter.ts');
      return new mod.AlgoliaSearchAdapter();
    }
    default:
      return new MockSearchAdapter();
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * search.query — Execute a search query against an index
 *
 * Required params:
 *   - query: string — Search query text
 *
 * Optional params:
 *   - indexName: IndexName (default 'content')
 *   - filters: Record<string, string | string[]>
 *   - facets: string[]
 *   - page: number (zero-based, default 0)
 *   - hitsPerPage: number (default 20)
 */
export async function searchQuery(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const query = params.query as string | undefined;
  if (typeof query !== 'string' || query.trim().length === 0) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing or empty required field: query' },
      status: 400,
    };
  }

  const adapter = await getSearchAdapter();
  const response = await adapter.search({
    query: query.trim(),
    indexName: (params.indexName as string) ?? 'content',
    tenantId: ctx.firmId ?? '',
    filters: params.filters as Record<string, string | string[]> | undefined,
    facets: params.facets as string[] | undefined,
    page: params.page as number | undefined,
    hitsPerPage: params.hitsPerPage as number | undefined,
  });

  return {
    data: {
      hits: response.hits,
      totalHits: response.totalHits,
      page: response.page,
      totalPages: response.totalPages,
      facets: response.facets,
      processingTimeMs: response.processingTimeMs,
    },
  };
}

/**
 * search.index — Index (upsert) objects into a search index
 *
 * Required params:
 *   - objects: Array<{ objectID: string; content: Record<string, unknown> }>
 *
 * Optional params:
 *   - indexName: IndexName (default 'content')
 */
export async function searchIndex(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const objects = params.objects as Array<{ objectID: string; content: Record<string, unknown> }> | undefined;
  if (!Array.isArray(objects) || objects.length === 0) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing or empty required field: objects (array)' },
      status: 400,
    };
  }

  // Validate each object has objectID and content
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (!obj.objectID || typeof obj.objectID !== 'string') {
      return {
        error: { code: 'BAD_REQUEST', message: `objects[${i}].objectID is required and must be a string` },
        status: 400,
      };
    }
    if (!obj.content || typeof obj.content !== 'object') {
      return {
        error: { code: 'BAD_REQUEST', message: `objects[${i}].content is required and must be an object` },
        status: 400,
      };
    }
  }

  const adapter = await getSearchAdapter();
  const response = await adapter.index({
    indexName: (params.indexName as string) ?? 'content',
    tenantId: ctx.firmId ?? '',
    objects,
  });

  return {
    data: {
      objectIDs: response.objectIDs,
      taskId: response.taskId,
    },
  };
}

/**
 * search.suggest — Get autocomplete suggestions for a partial query
 *
 * Required params:
 *   - query: string — Partial search query
 *
 * Optional params:
 *   - indexName: IndexName (default 'content')
 *   - limit: number (default 5)
 */
export async function searchSuggest(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  const query = params.query as string | undefined;
  if (typeof query !== 'string' || query.trim().length === 0) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Missing or empty required field: query' },
      status: 400,
    };
  }

  const adapter = await getSearchAdapter();
  const response = await adapter.suggest({
    query: query.trim(),
    indexName: (params.indexName as string) ?? 'content',
    tenantId: ctx.firmId ?? '',
    limit: params.limit as number | undefined,
  });

  return {
    data: {
      suggestions: response.suggestions,
    },
  };
}
