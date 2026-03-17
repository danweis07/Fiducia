import type { ComponentManifest } from '@/types/sdui';

export default function TwoColumnLayout({ manifest }: { manifest: ComponentManifest }) {
  // Two-column is a layout hint; actual child rendering is handled by
  // the parent SDUIRenderer. This wrapper just sets the grid.
  const { leftLabel, rightLabel } = manifest.props as Record<string, unknown>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {leftLabel && (
        <div className="text-sm font-medium text-slate-500">{leftLabel as string}</div>
      )}
      {rightLabel && (
        <div className="text-sm font-medium text-slate-500">{rightLabel as string}</div>
      )}
    </div>
  );
}
