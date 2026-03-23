// TODO: Provisional integration — not yet validated in production.
/**
 * Algolia Search Adapter
 *
 * Integrates with Algolia's search-as-a-service platform for:
 *   - Full-text search with filtering and faceting
 *   - Batch document indexing
 *   - Index lifecycle management
 *   - Search suggestions / autocomplete
 *
 * Requirements:
 *   - ALGOLIA_APP_ID: Algolia application ID
 *   - ALGOLIA_API_KEY: Algolia Admin API key
 *   - ALGOLIA_INDEX_PREFIX: (optional) Prefix for multi-tenant index naming
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  SearchAdapter,
  SearchHit,
  SearchRequest,
  SearchResponse,
  IndexRequest,
  IndexResponse,
  DeleteIndexRequest,
  SuggestRequest,
  SuggestResponse,
} from './types.ts';

// =============================================================================
// ALGOLIA RESPONSE TYPE MAPPINGS
// =============================================================================

interface AlgoliaHit {
  objectID: string;
  _highlightResult?: Record<string, { value: string; matchLevel: string }>;
  [key: string]: unknown;
}

interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  facets?: Record<string, Record<string, number>>;
  processingTimeMS: number;
}

interface AlgoliaBatchResponse {
  objectIDs: string[];
  taskID: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function buildFilterString(filters: Record<string, string | string[]>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      const orParts = value.map((v) => `${key}:${v}`);
      parts.push(`(${orParts.join(' OR ')})`);
    } else {
      parts.push(`${key}:${value}`);
    }
  }
  return parts.join(' AND ');
}

function mapAlgoliaHit(hit: AlgoliaHit): SearchHit {
  const { objectID, _highlightResult, ...rest } = hit;

  const highlightedFields: Record<string, string> = {};
  if (_highlightResult) {
    for (const [field, highlight] of Object.entries(_highlightResult)) {
      if (highlight.matchLevel !== 'none') {
        highlightedFields[field] = highlight.value;
      }
    }
  }

  return {
    objectID,
    content: rest as Record<string, unknown>,
    highlightedFields,
    score: 1.0, // Algolia ranks by relevance; score not directly exposed
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class AlgoliaSearchAdapter implements SearchAdapter {
  private readonly appId: string;
  private readonly apiKey: string;
  private readonly indexPrefix: string;

  readonly config: AdapterConfig = {
    id: 'algolia-search',
    name: 'Algolia Search Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 10000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    const appId = Deno.env.get('ALGOLIA_APP_ID');
    const apiKey = Deno.env.get('ALGOLIA_API_KEY');

    if (!appId || !apiKey) {
      throw new Error(
        'Algolia adapter requires ALGOLIA_APP_ID and ALGOLIA_API_KEY environment variables',
      );
    }

    this.appId = appId;
    this.apiKey = apiKey;
    this.indexPrefix = Deno.env.get('ALGOLIA_INDEX_PREFIX') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(
        `https://${this.appId}-dsn.algolia.net/1/indexes`,
        {
          method: 'GET',
          headers: this.headers(),
          signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
        },
      );

      return {
        adapterId: this.config.id,
        healthy: response.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const indexName = this.resolveIndexName(request.indexName, request.tenantId);
    const url = `https://${this.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`;

    const body: Record<string, unknown> = {
      query: request.query,
      page: request.page ?? 0,
      hitsPerPage: request.hitsPerPage ?? 20,
    };

    if (request.filters && Object.keys(request.filters).length > 0) {
      body.filters = buildFilterString(request.filters);
    }

    if (request.facets && request.facets.length > 0) {
      body.facets = request.facets;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Algolia search failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: AlgoliaSearchResponse = await response.json();

    return {
      hits: data.hits.map(mapAlgoliaHit),
      totalHits: data.nbHits,
      page: data.page,
      totalPages: data.nbPages,
      facets: data.facets ?? {},
      processingTimeMs: data.processingTimeMS,
    };
  }

  async index(request: IndexRequest): Promise<IndexResponse> {
    const indexName = this.resolveIndexName(request.indexName, request.tenantId);
    const url = `https://${this.appId}.algolia.net/1/indexes/${encodeURIComponent(indexName)}/batch`;

    const body = {
      requests: request.objects.map((obj) => ({
        action: 'addObject' as const,
        body: {
          objectID: obj.objectID,
          ...obj.content,
        },
      })),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Algolia index failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: AlgoliaBatchResponse = await response.json();

    return {
      objectIDs: data.objectIDs,
      taskId: String(data.taskID),
    };
  }

  async deleteIndex(request: DeleteIndexRequest): Promise<void> {
    const indexName = this.resolveIndexName(request.indexName, request.tenantId);
    const url = `https://${this.appId}.algolia.net/1/indexes/${encodeURIComponent(indexName)}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Algolia delete index failed (HTTP ${response.status}): ${errorBody}`);
    }
  }

  async suggest(request: SuggestRequest): Promise<SuggestResponse> {
    // Use a standard search with limited hits for suggestions
    const result = await this.search({
      query: request.query,
      indexName: request.indexName,
      tenantId: request.tenantId,
      hitsPerPage: request.limit ?? 5,
      page: 0,
    });

    const suggestions: string[] = [];
    for (const hit of result.hits) {
      // Extract the first string field as a suggestion label
      for (const value of Object.values(hit.content)) {
        if (typeof value === 'string' && value.length > 0 && !suggestions.includes(value)) {
          suggestions.push(value);
          break;
        }
      }
    }

    return { suggestions };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private headers(): Record<string, string> {
    return {
      'X-Algolia-Application-Id': this.appId,
      'X-Algolia-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private resolveIndexName(indexName: string, tenantId: string): string {
    const prefix = this.indexPrefix ? `${this.indexPrefix}_` : '';
    return `${prefix}${tenantId}_${indexName}`;
  }
}
