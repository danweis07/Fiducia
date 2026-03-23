// TODO: Provisional integration — not yet validated in production.
/**
 * Storyblok CMS Adapter
 *
 * Integrates with Storyblok's headless CMS platform for:
 *   - Content delivery via CDN API (read-only, cached)
 *   - Content management via Management API (CRUD, publish, unpublish)
 *   - Channel management mapped to Storyblok folders/tags
 *
 * Requirements:
 *   - STORYBLOK_ACCESS_TOKEN: Storyblok access token (CDN or OAuth)
 *   - STORYBLOK_SPACE_ID: Storyblok space identifier
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CMSAdapter,
  CMSContentItem,
  CMSChannelItem,
  ContentStatus,
  ListContentRequest,
  ListContentResponse,
  GetContentRequest,
  GetContentResponse,
  CreateContentRequest,
  CreateContentResponse,
  UpdateContentRequest,
  UpdateContentResponse,
  PublishContentRequest,
  PublishContentResponse,
  ArchiveContentRequest,
  ArchiveContentResponse,
  ListChannelsRequest,
  ListChannelsResponse,
} from './types.ts';

// =============================================================================
// STORYBLOK RESPONSE TYPE MAPPINGS
// =============================================================================

/** Storyblok story object shape (subset of full API response) */
interface StoryblokStory {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  full_slug: string;
  content: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  is_startpage: boolean;
  tag_list: string[];
  group_id: string;
  first_published_at: string | null;
}

interface StoryblokStoriesResponse {
  stories: StoryblokStory[];
  total: number;
  per_page: number;
  page: number;
}

interface StoryblokStoryResponse {
  story: StoryblokStory;
}

interface StoryblokFolder {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface StoryblokFoldersResponse {
  folders?: StoryblokFolder[];
}

// =============================================================================
// HELPERS
// =============================================================================

function mapStoryblokStatus(story: StoryblokStory): ContentStatus {
  // Storyblok uses published_at to indicate published state
  // Archived stories are typically moved to a specific folder or tagged
  if (story.tag_list.includes('archived')) return 'archived';
  if (story.published_at) return 'published';
  return 'draft';
}

function mapStoryToContentItem(story: StoryblokStory, firmId: string): CMSContentItem {
  const content = story.content;
  return {
    id: String(story.id),
    firmId,
    title: story.name,
    slug: story.slug,
    contentType: (content.component as string) ?? 'page',
    body: (content.body as string) ?? '',
    summary: (content.summary as string) ?? '',
    channels: story.tag_list.filter(t => !['archived'].includes(t)),
    status: mapStoryblokStatus(story),
    version: 1, // Storyblok versioning is internal; expose as 1 for latest
    authorId: (content.author_id as string) ?? '',
    publishedAt: story.published_at ?? story.first_published_at ?? null,
    createdAt: story.created_at,
    updatedAt: story.updated_at,
    metadata: {
      storyblokUuid: story.uuid,
      fullSlug: story.full_slug,
      groupId: story.group_id,
      isStartpage: story.is_startpage,
    },
  };
}

function mapStatusToStoryblokVersion(status?: ContentStatus): string {
  // Storyblok CDN API uses version param: 'draft' or 'published'
  if (status === 'published') return 'published';
  return 'draft';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class StoryblokCMSAdapter implements CMSAdapter {
  private readonly accessToken: string;
  private readonly spaceId: string;
  private readonly cdnBaseUrl = 'https://api.storyblok.com/v2/cdn';
  private readonly mapiBaseUrl: string;

  readonly config: AdapterConfig = {
    id: 'storyblok-cms',
    name: 'Storyblok CMS Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.accessToken = Deno.env.get('STORYBLOK_ACCESS_TOKEN') ?? '';
    this.spaceId = Deno.env.get('STORYBLOK_SPACE_ID') ?? '';
    this.mapiBaseUrl = `https://mapi.storyblok.com/v1/spaces/${this.spaceId}`;
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private managementHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.accessToken,
    };
  }

  private cdnUrl(path: string, params: URLSearchParams): string {
    params.set('token', this.accessToken);
    return `${this.cdnBaseUrl}${path}?${params}`;
  }

  // ===========================================================================
  // BASE ADAPTER
  // ===========================================================================

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const params = new URLSearchParams();
      params.set('token', this.accessToken);
      params.set('per_page', '1');

      const response = await fetch(
        `${this.cdnBaseUrl}/stories?${params}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
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
        errorMessage: error instanceof Error ? error.message : 'Storyblok health check failed',
      };
    }
  }

  // ===========================================================================
  // CMS ADAPTER METHODS
  // ===========================================================================

  async listContent(request: ListContentRequest): Promise<ListContentResponse> {
    const params = new URLSearchParams();
    const limit = request.limit ?? 20;
    const offset = request.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;

    params.set('per_page', String(limit));
    params.set('page', String(page));
    params.set('version', mapStatusToStoryblokVersion(request.status));

    if (request.contentType) {
      params.set('filter_query[component][in]', request.contentType);
    }
    if (request.channel) {
      params.set('with_tag', request.channel);
    }

    const url = this.cdnUrl('/stories', params);
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok listContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: StoryblokStoriesResponse = await response.json();
    let items = data.stories.map(s => mapStoryToContentItem(s, request.tenantId));

    // Post-filter by status if needed (CDN only supports draft vs published)
    if (request.status === 'archived') {
      items = items.filter(c => c.status === 'archived');
    }

    const total = data.total;
    return {
      content: items,
      total,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getContent(request: GetContentRequest): Promise<GetContentResponse> {
    // Use Management API to get by numeric ID
    const response = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Content not found: ${request.id}`);
      }
      const errorBody = await response.text();
      throw new Error(`Storyblok getContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: StoryblokStoryResponse = await response.json();
    return { content: mapStoryToContentItem(data.story, request.tenantId) };
  }

  async createContent(request: CreateContentRequest): Promise<CreateContentResponse> {
    const slug = request.slug ?? request.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const body = {
      story: {
        name: request.title,
        slug,
        content: {
          component: request.contentType,
          body: request.body ?? '',
          summary: request.summary ?? '',
          author_id: request.authorId,
        },
        tag_list: request.channels ?? [],
        publish: 0, // Create as draft
      },
    };

    const response = await fetch(
      `${this.mapiBaseUrl}/stories`,
      {
        method: 'POST',
        headers: this.managementHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok createContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: StoryblokStoryResponse = await response.json();
    return { content: mapStoryToContentItem(data.story, request.tenantId) };
  }

  async updateContent(request: UpdateContentRequest): Promise<UpdateContentResponse> {
    // Fetch current story to merge updates
    const currentResponse = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!currentResponse.ok) {
      throw new Error(`Storyblok updateContent: failed to fetch story ${request.id} (HTTP ${currentResponse.status})`);
    }

    const current: StoryblokStoryResponse = await currentResponse.json();
    const existingContent = current.story.content;

    const body = {
      story: {
        name: request.title ?? current.story.name,
        slug: request.slug ?? current.story.slug,
        content: {
          ...existingContent,
          ...(request.body !== undefined ? { body: request.body } : {}),
          ...(request.summary !== undefined ? { summary: request.summary } : {}),
          ...(request.contentType !== undefined ? { component: request.contentType } : {}),
        },
        ...(request.channels !== undefined ? { tag_list: request.channels } : {}),
      },
    };

    const response = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'PUT',
        headers: this.managementHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok updateContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: StoryblokStoryResponse = await response.json();
    return { content: mapStoryToContentItem(data.story, request.tenantId) };
  }

  async publishContent(request: PublishContentRequest): Promise<PublishContentResponse> {
    // Storyblok publishes via a separate endpoint
    const response = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}/publish`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok publishContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    // Re-fetch to get updated story state
    const storyResponse = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!storyResponse.ok) {
      throw new Error(`Storyblok publishContent: failed to re-fetch story ${request.id}`);
    }

