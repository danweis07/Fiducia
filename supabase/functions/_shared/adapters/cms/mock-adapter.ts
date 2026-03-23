/**
 * Mock CMS Adapter
 *
 * Returns synthetic content management data for sandbox/testing when no
 * Storyblok or other CMS credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CMSAdapter,
  CMSContentItem,
  CMSChannelItem,
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
// MOCK DATA
// =============================================================================

function mockContent(): CMSContentItem[] {
  return [
    {
      id: 'cms-mock-001',
      firmId: 'mock-firm',
      title: 'Welcome to Digital Banking',
      slug: 'welcome-to-digital-banking',
      contentType: 'article',
      body: '<h1>Welcome</h1><p>Your new digital banking experience is here. Manage your accounts, pay bills, and transfer funds — all from your device.</p>',
      summary: 'An introduction to the digital banking platform and its key features.',
      channels: ['web', 'mobile'],
      status: 'published',
      version: 2,
      authorId: 'mock-author-001',
      publishedAt: '2026-03-01T10:00:00Z',
      createdAt: '2026-02-20T08:00:00Z',
      updatedAt: '2026-03-01T10:00:00Z',
      metadata: { featured: true },
    },
    {
      id: 'cms-mock-002',
      firmId: 'mock-firm',
      title: 'Scheduled Maintenance — March 2026',
      slug: 'scheduled-maintenance-march-2026',
      contentType: 'announcement',
      body: '<p>We will perform routine maintenance on Saturday, March 28, 2026 from 2:00 AM to 4:00 AM EST. Online banking and mobile services may be briefly unavailable.</p>',
      summary: 'Planned maintenance window for March 2026.',
      channels: ['web', 'mobile', 'email'],
      status: 'published',
      version: 1,
      authorId: 'mock-author-002',
      publishedAt: '2026-03-15T14:00:00Z',
      createdAt: '2026-03-15T14:00:00Z',
      updatedAt: '2026-03-15T14:00:00Z',
      metadata: { priority: 'high' },
    },
    {
      id: 'cms-mock-003',
      firmId: 'mock-firm',
      title: 'How to Set Up Direct Deposit',
      slug: 'how-to-set-up-direct-deposit',
      contentType: 'faq',
      body: '<p>To set up direct deposit, navigate to Settings > Direct Deposit and provide your employer with the routing and account numbers displayed on screen.</p>',
      summary: 'Step-by-step guide for configuring direct deposit.',
      channels: ['web'],
      status: 'published',
      version: 1,
      authorId: 'mock-author-001',
      publishedAt: '2026-02-25T09:00:00Z',
      createdAt: '2026-02-25T09:00:00Z',
      updatedAt: '2026-02-25T09:00:00Z',
      metadata: {},
    },
    {
      id: 'cms-mock-004',
      firmId: 'mock-firm',
      title: 'Updated Privacy Policy',
      slug: 'updated-privacy-policy',
      contentType: 'policy',
      body: '<p>Draft of the updated privacy policy reflecting new data retention standards.</p>',
      summary: 'Draft privacy policy update for Q2 2026.',
      channels: ['web'],
      status: 'draft',
      version: 1,
      authorId: 'mock-author-002',
      publishedAt: null,
      createdAt: '2026-03-18T11:00:00Z',
      updatedAt: '2026-03-18T11:00:00Z',
      metadata: { reviewRequired: true },
    },
  ];
}

function mockChannels(): CMSChannelItem[] {
  return [
    {
      id: 'ch-mock-001',
      firmId: 'mock-firm',
      name: 'Web Portal',
      slug: 'web',
      description: 'Content displayed on the online banking web portal.',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'ch-mock-002',
      firmId: 'mock-firm',
      name: 'Mobile App',
      slug: 'mobile',
      description: 'Content displayed within the mobile banking application.',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockCMSAdapter implements CMSAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-cms',
    name: 'Mock CMS Adapter',
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

  async listContent(request: ListContentRequest): Promise<ListContentResponse> {
    let items = mockContent();

    if (request.status) {
      items = items.filter(c => c.status === request.status);
    }
    if (request.contentType) {
      items = items.filter(c => c.contentType === request.contentType);
    }
    if (request.channel) {
      items = items.filter(c => c.channels.includes(request.channel!));
    }

    const total = items.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 20;
    const paged = items.slice(offset, offset + limit);

    return {
      content: paged,
      total,
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getContent(request: GetContentRequest): Promise<GetContentResponse> {
    const items = mockContent();
    const item = items.find(c => c.id === request.id);
    if (!item) {
      throw new Error(`Content not found: ${request.id}`);
    }
    return { content: item };
  }

  async createContent(request: CreateContentRequest): Promise<CreateContentResponse> {
    const now = new Date().toISOString();
    const content: CMSContentItem = {
      id: `cms-mock-${Date.now()}`,
      firmId: request.tenantId,
      title: request.title,
      slug: request.slug ?? request.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      contentType: request.contentType,
      body: request.body ?? '',
      summary: request.summary ?? '',
      channels: request.channels ?? [],
      status: 'draft',
      version: 1,
      authorId: request.authorId,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    return { content };
  }

  async updateContent(request: UpdateContentRequest): Promise<UpdateContentResponse> {
    const items = mockContent();
    const existing = items.find(c => c.id === request.id);
    if (!existing) {
      throw new Error(`Content not found: ${request.id}`);
    }
    const now = new Date().toISOString();
    const content: CMSContentItem = {
      ...existing,
      title: request.title ?? existing.title,
      slug: request.slug ?? existing.slug,
      body: request.body ?? existing.body,
      summary: request.summary ?? existing.summary,
      channels: request.channels ?? existing.channels,
      contentType: request.contentType ?? existing.contentType,
      version: existing.version + 1,
      updatedAt: now,
    };
    return { content };
  }

  async publishContent(request: PublishContentRequest): Promise<PublishContentResponse> {
    const items = mockContent();
    const existing = items.find(c => c.id === request.id);
    if (!existing) {
      throw new Error(`Content not found: ${request.id}`);
    }
    const now = new Date().toISOString();
    return {
      content: {
        ...existing,
        status: 'published',
        publishedAt: now,
        updatedAt: now,
      },
    };
  }

  async archiveContent(request: ArchiveContentRequest): Promise<ArchiveContentResponse> {
    const items = mockContent();
    const existing = items.find(c => c.id === request.id);
    if (!existing) {
      throw new Error(`Content not found: ${request.id}`);
    }
    const now = new Date().toISOString();
    return {
      content: {
        ...existing,
        status: 'archived',
        updatedAt: now,
      },
    };
  }

  async listChannels(_request: ListChannelsRequest): Promise<ListChannelsResponse> {
    return { channels: mockChannels() };
  }
}
