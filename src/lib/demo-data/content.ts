/**
 * Demo data for cms, experiments, exports, config, and passwordPolicy.
 */

import {
  ActionHandler,
  TENANT_ID,
  DEMO_USER,
  withPagination,
  isoDate,
  futureDate,
} from './types';

// =============================================================================
// HANDLERS
// =============================================================================

export const contentHandlers: Record<string, ActionHandler> = {
  // Config
  'config.capabilities': () => ({
    capabilities: {
      rdc: { enabled: true, provider: 'mitek', maxAmountCents: 500000 },
      billPay: { enabled: true, provider: 'mock' },
      p2p: { enabled: false, provider: null },
      cardControls: { enabled: true },
      externalTransfers: { enabled: true },
      wires: { enabled: false, cutoffTime: null },
      mobileDeposit: { enabled: true },
    },
  }),
  'config.theme': () => ({
    theme: {
      tenantName: 'Demo Credit Union',
      logoUrl: null,
      primaryColor: '#1e40af',
      accentColor: '#3b82f6',
      faviconUrl: null,
    },
  }),

  // Password Policy
  'passwordPolicy.get': () => ({
    policy: {
      id: 'policy-demo-001',
      firmId: TENANT_ID,
      username: { minLength: 6, maxLength: 32, allowEmail: true, pattern: '^[a-zA-Z0-9@._-]+$', patternDescription: 'Letters, numbers, @, ., _, -' },
      password: { minLength: 8, maxLength: 128, requireUppercase: true, requireLowercase: true, requireDigit: true, requireSpecialChar: true, specialChars: '!@#$%^&*', disallowUsername: true, historyCount: 3, expiryDays: 90 },
      lockout: { maxFailedAttempts: 5, lockoutDurationMinutes: 15 },
      updatedAt: isoDate(30),
    },
  }),
  'passwordPolicy.update': () => ({
    policy: {
      id: 'policy-demo-001',
      firmId: TENANT_ID,
      username: { minLength: 6, maxLength: 32, allowEmail: true, pattern: '^[a-zA-Z0-9@._-]+$', patternDescription: 'Letters, numbers, @, ., _, -' },
      password: { minLength: 8, maxLength: 128, requireUppercase: true, requireLowercase: true, requireDigit: true, requireSpecialChar: true, specialChars: '!@#$%^&*', disallowUsername: true, historyCount: 3, expiryDays: 90 },
      lockout: { maxFailedAttempts: 5, lockoutDurationMinutes: 15 },
      updatedAt: new Date().toISOString(),
    },
  }),

  // CMS — Channels
  'cms.channels.list': () => ({
    channels: [
      { id: 'ch-001', slug: 'web_portal', label: 'Web Portal', description: 'Main customer web application', isActive: true, config: {}, createdAt: isoDate(180) },
      { id: 'ch-002', slug: 'mobile_app', label: 'Mobile App', description: 'iOS and Android mobile application', isActive: true, config: {}, createdAt: isoDate(180) },
      { id: 'ch-003', slug: 'email', label: 'Email', description: 'Email campaigns and transactional emails', isActive: true, config: { senderEmail: 'noreply@example-cu.org' }, createdAt: isoDate(180) },
      { id: 'ch-004', slug: 'push', label: 'Push Notifications', description: 'Mobile push notifications', isActive: true, config: { topic: 'org.example.banking' }, createdAt: isoDate(180) },
      { id: 'ch-005', slug: 'sms', label: 'SMS', description: 'Text message communications', isActive: false, config: {}, createdAt: isoDate(180) },
      { id: 'ch-006', slug: 'atm_screen', label: 'ATM Screen', description: 'ATM screen banners and messages', isActive: true, config: {}, createdAt: isoDate(180) },
    ],
  }),
  'cms.channels.update': (p) => ({
    channel: { id: p.id, slug: p.slug || 'web_portal', label: p.label || 'Web Portal', description: p.description || null, isActive: p.isActive ?? true, config: p.config || {}, createdAt: isoDate(180), updatedAt: new Date().toISOString() },
  }),

  // CMS — Content
  'cms.content.list': (p) => {
    const allContent = [
      { id: 'cms-001', slug: 'welcome-announcement', title: 'Welcome to Digital Banking', body: '## Welcome!\n\nWe are excited to launch our new digital banking platform. Enjoy seamless account management, transfers, bill pay, and more — right from your browser or mobile device.\n\n**Key Features:**\n- Real-time account balances\n- Instant internal transfers\n- Mobile check deposit\n- Card controls\n\nNeed help? Visit our [Help Center](/help) or call (217) 555-0100.', contentType: 'announcement' as const, status: 'published' as const, channels: ['web_portal', 'mobile_app'], metadata: { priority: 'high', heroImage: null, ctaUrl: '/accounts', ctaLabel: 'View Accounts' }, locale: 'en', authorId: 'u-001', publishedAt: isoDate(7), scheduledAt: null, expiresAt: null, version: 2, createdAt: isoDate(14), updatedAt: isoDate(7) },
      { id: 'cms-002', slug: 'cd-rate-promotion', title: '5.00% APY on 12-Month CDs', body: 'Lock in a great rate! Open a 12-Month Certificate of Deposit today and earn **5.00% APY**. Minimum deposit of $1,000.\n\n*Limited time offer. Rates subject to change. Early withdrawal penalties apply.*', contentType: 'promotion' as const, status: 'published' as const, channels: ['web_portal', 'mobile_app', 'email', 'atm_screen'], metadata: { priority: 'medium', badgeColor: '#10B981', ctaUrl: '/accounts', ctaLabel: 'Open CD' }, locale: 'en', authorId: 'u-001', publishedAt: isoDate(3), scheduledAt: null, expiresAt: futureDate(30), version: 1, createdAt: isoDate(5), updatedAt: isoDate(3) },
      { id: 'cms-003', slug: 'holiday-hours', title: 'Holiday Branch Hours', body: 'Please note our modified hours for the upcoming holiday season:\n\n- **Dec 24**: 9AM - 12PM\n- **Dec 25**: Closed\n- **Dec 31**: 9AM - 3PM\n- **Jan 1**: Closed\n\nOnline and mobile banking remain available 24/7.', contentType: 'announcement' as const, status: 'draft' as const, channels: ['web_portal', 'email', 'sms'], metadata: { priority: 'low' }, locale: 'en', authorId: 'u-001', publishedAt: null, scheduledAt: futureDate(14), expiresAt: null, version: 1, createdAt: isoDate(2), updatedAt: isoDate(2) },
      { id: 'cms-004', slug: 'privacy-policy', title: 'Privacy Policy', body: 'This privacy policy describes how Demo Credit Union collects, uses, and protects your personal information...', contentType: 'legal' as const, status: 'published' as const, channels: ['web_portal', 'mobile_app'], metadata: { lastReviewedAt: isoDate(30) }, locale: 'en', authorId: 'u-001', publishedAt: isoDate(60), scheduledAt: null, expiresAt: null, version: 3, createdAt: isoDate(365), updatedAt: isoDate(30) },
      { id: 'cms-005', slug: 'mobile-deposit-faq', title: 'Mobile Deposit FAQ', body: '**Q: What is the daily deposit limit?**\nA: The daily limit for mobile deposits is $5,000.\n\n**Q: When will my deposit be available?**\nA: Most deposits are available within 1-2 business days.\n\n**Q: What types of checks can I deposit?**\nA: Personal, business, and government checks payable to you.', contentType: 'faq' as const, status: 'published' as const, channels: ['web_portal', 'mobile_app'], metadata: { category: 'deposits' }, locale: 'en', authorId: 'u-001', publishedAt: isoDate(30), scheduledAt: null, expiresAt: null, version: 1, createdAt: isoDate(45), updatedAt: isoDate(30) },
      { id: 'cms-006', slug: 'maintenance-banner', title: 'Scheduled Maintenance', body: 'Online banking will be unavailable Saturday 2AM-6AM for scheduled maintenance.', contentType: 'banner' as const, status: 'scheduled' as const, channels: ['web_portal', 'mobile_app'], metadata: { variant: 'warning' }, locale: 'en', authorId: null, publishedAt: null, scheduledAt: futureDate(3), expiresAt: futureDate(4), version: 1, createdAt: isoDate(1), updatedAt: isoDate(1) },
    ];
    let filtered = allContent;
    if (p.status) filtered = filtered.filter(c => c.status === p.status);
    if (p.contentType) filtered = filtered.filter(c => c.contentType === p.contentType);
    if (p.channel) filtered = filtered.filter(c => c.channels.includes(p.channel as string));
    return withPagination({ content: filtered }, filtered.length);
  },
  'cms.content.get': (p) => ({
    content: { id: p.id || 'cms-001', slug: 'welcome-announcement', title: 'Welcome to Digital Banking', body: '## Welcome!\n\nContent here...', contentType: 'announcement', status: 'published', channels: ['web_portal', 'mobile_app'], metadata: {}, locale: 'en', authorId: 'u-001', publishedAt: isoDate(7), scheduledAt: null, expiresAt: null, version: 2, createdAt: isoDate(14), updatedAt: isoDate(7) },
  }),
  'cms.content.create': (p) => ({
    content: { id: `cms-demo-${Date.now()}`, slug: p.slug, title: p.title, body: p.body || '', contentType: p.contentType || 'article', status: 'draft', channels: p.channels || [], metadata: p.metadata || {}, locale: p.locale || 'en', authorId: DEMO_USER.id, publishedAt: null, scheduledAt: p.scheduledAt || null, expiresAt: p.expiresAt || null, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  }),
  'cms.content.update': (p) => ({
    content: { id: p.id, slug: p.slug || 'updated', title: p.title || 'Updated', body: p.body || '', contentType: p.contentType || 'article', status: p.status || 'draft', channels: p.channels || [], metadata: p.metadata || {}, locale: p.locale || 'en', authorId: DEMO_USER.id, publishedAt: p.status === 'published' ? new Date().toISOString() : null, scheduledAt: p.scheduledAt || null, expiresAt: p.expiresAt || null, version: 2, createdAt: isoDate(7), updatedAt: new Date().toISOString() },
  }),
  'cms.content.delete': () => ({ success: true }),
  'cms.content.publish': (p) => ({
    content: { id: p.id, status: 'published', publishedAt: new Date().toISOString() },
  }),
  'cms.content.archive': (p) => ({
    content: { id: p.id, status: 'archived', updatedAt: new Date().toISOString() },
  }),
  'cms.content.versions': () => ({
    versions: [
      { id: 'ver-002', contentId: 'cms-001', version: 2, title: 'Welcome to Digital Banking', body: '## Welcome!...', metadata: {}, status: 'published', changedBy: 'u-001', changeNote: 'Updated feature list', createdAt: isoDate(7) },
      { id: 'ver-001', contentId: 'cms-001', version: 1, title: 'Welcome to Online Banking', body: '## Hello!...', metadata: {}, status: 'draft', changedBy: 'u-001', changeNote: 'Initial draft', createdAt: isoDate(14) },
    ],
  }),

  // CMS — API Tokens
  'cms.tokens.list': () => ({
    tokens: [
      { id: 'tok-001', name: 'WordPress Integration', tokenPrefix: 'cms_wp01', scopes: ['read'], allowedChannels: ['web_portal'], rateLimit: 500, lastUsedAt: isoDate(0), expiresAt: futureDate(90), isRevoked: false, createdAt: isoDate(60) },
      { id: 'tok-002', name: 'Marketing Platform', tokenPrefix: 'cms_mk02', scopes: ['read', 'write'], allowedChannels: null, rateLimit: 1000, lastUsedAt: isoDate(2), expiresAt: null, isRevoked: false, createdAt: isoDate(30) },
      { id: 'tok-003', name: 'Old Contentful Token', tokenPrefix: 'cms_cf03', scopes: ['read'], allowedChannels: ['web_portal'], rateLimit: 500, lastUsedAt: isoDate(45), expiresAt: isoDate(10), isRevoked: true, createdAt: isoDate(90) },
    ],
  }),
  'cms.tokens.create': (p) => ({
    token: { id: `tok-demo-${Date.now()}`, name: p.name, tokenPrefix: `cms_${String(Date.now()).slice(-4)}`, scopes: p.scopes || ['read'], allowedChannels: p.allowedChannels || null, rateLimit: p.rateLimit || 1000, lastUsedAt: null, expiresAt: p.expiresAt || null, isRevoked: false, createdAt: new Date().toISOString(), rawToken: `cms_${String(Date.now()).slice(-4)}_sk_live_${Array.from({length:32}, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('')}` },
  }),
  'cms.tokens.revoke': () => ({ success: true }),

  // Experiments
  'experiments.list': (p) => {
    const allExperiments = [
      { id: 'exp-001', firmId: TENANT_ID, name: 'CD Rate Banner A/B Test', description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner', status: 'running', metric: 'click_rate', trafficPercent: 100, startedAt: isoDate(14), endedAt: null, createdAt: isoDate(21), updatedAt: isoDate(14) },
      { id: 'exp-002', firmId: TENANT_ID, name: 'Onboarding Flow Test', description: 'Comparing simplified vs detailed onboarding flow', status: 'draft', metric: 'conversion_rate', trafficPercent: 50, startedAt: null, endedAt: null, createdAt: isoDate(3), updatedAt: isoDate(3) },
      { id: 'exp-003', firmId: TENANT_ID, name: 'Transfer CTA Color', description: 'Green vs blue transfer button', status: 'completed', metric: 'click_rate', trafficPercent: 100, startedAt: isoDate(60), endedAt: isoDate(30), createdAt: isoDate(65), updatedAt: isoDate(30) },
    ];
    let filtered = allExperiments;
    if (p.status) filtered = filtered.filter(e => e.status === p.status);
    return filtered;
  },
  'experiments.get': (p) => ({
    id: p.id || 'exp-001',
    firmId: TENANT_ID,
    name: 'CD Rate Banner A/B Test',
    description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner',
    status: 'running',
    metric: 'click_rate',
    trafficPercent: 100,
    startedAt: isoDate(14),
    endedAt: null,
    createdAt: isoDate(21),
    updatedAt: isoDate(14),
    variants: [
      { id: 'var-001', experimentId: p.id || 'exp-001', name: 'Control', contentId: 'cms-002', weight: 50, isControl: true, createdAt: isoDate(21) },
      { id: 'var-002', experimentId: p.id || 'exp-001', name: 'Variant A — Personalized Rate', contentId: 'cms-002', weight: 50, isControl: false, createdAt: isoDate(21) },
    ],
  }),
  'experiments.create': (p) => ({
    id: `exp-demo-${Date.now()}`,
    firmId: TENANT_ID,
    name: p.name,
    description: p.description || null,
    status: 'draft',
    metric: p.metric || 'click_rate',
    trafficPercent: p.trafficPercent || 100,
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    variants: ((p.variants as Array<Record<string, unknown>>) || []).map((v, i) => ({
      id: `var-demo-${Date.now()}-${i}`,
      experimentId: `exp-demo-${Date.now()}`,
      name: v.name,
      contentId: v.contentId || null,
      weight: v.weight || 50,
      isControl: v.isControl || false,
      createdAt: new Date().toISOString(),
    })),
  }),
  'experiments.update': (p) => ({
    id: p.id,
    firmId: TENANT_ID,
    name: p.name || 'CD Rate Banner A/B Test',
    description: p.description || null,
    status: 'draft',
    metric: 'click_rate',
    trafficPercent: p.trafficPercent || 100,
    startedAt: null,
    endedAt: null,
    createdAt: isoDate(21),
    updatedAt: new Date().toISOString(),
  }),
  'experiments.start': (p) => ({
    id: p.id,
    firmId: TENANT_ID,
    name: 'CD Rate Banner A/B Test',
    description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner',
    status: 'running',
    metric: 'click_rate',
    trafficPercent: 100,
    startedAt: new Date().toISOString(),
    endedAt: null,
    createdAt: isoDate(21),
    updatedAt: new Date().toISOString(),
  }),
  'experiments.pause': (p) => ({
    id: p.id,
    firmId: TENANT_ID,
    name: 'CD Rate Banner A/B Test',
    description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner',
    status: 'paused',
    metric: 'click_rate',
    trafficPercent: 100,
    startedAt: isoDate(14),
    endedAt: null,
    createdAt: isoDate(21),
    updatedAt: new Date().toISOString(),
  }),
  'experiments.resume': (p) => ({
    id: p.id,
    firmId: TENANT_ID,
    name: 'CD Rate Banner A/B Test',
    description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner',
    status: 'running',
    metric: 'click_rate',
    trafficPercent: 100,
    startedAt: isoDate(14),
    endedAt: null,
    createdAt: isoDate(21),
    updatedAt: new Date().toISOString(),
  }),
  'experiments.complete': (p) => ({
    id: p.id,
    firmId: TENANT_ID,
    name: 'CD Rate Banner A/B Test',
    description: 'Testing whether a personalized CD rate banner increases conversions vs the generic banner',
    status: 'completed',
    metric: 'click_rate',
    trafficPercent: 100,
    startedAt: isoDate(14),
    endedAt: new Date().toISOString(),
    createdAt: isoDate(21),
    updatedAt: new Date().toISOString(),
  }),
  'experiments.assign': (p) => ({
    id: `assign-demo-${Date.now()}`,
    experimentId: p.experimentId || 'exp-001',
    userId: DEMO_USER.id,
    variantId: 'var-001',
    assignedAt: new Date().toISOString(),
  }),
  'experiments.track': () => ({ success: true }),
  'experiments.results': (p) => ({
    experimentId: p.experimentId || 'exp-001',
    experimentName: 'CD Rate Banner A/B Test',
    status: 'running',
    variants: [
      { variantId: 'var-001', variantName: 'Control', isControl: true, impressions: 1248, clicks: 87, dismissals: 312, conversions: 23, clickRate: 0.0697, conversionRate: 0.0184 },
      { variantId: 'var-002', variantName: 'Variant A — Personalized Rate', isControl: false, impressions: 1256, clicks: 142, dismissals: 245, conversions: 41, clickRate: 0.1131, conversionRate: 0.0326 },
    ],
    totalImpressions: 2504,
    totalConversions: 64,
  }),
};
