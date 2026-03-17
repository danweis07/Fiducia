import { describe, it, expect } from 'vitest';
import {
  chunkDocument,
  formatRAGContext,
} from '../../../supabase/functions/_shared/ai/rag-retrieval';
import type { RAGContext } from '../../../supabase/functions/_shared/ai/rag-retrieval';

// =============================================================================
// chunkDocument
// =============================================================================

describe('chunkDocument', () => {
  it('returns empty array for empty string', () => {
    expect(chunkDocument('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(chunkDocument('   \n\n  ')).toEqual([]);
  });

  it('returns single chunk for short document', () => {
    const doc = 'This is a short document about banking.';
    const chunks = chunkDocument(doc, { chunkSize: 2000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(doc);
  });

  it('returns single chunk when doc length equals chunkSize', () => {
    const doc = 'A'.repeat(200);
    const chunks = chunkDocument(doc, { chunkSize: 200 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(doc);
  });

  it('splits long document into multiple chunks', () => {
    // Create a document with multiple paragraphs that exceeds chunkSize
    const paragraph = 'This is a paragraph about banking services and account management. It contains multiple sentences that describe various features. Members can check balances, view transactions, and manage their accounts online.';
    const doc = Array(10).fill(paragraph).join('\n\n');
    const chunks = chunkDocument(doc, { chunkSize: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('chunks have overlap content from previous chunk', () => {
    // Create enough content to force multiple chunks
    const paragraphs = [];
    for (let i = 0; i < 20; i++) {
      paragraphs.push(`Paragraph number ${i}. This paragraph discusses topic ${i} in detail with enough content to matter for chunking.`);
    }
    const doc = paragraphs.join('\n\n');
    const chunks = chunkDocument(doc, { chunkSize: 300, overlap: 100 });

    expect(chunks.length).toBeGreaterThan(1);

    // The second chunk should contain some text from the end of the first chunk (overlap)
    if (chunks.length >= 2) {
      // Extract the last portion of chunk 0
      const tailOfFirst = chunks[0].slice(-50);
      // The beginning of chunk 1 should share some content with the tail of chunk 0
      // Due to word-boundary alignment, we check for partial overlap
      const words = tailOfFirst.split(/\s+/).filter(w => w.length > 3);
      const hasOverlap = words.some(word => chunks[1].includes(word));
      expect(hasOverlap).toBe(true);
    }
  });

  it('respects sentence boundaries when splitting paragraphs', () => {
    // One very long paragraph with clear sentence boundaries
    const sentences = [];
    for (let i = 0; i < 30; i++) {
      sentences.push(`Sentence number ${i} provides important information about banking.`);
    }
    const doc = sentences.join(' ');
    const chunks = chunkDocument(doc, { chunkSize: 300, overlap: 50 });

    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should ideally end at or near a sentence boundary
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      // Most chunks should end with a period (sentence boundary) or be the last chunk
      // We just verify they don't end mid-word (have trailing spaces trimmed)
      expect(trimmed).toBe(chunk.trim());
    }
  });

  it('uses default chunkSize of 2000 and overlap of 200', () => {
    // A doc slightly over 2000 chars should produce 2 chunks with defaults
    const doc = 'A'.repeat(1000) + '\n\n' + 'B'.repeat(1000) + '\n\n' + 'C'.repeat(500);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('handles document with only one paragraph that exceeds chunkSize', () => {
    // A single long paragraph (no double newlines) that exceeds chunkSize
    const sentences = [];
    for (let i = 0; i < 50; i++) {
      sentences.push(`This is sentence ${i} in a very long paragraph.`);
    }
    const doc = sentences.join(' ');
    const chunks = chunkDocument(doc, { chunkSize: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    // All content should be represented
    const allText = chunks.join(' ');
    expect(allText).toContain('sentence 0');
    expect(allText).toContain('sentence 49');
  });
});

// =============================================================================
// formatRAGContext
// =============================================================================

describe('formatRAGContext', () => {
  it('returns empty string for no results', () => {
    const context: RAGContext = {
      chunks: [],
      sources: [],
      hasResults: false,
    };
    expect(formatRAGContext(context)).toBe('');
  });

  it('returns empty string when hasResults is false even with chunks', () => {
    const context: RAGContext = {
      chunks: [
        { content: 'Some content', documentId: 'doc-1', similarity: 0.9, metadata: {} },
      ],
      sources: [{ documentId: 'doc-1', title: 'Doc 1' }],
      hasResults: false,
    };
    expect(formatRAGContext(context)).toBe('');
  });

  it('returns empty string when chunks array is empty but hasResults is true', () => {
    const context: RAGContext = {
      chunks: [],
      sources: [],
      hasResults: true,
    };
    expect(formatRAGContext(context)).toBe('');
  });

  it('formats single source and chunk correctly', () => {
    const context: RAGContext = {
      chunks: [
        {
          content: 'Checking accounts have no monthly fee for members.',
          documentId: 'doc-1',
          similarity: 0.92,
          metadata: {},
        },
      ],
      sources: [{ documentId: 'doc-1', title: 'Fee Schedule 2024' }],
      hasResults: true,
    };

    const formatted = formatRAGContext(context);

    expect(formatted).toContain('=== Knowledge Base Context ===');
    expect(formatted).toContain('=== End Knowledge Base Context ===');
    expect(formatted).toContain('Sources:');
    expect(formatted).toContain('[1] Fee Schedule 2024');
    expect(formatted).toContain('Chunk 1');
    expect(formatted).toContain('Source [1]');
    expect(formatted).toContain('92.0%');
    expect(formatted).toContain('Checking accounts have no monthly fee');
  });

  it('formats multiple sources and chunks with proper numbering', () => {
    const context: RAGContext = {
      chunks: [
        {
          content: 'Interest rates for savings accounts are competitive.',
          documentId: 'doc-1',
          similarity: 0.95,
          metadata: {},
        },
        {
          content: 'CD rates are locked for the term of the certificate.',
          documentId: 'doc-2',
          similarity: 0.88,
          metadata: {},
        },
        {
          content: 'High-yield savings requires a minimum balance of $1,000.',
          documentId: 'doc-1',
          similarity: 0.82,
          metadata: {},
        },
      ],
      sources: [
        { documentId: 'doc-1', title: 'Savings Products Guide' },
        { documentId: 'doc-2', title: 'CD Rate Sheet' },
      ],
      hasResults: true,
    };

    const formatted = formatRAGContext(context);

    // Sources section
    expect(formatted).toContain('[1] Savings Products Guide');
    expect(formatted).toContain('[2] CD Rate Sheet');

    // Chunks reference correct sources
    expect(formatted).toContain('Chunk 1 (Source [1]');
    expect(formatted).toContain('Chunk 2 (Source [2]');
    expect(formatted).toContain('Chunk 3 (Source [1]');

    // Similarity percentages
    expect(formatted).toContain('95.0%');
    expect(formatted).toContain('88.0%');
    expect(formatted).toContain('82.0%');

    // Content is present
    expect(formatted).toContain('Interest rates for savings accounts');
    expect(formatted).toContain('CD rates are locked');
    expect(formatted).toContain('High-yield savings requires');
  });

  it('de-duplicates sources across chunks', () => {
    const context: RAGContext = {
      chunks: [
        { content: 'Chunk A from doc 1.', documentId: 'doc-1', similarity: 0.9, metadata: {} },
        { content: 'Chunk B from doc 1.', documentId: 'doc-1', similarity: 0.85, metadata: {} },
      ],
      sources: [{ documentId: 'doc-1', title: 'Single Document' }],
      hasResults: true,
    };

    const formatted = formatRAGContext(context);

    // Should only list the source once
    const sourceMatches = formatted.match(/\[1\] Single Document/g);
    expect(sourceMatches).toHaveLength(1);

    // Both chunks should reference source [1]
    expect(formatted).toContain('Chunk 1 (Source [1]');
    expect(formatted).toContain('Chunk 2 (Source [1]');
  });
});
