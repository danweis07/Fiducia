/**
 * CMS Content Hook
 *
 * Fetches published CMS content for the current channel (web_portal).
 * Used by Dashboard and other pages to render banners, announcements, etc.
 */

import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

const cmsKeys = {
  all: ["cms"] as const,
  content: (params: Record<string, unknown>) => ["cms", "content", params] as const,
  channels: () => ["cms", "channels"] as const,
};

export function useCMSContent(
  params: {
    channel?: string;
    contentType?: string;
    limit?: number;
  } = {},
) {
  const { channel = "web_portal", contentType, limit = 10 } = params;

  return useQuery({
    queryKey: cmsKeys.content({ channel, contentType, status: "published", limit }),
    queryFn: () =>
      gateway.cms.listContent({
        channel,
        contentType,
        status: "published",
        limit,
      }),
    staleTime: 1000 * 60 * 5, // 5 min cache
    select: (data) => data.content ?? [],
  });
}

export function useCMSBanners(channel = "web_portal") {
  return useCMSContent({ channel, contentType: "banner", limit: 5 });
}

export function useCMSAnnouncements(channel = "web_portal") {
  return useCMSContent({ channel, contentType: "announcement", limit: 5 });
}
