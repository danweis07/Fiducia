import DOMPurify from 'dompurify';
import type { ComponentManifest } from '@/types/sdui';

export default function CustomHTML({ manifest }: { manifest: ComponentManifest }) {
  const html = (manifest.props.html as string) ?? '';

  // Sanitize to prevent XSS
  const clean = typeof DOMPurify !== 'undefined'
    ? DOMPurify.sanitize(html)
    : html;

  return (
    <div
      className="prose prose-sm prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