    const data: StoryblokStoryResponse = await storyResponse.json();
    return { content: mapStoryToContentItem(data.story, request.tenantId) };
  }

  async archiveContent(request: ArchiveContentRequest): Promise<ArchiveContentResponse> {
    // Storyblok has no native archive concept — we add an 'archived' tag
    // and unpublish the story to simulate archiving.

    // Fetch current story
    const currentResponse = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!currentResponse.ok) {
      throw new Error(`Storyblok archiveContent: failed to fetch story ${request.id} (HTTP ${currentResponse.status})`);
    }

    const current: StoryblokStoryResponse = await currentResponse.json();
    const tags = current.story.tag_list.includes('archived')
      ? current.story.tag_list
      : [...current.story.tag_list, 'archived'];

    // Update tags to include 'archived'
    const body = {
      story: {
        name: current.story.name,
        slug: current.story.slug,
        content: current.story.content,
        tag_list: tags,
      },
    };

    const response = await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}`,
      {
        method: 'PUT',
        headers: this.managementHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok archiveContent failed (HTTP ${response.status}): ${errorBody}`);
    }

    // Unpublish the story
    await fetch(
      `${this.mapiBaseUrl}/stories/${request.id}/unpublish`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    const data: StoryblokStoryResponse = await response.json();
    const content = mapStoryToContentItem(data.story, request.tenantId);
    content.status = 'archived';
    return { content };
  }

  async listChannels(request: ListChannelsRequest): Promise<ListChannelsResponse> {
    // Map Storyblok folders to CMS channels
    const response = await fetch(
      `${this.mapiBaseUrl}/stories?folder_only=1`,
      {
        method: 'GET',
        headers: this.managementHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Storyblok listChannels failed (HTTP ${response.status}): ${errorBody}`);
    }

    const data: StoryblokFoldersResponse = await response.json();
    const channels: CMSChannelItem[] = (data.folders ?? []).map(folder => ({
      id: String(folder.id),
      firmId: request.tenantId,
      name: folder.name,
      slug: folder.slug,
      description: '', // Storyblok folders don't have descriptions
      isActive: true,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
    }));

    return { channels };
  }
}
