import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';

export interface ThreadListParams {
  limit?: number;
  offset?: number;
  status?: string;
}

export const messagingKeys = {
  all: ['messaging'] as const,
  threads: (params: ThreadListParams) => ['messaging', 'threads', params] as const,
  thread: (id: string) => ['messaging', 'thread', id] as const,
  departments: () => ['messaging', 'departments'] as const,
  unreadCount: () => ['messaging', 'unreadCount'] as const,
};

export function useMessageThreads(params: ThreadListParams = {}) {
  return useQuery({
    queryKey: messagingKeys.threads(params),
    queryFn: () => gateway.messaging.listThreads(params),
    staleTime: 1000 * 60 * 1,
  });
}

export function useThread(threadId: string | null) {
  return useQuery({
    queryKey: messagingKeys.thread(threadId ?? ''),
    queryFn: () => gateway.messaging.getThread(threadId!),
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { subject: string; body: string; departmentId?: string; priority?: 'normal' | 'urgent' }) =>
      gateway.messaging.createThread(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

export function useReplyToThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { threadId: string; body: string; attachmentIds?: string[] }) =>
      gateway.messaging.reply(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.thread(variables.threadId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => gateway.messaging.markRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (threadId: string) => gateway.messaging.archive(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.all });
    },
  });
}

export function useMessageDepartments() {
  return useQuery({
    queryKey: messagingKeys.departments(),
    queryFn: () => gateway.messaging.listDepartments(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: messagingKeys.unreadCount(),
    queryFn: () => gateway.messaging.unreadCount(),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}
