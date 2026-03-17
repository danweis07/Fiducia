import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: () => gateway.sessions.list(),
  });
}

export function useSessionActivity() {
  return useQuery({
    queryKey: ['sessions', 'activity'],
    queryFn: () => gateway.sessions.activity(),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => gateway.sessions.revoke(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useRevokeAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentSessionId?: string) => gateway.sessions.revokeAll(currentSessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
