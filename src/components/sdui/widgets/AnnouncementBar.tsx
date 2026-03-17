import { Info, X } from 'lucide-react';
import { useState } from 'react';
import type { ComponentManifest } from '@/types/sdui';

export default function AnnouncementBar({ manifest }: { manifest: ComponentManifest }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { message, variant = 'info', dismissible = true } = manifest.props as Record<string, unknown>;

  const variants: Record<string, string> = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-red-50 text-red-800 border-red-200',
  };

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${variants[variant as string] ?? variants.info}`}>
      <Info className="h-4 w-4 shrink-0" />
      <p className="text-sm flex-1">{message as string}</p>
      {dismissible && (
        <button onClick={() => setDismissed(true)} className="p-0.5 hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
