/**
 * Gateway Domain — Search
 *
 * Client-side hooks for full-text search across transactions,
 * documents, content, and FAQs via the search adapter.
 */

import type { CallGatewayFn } from './client';

export interface SearchHit {
  objectID: string;
  content: Record<string, unknown>;
  highlightedFields: Record<string, string>;
  score: number;
}

export interface SearchResult {
  hits: SearchHit[];
  totalHits: number;
  page: number;
  totalPages: number;
  facets: Record<string, Record<string, number>>;
  processingTimeMs: number;
}

export interface SearchSuggestion {
  suggestions: string[];
}

export function createSearchDomain(callGateway: CallGatewayFn) {
  return {
    search: {
      async query(params: {
        query: string;
        indexName: string;
        filters?: Record<string, string | string[]>;
        facets?: string[];
        page?: number;
        hitsPerPage?: number;
      }) {
        return callGateway<SearchResult>('search.query', params);
      },

      async index(params: {
        indexName: string;
        objects: Array<{ objectID: string; content: Record<string, unknown> }>;
      }) {
        return callGateway<{ objectIDs: string[]; taskId: string }>('search.index', params);
      },

      async suggest(params: {
        query: string;
        indexName: string;
        limit?: number;
      }) {
        return callGateway<SearchSuggestion>('search.suggest', params);
      },
    },
  };
}
