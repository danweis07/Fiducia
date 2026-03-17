import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => gateway.notificationPreferences.get(),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      channels?: Record<string, boolean>;
      categories?: Record<string, { enabled: boolean; channels: string[] }>;
    }) => gateway.notificationPreferences.update(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

export function useTestNotification() {
  return useMutation({
    mutationFn: (channel: string) => gateway.notificationPreferences.test(channel),
  });
}
