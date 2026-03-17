import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ComponentManifest } from '@/types/sdui';

export default function FeatureSpotlight({ manifest }: { manifest: ComponentManifest }) {
  const { title, description, ctaLabel, ctaLink } = manifest.props as Record<string, unknown>;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-100">
      <CardContent className="p-5 flex items-start gap-4">
        <div className="p-2 bg-blue-100 rounded-lg shrink-0">
          <Sparkles className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{(title as string) ?? 'New Feature'}</h3>
          {description && <p className="text-sm text-slate-600 mb-3">{description as string}</p>}
          {ctaLink && (
            <Button asChild variant="outline" size="sm">
              <Link to={ctaLink as string}>{(ctaLabel as string) ?? 'Try it out'}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
