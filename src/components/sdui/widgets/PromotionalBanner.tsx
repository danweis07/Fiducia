import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { ComponentManifest } from '@/types/sdui';

export default function PromotionalBanner({ manifest }: { manifest: ComponentManifest }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const {
    title,
    description,
    ctaLabel,
    ctaLink,
    bgColor = '#3b82f6',
    textColor = '#ffffff',
    dismissible = true,
  } = manifest.props as Record<string, unknown>;

  return (
    <div
      className="relative rounded-xl p-5 flex items-center justify-between"
      style={{ backgroundColor: bgColor as string, color: textColor as string }}
    >
      <div className="flex-1">
        {title && <h3 className="font-semibold text-lg mb-1">{title as string}</h3>}
        {description && <p className="text-sm opacity-90">{description as string}</p>}
      </div>
      <div className="flex items-center gap-3">
        {ctaLink && ctaLabel && (
          <Link
            to={ctaLink as string}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
          >
            {ctaLabel as string}
          </Link>
        )}
        {dismissible && (
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
