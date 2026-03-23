import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ComponentManifest } from "@/types/sdui";

export default function ProductOfferCard({ manifest }: { manifest: ComponentManifest }) {
  const { title, description, ctaLabel, ctaLink, imageUrl, badge } = manifest.props as Record<
    string,
    unknown
  >;

  return (
    <Card className="overflow-hidden">
      {imageUrl && <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />}
      <CardContent className="p-5">
        {badge && (
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full mb-2">
            {badge as string}
          </span>
        )}
        <h3 className="font-semibold text-lg mb-1">{(title as string) ?? "Special Offer"}</h3>
        {description && <p className="text-sm text-slate-600 mb-4">{description as string}</p>}
        {ctaLink && (
          <Button asChild size="sm">
            <Link to={ctaLink as string}>{(ctaLabel as string) ?? "Learn More"}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
