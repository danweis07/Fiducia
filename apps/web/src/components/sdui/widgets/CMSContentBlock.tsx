import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { gateway } from "@/lib/gateway";
import type { ComponentManifest } from "@/types/sdui";
import type { CMSContent } from "@/types/admin";

export default function CMSContentBlock({ manifest }: { manifest: ComponentManifest }) {
  const slug = manifest.props.slug as string | undefined;

  const { data } = useQuery({
    queryKey: ["cms", "public", slug],
    queryFn: () => gateway.cms.getPublicContent(slug!),
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });

  const content = (data as { content?: CMSContent })?.content;
  if (!content) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
        <div
          className="prose prose-sm prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      </CardContent>
    </Card>
  );
}
