/**
 * CMS Banner Component
 *
 * Renders CMS banner/announcement content with dismissal support.
 * Supports A/B experiment variants when experimentId is provided.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Info, AlertTriangle, Megaphone, Gift } from 'lucide-react';
import type { CMSContent } from '@/types/admin';

interface CMSBannerProps {
  content: CMSContent;
  dismissible?: boolean;
  onDismiss?: (contentId: string) => void;
  onClick?: (contentId: string) => void;
}

const DISMISSED_KEY = 'cms_dismissed';

function getDismissedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function addDismissedId(id: string) {
  const dismissed = getDismissedIds();
  dismissed.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
}

const typeStyles: Record<string, { bg: string; border: string; icon: typeof Info }> = {
  announcement: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: Megaphone },
  banner: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: AlertTriangle },
  promotion: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: Gift },
};

export function CMSBanner({ content, dismissible = true, onDismiss, onClick }: CMSBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (getDismissedIds().has(content.id)) {
      setIsDismissed(true);
    }
  }, [content.id]);

  const handleDismiss = useCallback(() => {
    addDismissedId(content.id);
    setIsDismissed(true);
    onDismiss?.(content.id);
  }, [content.id, onDismiss]);

  if (isDismissed) return null;

  // Check expiration
  if (content.expiresAt && new Date(content.expiresAt) < new Date()) return null;

  const style = typeStyles[content.contentType] ?? typeStyles.announcement;
  const Icon = style.icon;
  const priority = (content.metadata as Record<string, unknown>)?.priority as string | undefined;

  return (
    <div
      className={`relative rounded-lg border p-4 ${style.bg} ${style.border} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      onClick={() => onClick?.(content.id)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(content.id); } } : undefined}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0 opacity-70" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {content.title}
            {priority === 'high' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-risk-critical-light px-2 py-0.5 text-xs font-medium text-risk-critical">
                Important
              </span>
            )}
          </h4>
          {content.body && (
            <p className="mt-1 text-sm opacity-80 line-clamp-2">
              {content.body.replace(/[#*_`]/g, '').substring(0, 200)}
            </p>
          )}
        </div>
        {dismissible && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 opacity-50" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Renders a list of CMS banners/announcements */
export function CMSBannerList({ items, channel: _channel }: { items: CMSContent[]; channel?: string }) {
  if (!items.length) return null;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CMSBanner key={item.id} content={item} />
      ))}
    </div>
  );
}
