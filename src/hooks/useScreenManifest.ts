/**
 * SDUI Hook — Screen Manifest
 *
 * Fetches the resolved screen manifest for the current user's persona.
 * Caches aggressively since persona recalculation is expensive.
 */

import { useQuery } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { ScreenKey } from '@/types/sdui';

const sduiKeys = {
  all: ['sdui'] as const,
  screen: (key: ScreenKey) => ['sdui', 'screen', key] as const,
  persona: () => ['sdui', 'persona'] as const,
};

export function useScreenManifest(screenKey: ScreenKey) {
  return useQuery({
    queryKey: sduiKeys.screen(screenKey),
    queryFn: () => gateway.sdui.resolve(screenKey),
    staleTime: 1000 * 60 * 5, // 5 min — persona changes are infrequent
    gcTime: 1000 * 60 * 30, // keep in cache 30 min
  });
}

export function useCurrentPersona() {
  return useQuery({
    queryKey: sduiKeys.persona(),
    queryFn: () => gateway.sdui.persona(),
    staleTime: 1000 * 60 * 10, // 10 min
  });
}

export { sduiKeys };
