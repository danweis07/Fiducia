/**
 * CMS Adapter Interface
 *
 * Defines the port for content management operations:
 *   - Content listing, retrieval, creation, and update
 *   - Content lifecycle (publish, archive)
 *   - Channel management
 *
 * Implementations:
 *   - Storyblok (headless CMS with visual editor)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CMS TYPES
// =============================================================================

/** Content publication status */
export type ContentStatus = 'draft' | 'published' | 'archived';

/** Content type classification (extensible with string) */
export type ContentType = 'article' | 'announcement' | 'faq' | 'policy' | 'page' | string;

// =============================================================================
// DATA MODELS
// =============================================================================

/** A single CMS content item */
export interface CMSContentItem {
  /** Unique content identifier */
  id: string;
  /** Tenant identifier */
  firmId: string;
  /** Content title */
  title: string;
  /** URL-safe slug */
  slug: string;
  /** Content type classification */
  contentType: ContentType;
  /** Full content body (HTML or Markdown) */
  body: string;
  /** Short summary or excerpt */
  summary: string;
  /** Distribution channels this content belongs to */
  channels: string[];
  /** Publication status */
  status: ContentStatus;
  /** Content version number */
  version: number;
  /** Author user ID */
  authorId: string;
  /** When the content was published (ISO 8601, null if unpublished) */
  publishedAt: string | null;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Arbitrary metadata */
  metadata: Record<string, unknown>;
}

/** A CMS distribution channel */
export interface CMSChannelItem {
  /** Unique channel identifier */
  id: string;
  /** Tenant identifier */
  firmId: string;
  /** Channel display name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Channel description */
  description: string;
  /** Whether the channel is currently active */
  isActive: boolean;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListContentRequest {
  tenantId: string;
  status?: ContentStatus;
  contentType?: ContentType;
  channel?: string;
  limit?: number;
  offset?: number;
}

export interface ListContentResponse {
  content: CMSContentItem[];
  total: number;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface GetContentRequest {
  tenantId: string;
  id: string;
}

export interface GetContentResponse {
  content: CMSContentItem;
}

export interface CreateContentRequest {
  tenantId: string;
  title: string;
  slug?: string;
  contentType: ContentType;
  body?: string;
  summary?: string;
  channels?: string[];
  authorId: string;
}

export interface CreateContentResponse {
  content: CMSContentItem;
}

export interface UpdateContentRequest {
  tenantId: string;
  id: string;
  title?: string;
  slug?: string;
  body?: string;
  summary?: string;
  channels?: string[];
  contentType?: ContentType;
}

export interface UpdateContentResponse {
  content: CMSContentItem;
}

export interface PublishContentRequest {
  tenantId: string;
  id: string;
}

export interface PublishContentResponse {
  content: CMSContentItem;
}

export interface ArchiveContentRequest {
  tenantId: string;
  id: string;
}

export interface ArchiveContentResponse {
  content: CMSContentItem;
}

export interface ListChannelsRequest {
  tenantId: string;
}

export interface ListChannelsResponse {
  channels: CMSChannelItem[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * CMS adapter — abstracts content management operations.
 *
 * Implementations handle provider-specific APIs (Storyblok, etc.) while
 * exposing a uniform interface for content CRUD, publishing, and channel
 * management.
 */
export interface CMSAdapter extends BaseAdapter {
  /** List content items with optional filtering */
  listContent(request: ListContentRequest): Promise<ListContentResponse>;

  /** Get a single content item by ID */
  getContent(request: GetContentRequest): Promise<GetContentResponse>;

  /** Create a new content item (defaults to draft status) */
  createContent(request: CreateContentRequest): Promise<CreateContentResponse>;

  /** Update an existing content item */
  updateContent(request: UpdateContentRequest): Promise<UpdateContentResponse>;

  /** Publish a content item */
  publishContent(request: PublishContentRequest): Promise<PublishContentResponse>;

  /** Archive a content item */
  archiveContent(request: ArchiveContentRequest): Promise<ArchiveContentResponse>;

  /** List available distribution channels */
  listChannels(request: ListChannelsRequest): Promise<ListChannelsResponse>;
}
