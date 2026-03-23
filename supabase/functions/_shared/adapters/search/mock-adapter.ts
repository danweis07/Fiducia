/**
 * Mock Search Adapter
 *
 * Returns synthetic search results for sandbox/testing when no
 * Algolia or other search credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  SearchAdapter,
  SearchRequest,
  SearchResponse,
  SearchHit,
  IndexRequest,
  IndexResponse,
  DeleteIndexRequest,
  SuggestRequest,
  SuggestResponse,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

interface MockRecord {
  objectID: string;
  content: Record<string, unknown>;
}

function mockTransactions(): MockRecord[] {
  return [
    {
      objectID: 'txn-001',
      content: {
        description: 'Direct deposit - Payroll',
        amount: 3250.00,
        type: 'credit',
        date: '2026-03-20',
        category: 'income',
      },
    },
    {
      objectID: 'txn-002',
      content: {
        description: 'Grocery store purchase',
        amount: -87.43,
        type: 'debit',
        date: '2026-03-19',
        category: 'groceries',
      },
    },
    {
      objectID: 'txn-003',
      content: {
        description: 'Electric utility payment',
        amount: -142.50,
        type: 'debit',
        date: '2026-03-18',
        category: 'utilities',
      },
    },
    {
      objectID: 'txn-004',
      content: {
        description: 'ATM withdrawal',
        amount: -200.00,
        type: 'debit',
        date: '2026-03-17',
        category: 'cash',
      },
    },
    {
      objectID: 'txn-005',
      content: {
        description: 'Transfer to savings account',
        amount: -500.00,
        type: 'transfer',
        date: '2026-03-16',
        category: 'savings',
      },
    },
  ];
}

function mockContent(): MockRecord[] {
  return [
    {
      objectID: 'doc-001',
      content: {
        title: 'How to set up direct deposit',
        body: 'Direct deposit allows your employer to deposit your paycheck directly into your account. Contact your HR department with your routing and account number.',
        category: 'guides',
      },
    },
    {
      objectID: 'doc-002',
      content: {
        title: 'Understanding your credit score',
        body: 'Your credit score is a numerical representation of your creditworthiness. Scores range from 300 to 850, with higher scores indicating better credit.',
        category: 'education',
      },
    },
    {
      objectID: 'doc-003',
      content: {
        title: 'Mobile check deposit guide',
        body: 'Deposit checks anytime using your mobile device. Simply take a photo of the front and back of your check within the mobile banking app.',
        category: 'guides',
      },
    },
    {
      objectID: 'faq-001',
      content: {
        title: 'What are the wire transfer fees?',
        body: 'Domestic wire transfers are $25 for outgoing and free for incoming. International wires are $45 outgoing and $15 incoming.',
        category: 'faqs',
      },
    },
    {
      objectID: 'faq-002',
      content: {
        title: 'How do I reset my password?',
        body: 'Click "Forgot Password" on the login page. Enter your email address and follow the instructions sent to your inbox.',
        category: 'faqs',
      },
    },
  ];
}

function getMockData(indexName: string): MockRecord[] {
  switch (indexName) {
    case 'transactions':
      return mockTransactions();
    case 'documents':
    case 'content':
    case 'faqs':
      return mockContent();
    default:
      return mockContent();
  }
}

function matchesQuery(record: MockRecord, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return Object.values(record.content).some((value) => {
    if (typeof value === 'string') {
      return value.toLowerCase().includes(lowerQuery);
    }
    return String(value).toLowerCase().includes(lowerQuery);
  });
}

function highlightMatch(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;
  return (
    text.substring(0, idx) +
    '<em>' +
    text.substring(idx, idx + query.length) +
    '</em>' +
    text.substring(idx + query.length)
  );
}

function buildHighlightedFields(
  content: Record<string, unknown>,
  query: string,
): Record<string, string> {
  const highlighted: Record<string, string> = {};
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
      highlighted[key] = highlightMatch(value, query);
    }
  }
  return highlighted;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockSearchAdapter implements SearchAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-search',
    name: 'Mock Search Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
      errorMessage: 'Running in sandbox mode',
    };
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    const allRecords = getMockData(request.indexName);
    const query = request.query.trim();

    // Filter by query
    const matched = query.length > 0
      ? allRecords.filter((r) => matchesQuery(r, query))
      : allRecords;

    // Build hits with highlights and scores
    const hits: SearchHit[] = matched.map((record, idx) => ({
      objectID: record.objectID,
      content: record.content,
      highlightedFields: query.length > 0
        ? buildHighlightedFields(record.content, query)
        : {},
      score: 1.0 - idx * 0.1,
    }));

    // Pagination
    const page = request.page ?? 0;
    const hitsPerPage = request.hitsPerPage ?? 20;
    const start = page * hitsPerPage;
    const paginatedHits = hits.slice(start, start + hitsPerPage);
    const totalPages = Math.max(1, Math.ceil(hits.length / hitsPerPage));

    // Build facets
    const facets: Record<string, Record<string, number>> = {};
    if (request.facets) {
      for (const facetAttr of request.facets) {
        const counts: Record<string, number> = {};
        for (const record of matched) {
          const val = record.content[facetAttr];
          if (typeof val === 'string') {
            counts[val] = (counts[val] ?? 0) + 1;
          }
        }
        facets[facetAttr] = counts;
      }
    }

    return {
      hits: paginatedHits,
      totalHits: hits.length,
      page,
      totalPages,
      facets,
      processingTimeMs: Date.now() - startTime,
    };
  }

  async index(request: IndexRequest): Promise<IndexResponse> {
    const objectIDs = request.objects.map((obj) => obj.objectID);
    return {
      objectIDs,
      taskId: `mock-task-${Date.now()}`,
    };
  }

  async deleteIndex(_request: DeleteIndexRequest): Promise<void> {
    // No-op in mock mode
  }

  async suggest(request: SuggestRequest): Promise<SuggestResponse> {
    const allRecords = getMockData(request.indexName);
    const query = request.query.toLowerCase().trim();
    const limit = request.limit ?? 5;

    if (query.length === 0) {
      return { suggestions: [] };
    }

    const suggestions: string[] = [];
    for (const record of allRecords) {
      for (const value of Object.values(record.content)) {
        if (
          typeof value === 'string' &&
          value.toLowerCase().includes(query) &&
          !suggestions.includes(value)
        ) {
          suggestions.push(value);
          if (suggestions.length >= limit) break;
        }
      }
      if (suggestions.length >= limit) break;
    }

    return { suggestions };
  }
}
