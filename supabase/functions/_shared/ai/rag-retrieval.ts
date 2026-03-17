/**
 * RAG Retrieval Module
 *
 * Handles document chunking, embedding, and retrieval for per-tenant
 * knowledge base RAG (Retrieval-Augmented Generation).
 *
 * Pipeline:
 *   1. Documents are chunked into manageable text segments
 *   2. Chunks are embedded via the AI services adapter
 *   3. At query time, the query is embedded and matched against stored chunks
 *   4. Top-matching chunks are returned with source citations
 *
 * Database dependencies:
 *   - kb_documents: stores document metadata (title, tenant_id, etc.)
 *   - kb_chunks: stores chunk content + embedding vectors
 *   - match_kb_chunks: Supabase RPC for vector similarity search
 */

import type { AIServicesAdapter } from '../adapters/ai-services/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface RAGChunk {
  content: string;
  documentId: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RAGSource {
  documentId: string;
  title: string;
}

export interface RAGContext {
  chunks: RAGChunk[];
  sources: RAGSource[];
  hasResults: boolean;
}

interface ChunkOptions {
  /** Target chunk size in characters (default: 2000, ~500 tokens) */
  chunkSize?: number;
  /** Overlap between consecutive chunks in characters (default: 200) */
  overlap?: number;
}

interface RetrievalOptions {
  /** Minimum cosine similarity threshold (default: 0.7) */
  threshold?: number;
  /** Maximum number of chunks to return (default: 5) */
  maxChunks?: number;
}

// =============================================================================
// DOCUMENT CHUNKING
// =============================================================================

/**
 * Split document content into overlapping chunks suitable for embedding.
 *
 * Strategy:
 *   - Split on paragraph boundaries (double newline) first
 *   - If a single paragraph exceeds chunkSize, split on sentence boundaries
 *   - If a single sentence exceeds chunkSize, split on word boundaries
 *   - Apply overlap by carrying trailing characters from the previous chunk
 *
 * @param content - Raw document text
 * @param opts - Chunking parameters
 * @returns Array of text chunks
 */
export function chunkDocument(
  content: string,
  opts?: ChunkOptions,
): string[] {
  const chunkSize = opts?.chunkSize ?? 2000;
  const overlap = opts?.overlap ?? 200;

  if (!content || content.trim().length === 0) {
    return [];
  }

  const trimmed = content.trim();

  // If the entire document fits in one chunk, return it directly
  if (trimmed.length <= chunkSize) {
    return [trimmed];
  }

  // Split into paragraphs (double newline or more)
  const paragraphs = trimmed.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  // Further split oversized paragraphs into sentences
  const segments = flatMap(paragraphs, (para) => {
    if (para.length <= chunkSize) {
      return [para.trim()];
    }
    return splitIntoSentences(para, chunkSize);
  });

  // Assemble segments into chunks with overlap
  return assembleChunks(segments, chunkSize, overlap);
}

/**
 * Split a paragraph into sentence-level segments.
 * Falls back to word-level splitting if a sentence exceeds maxLen.
 */
function splitIntoSentences(text: string, maxLen: number): string[] {
  // Split on sentence-ending punctuation followed by whitespace
  const sentencePattern = /(?<=[.!?])\s+/;
  const rawSentences = text.split(sentencePattern).filter((s) => s.trim().length > 0);

  const result: string[] = [];
  for (const sentence of rawSentences) {
    if (sentence.length <= maxLen) {
      result.push(sentence.trim());
    } else {
      // Sentence too long — split on word boundaries
      result.push(...splitOnWords(sentence, maxLen));
    }
  }
  return result;
}

/**
 * Split text on word boundaries, respecting maxLen.
 */
function splitOnWords(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const parts: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length > maxLen && current.length > 0) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

/**
 * Assemble segments into chunks with overlap.
 * Greedily packs segments until chunkSize is reached,
 * then starts a new chunk with overlap from the end of the previous chunk.
 */
