import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: () => gateway.devices.list(),
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: ["devices", deviceId],
    queryFn: () => gateway.devices.get(deviceId),
    enabled: !!deviceId,
  });
}

export function useRenameDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, name }: { deviceId: string; name: string }) =>
      gateway.devices.rename(deviceId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useRemoveDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => gateway.devices.remove(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useDeviceActivity(deviceId: string) {
  return useQuery({
    queryKey: ["devices", deviceId, "activity"],
    queryFn: () => gateway.devices.activity(deviceId),
    enabled: !!deviceId,
  });
}

export function useTrustDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => gateway.devices.trust(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUntrustDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => gateway.devices.untrust(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
