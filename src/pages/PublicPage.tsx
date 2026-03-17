import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import { useExperiment } from '@/hooks/useExperiment';
import { PublicShell } from '@/components/public/PublicShell';
import { SEOHead } from '@/components/public/SEOHead';
import { Spinner } from '@/components/common/Spinner';
import { useTranslation } from 'react-i18next';
import type { CMSContent } from '@/types/admin';

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation('public');

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-page', slug],
    queryFn: () => gateway.cms.getPublicContent(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10, // 10 min cache for public pages
  });

  const content = (data as { content?: CMSContent })?.content;
  const experimentId = content?.metadata?.experimentId as string | undefined;

  // A/B testing: if page has an experiment, get variant assignment
  const { variantId, trackClick } = useExperiment(experimentId);

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner />
        </div>
      </PublicShell>
    );
  }

  if (error || !content) {
    return (
      <PublicShell>
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('notFound.title')}</h1>
          <p className="text-lg text-slate-500">{t('notFound.description')}</p>
        </div>
      </PublicShell>
    );
  }

  // If experiment active and variant specifies alternate content, use it
  const displayBody = variantId
    ? (content.metadata?.variants as Record<string, string>)?.[variantId] ?? content.body
    : content.body;

  return (
    <PublicShell>
      <SEOHead
        title={content.title}
        description={(content.metadata?.description as string) ?? content.body?.substring(0, 160)}
        ogType="article"
      />

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
            {content.title}
          </h1>
          {content.publishedAt && (
            <time className="text-sm text-slate-500" dateTime={content.publishedAt}>
              {new Date(content.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </header>

        <div
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-a:text-blue-600 hover:prose-a:text-blue-700"
          onClick={() => trackClick?.()}
        >
          {/* Render markdown-style content as HTML */}
          {renderContent(displayBody)}
        </div>
      </article>
    </PublicShell>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: string): string {
  // Only allow http, https, and mailto protocols
  if (/^(https?:|mailto:|\/)/i.test(url.trim())) return url.trim();
  return '#';
}

function renderContent(body: string) {
  // Escape all HTML entities first to prevent XSS, then apply markdown formatting
  const html = escapeHtml(body)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_match, text, url) =>
      `<a href="${sanitizeUrl(url)}">${text}</a>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return <div dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}