function assembleChunks(
  segments: string[],
  chunkSize: number,
  overlap: number,
): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const separator = currentChunk.length > 0 ? '\n\n' : '';
    const candidate = currentChunk + separator + segment;

    if (candidate.length > chunkSize && currentChunk.length > 0) {
      // Finalize the current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap from the tail of the previous chunk
      const overlapText = extractOverlap(currentChunk, overlap);
      currentChunk = overlapText.length > 0
        ? overlapText + '\n\n' + segment
        : segment;
    } else {
      currentChunk = candidate;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract the trailing `maxLen` characters from text, aligned to a word boundary.
 */
function extractOverlap(text: string, maxLen: number): string {
  if (text.length <= maxLen) {
    return text;
  }

  const tail = text.slice(-maxLen);
  // Align to a word boundary by trimming the leading partial word
  const firstSpace = tail.indexOf(' ');
  if (firstSpace > 0 && firstSpace < tail.length - 1) {
    return tail.slice(firstSpace + 1);
  }
  return tail;
}

/**
 * Flat-map helper (avoids needing Array.prototype.flatMap polyfill in all runtimes).
 */
function flatMap<T, U>(arr: T[], fn: (item: T) => U[]): U[] {
  const result: U[] = [];
  for (const item of arr) {
    result.push(...fn(item));
  }
  return result;
}

// =============================================================================
// EMBEDDING
// =============================================================================

/**
 * Generate embedding vectors for an array of text chunks.
 *
 * @param chunks - Text chunks to embed
 * @param adapter - AI services adapter with embed() capability
 * @returns Array of embedding vectors (one per chunk)
 */
export async function embedChunks(
  chunks: string[],
  adapter: AIServicesAdapter,
): Promise<number[][]> {
  if (chunks.length === 0) {
    return [];
  }

  // Batch embeddings — the adapter handles provider-specific batching limits
  const response = await adapter.embed({
    input: chunks,
    trace: {
      name: 'rag-embed-chunks',
      metadata: { chunkCount: chunks.length },
    },
  });

  return response.embeddings;
}

// =============================================================================
// RETRIEVAL
// =============================================================================

/**
 * Retrieve relevant knowledge base chunks for a query within a tenant's scope.
 *
 * Steps:
 *   1. Embed the query string
 *   2. Call the `match_kb_chunks` RPC for vector similarity search
 *   3. Join with kb_documents to resolve source titles
 *   4. Return structured context with de-duplicated sources
 *
 * @param query - User query or question
 * @param tenantId - Tenant ID for data isolation
 * @param adapter - AI services adapter for embedding
 * @param supabase - Supabase client instance
 * @param opts - Retrieval tuning parameters
 * @returns RAGContext with matched chunks and source citations
 */
export async function retrieveContext(
  query: string,
  tenantId: string,
  adapter: AIServicesAdapter,
  supabase: { rpc: (fn: string, params: Record<string, unknown>) => { data: unknown; error: unknown } },
  opts?: RetrievalOptions,
): Promise<RAGContext> {
  const threshold = opts?.threshold ?? 0.7;
  const maxChunks = opts?.maxChunks ?? 5;

  // Step 1: Embed the query
  const embeddingResponse = await adapter.embed({
    input: query,
    trace: {
      name: 'rag-query-embed',
      metadata: { tenantId, queryLength: query.length },
    },
  });

  const queryEmbedding = embeddingResponse.embeddings[0];
  if (!queryEmbedding) {
    return { chunks: [], sources: [], hasResults: false };
  }

  // Step 2: Vector similarity search via Supabase RPC
  // The match_kb_chunks function is expected to:
  //   - Accept a query embedding, tenant_id, similarity threshold, and match count
  //   - Return rows with: chunk_content, document_id, similarity, metadata, document_title
  //   - Enforce tenant isolation (WHERE tenant_id = p_tenant_id)
  //   - Order by similarity DESC
  const { data, error } = supabase.rpc('match_kb_chunks', {
    p_query_embedding: queryEmbedding,
    p_tenant_id: tenantId,
    p_similarity_threshold: threshold,
    p_match_count: maxChunks,
  }) as {
    data: Array<{
      chunk_content: string;
      document_id: string;
      similarity: number;
      metadata: Record<string, unknown>;
      document_title: string;
    }> | null;
    error: { message: string } | null;
  };

  if (error) {
    console.error('[RAG] match_kb_chunks RPC error:', error.message);
    return { chunks: [], sources: [], hasResults: false };
  }

  if (!data || data.length === 0) {
    return { chunks: [], sources: [], hasResults: false };
  }

  // Step 3: Build RAGContext with de-duplicated sources
  const chunks: RAGChunk[] = data.map((row) => ({
    content: row.chunk_content,
    documentId: row.document_id,
    similarity: row.similarity,
    metadata: row.metadata ?? {},
  }));

  const sourceMap = new Map<string, string>();
  for (const row of data) {
    if (!sourceMap.has(row.document_id)) {
      sourceMap.set(row.document_id, row.document_title);
    }
  }

  const sources: RAGSource[] = Array.from(sourceMap.entries()).map(
    ([documentId, title]) => ({ documentId, title }),
  );

  return {
    chunks,
    sources,
    hasResults: true,
  };
}

// =============================================================================
// CONTEXT FORMATTING
// =============================================================================

/**
 * Format RAGContext into a string suitable for injection into an LLM system prompt.
 *
 * Produces a structured block with numbered sources and chunk content,
 * enabling the model to cite sources in its response.
 *
 * @param context - RAGContext from retrieveContext()
 * @returns Formatted context string, or empty string if no results
 */
export function formatRAGContext(context: RAGContext): string {
  if (!context.hasResults || context.chunks.length === 0) {
    return '';
  }

  const sourceIndex = new Map<string, number>();
  context.sources.forEach((src, idx) => {
    sourceIndex.set(src.documentId, idx + 1);
  });

  // Build the sources legend
  const sourcesSection = context.sources
    .map((src, idx) => `  [${idx + 1}] ${src.title}`)
    .join('\n');

  // Build the chunks section with source references
  const chunksSection = context.chunks
    .map((chunk, idx) => {
      const srcNum = sourceIndex.get(chunk.documentId) ?? 0;
      const similarityPct = (chunk.similarity * 100).toFixed(1);
      return `--- Chunk ${idx + 1} (Source [${srcNum}], relevance: ${similarityPct}%) ---\n${chunk.content}`;
    })
    .join('\n\n');

  return [
    '=== Knowledge Base Context ===',
    '',
    'Sources:',
    sourcesSection,
    '',
    chunksSection,
    '',
    '=== End Knowledge Base Context ===',
  ].join('\n');
}
