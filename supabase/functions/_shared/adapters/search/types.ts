/**
 * Search Adapter Interface
 *
 * Defines the port for full-text search and indexing operations:
 *   - Multi-index search with filtering and faceting
 *   - Document indexing and batch updates
 *   - Index lifecycle management
 *   - Search suggestions / autocomplete
 *
 * Implementations:
 *   - Algolia (hosted search-as-a-service)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// SEARCH TYPES
// =============================================================================

/** Supported index names (extensible with string) */
export type IndexName = 'transactions' | 'documents' | 'content' | 'faqs' | string;

// =============================================================================
// DATA MODELS
// =============================================================================

/** A single search hit returned from a query */
export interface SearchHit {
  /** Unique object identifier within the index */
  objectID: string;
  /** Object content fields */
  content: Record<string, unknown>;
  /** Fields with highlighted matching fragments */
  highlightedFields: Record<string, string>;
  /** Relevance score */
  score: number;
}

/** An object to be indexed */
export interface IndexObject {
  /** Unique object identifier */
  objectID: string;
  /** Object content fields */
  content: Record<string, unknown>;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface SearchRequest {
  /** Search query string */
  query: string;
  /** Index to search */
  indexName: IndexName;
  /** Attribute filters (key → value or values) */
  filters?: Record<string, string | string[]>;
  /** Facet attributes to return counts for */
  facets?: string[];
  /** Zero-based page number */
  page?: number;
  /** Number of hits per page (default 20) */
  hitsPerPage?: number;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
}

export interface SearchResponse {
  /** Matching hits for the current page */
  hits: SearchHit[];
  /** Total number of matching hits */
  totalHits: number;
  /** Current page (zero-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Facet counts keyed by attribute → value → count */
  facets: Record<string, Record<string, number>>;
  /** Server-side processing time in milliseconds */
  processingTimeMs: number;
}

export interface IndexRequest {
  /** Target index name */
  indexName: IndexName;
  /** Objects to index */
  objects: IndexObject[];
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
}

export interface IndexResponse {
  /** IDs of successfully indexed objects */
  objectIDs: string[];
  /** Provider task/job ID for tracking */
  taskId: string;
}

export interface DeleteIndexRequest {
  /** Index to delete */
  indexName: IndexName;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
}

export interface SuggestRequest {
  /** Partial query string */
  query: string;
  /** Index to search for suggestions */
  indexName: IndexName;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Maximum number of suggestions to return */
  limit?: number;
}

export interface SuggestResponse {
  /** Autocomplete suggestions */
  suggestions: string[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Search adapter — abstracts full-text search and indexing services.
 *
 * Implementations handle provider-specific APIs (Algolia, etc.) while
 * exposing a uniform interface for search, indexing, and suggestions.
 */
export interface SearchAdapter extends BaseAdapter {
  /** Execute a search query against an index */
  search(request: SearchRequest): Promise<SearchResponse>;

  /** Index (upsert) objects into an index */
  index(request: IndexRequest): Promise<IndexResponse>;

  /** Delete an entire index */
  deleteIndex(request: DeleteIndexRequest): Promise<void>;

  /** Get search suggestions / autocomplete */
  suggest(request: SuggestRequest): Promise<SuggestResponse>;
}
