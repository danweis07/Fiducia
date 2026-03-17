import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gateway } from '@/lib/gateway';
import type { JointOwnerPermission, JointOwnerRelationship } from '@/types';

export const jointAccountKeys = {
  all: ['jointAccounts'] as const,
  owners: (accountId: string) => ['jointAccounts', 'owners', accountId] as const,
  invitations: ['jointAccounts', 'invitations'] as const,
  summary: ['jointAccounts', 'summary'] as const,
};

export function useJointOwners(accountId: string) {
  return useQuery({
    queryKey: jointAccountKeys.owners(accountId),
    queryFn: () => gateway.jointAccounts.listOwners(accountId),
    enabled: !!accountId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAddJointOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      accountId: string;
      email: string;
      firstName: string;
      lastName: string;
      relationship: JointOwnerRelationship;
      permissions: JointOwnerPermission;
    }) => gateway.jointAccounts.addOwner(params),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.owners(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.invitations });
    },
  });
}

export function useRemoveJointOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, ownerId }: { accountId: string; ownerId: string }) =>
      gateway.jointAccounts.removeOwner(accountId, ownerId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.owners(variables.accountId) });
    },
  });
}

export function useUpdateJointOwnerPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, ownerId, permissions }: { accountId: string; ownerId: string; permissions: JointOwnerPermission }) =>
      gateway.jointAccounts.updatePermissions(accountId, ownerId, permissions),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.owners(variables.accountId) });
    },
  });
}

export function usePendingInvitations() {
  return useQuery({
    queryKey: jointAccountKeys.invitations,
    queryFn: () => gateway.jointAccounts.listInvitations(),
    staleTime: 1000 * 60,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => gateway.jointAccounts.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.all });
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.invitations });
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.summary });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => gateway.jointAccounts.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.invitations });
      queryClient.invalidateQueries({ queryKey: jointAccountKeys.summary });
    },
  });
}

export function useJointAccountSummary() {
  return useQuery({
    queryKey: jointAccountKeys.summary,
    queryFn: () => gateway.jointAccounts.summary(),
    staleTime: 1000 * 60 * 2,
  });
}
