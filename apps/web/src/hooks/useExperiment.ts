/**
 * Experiment Hook
 *
 * Fetches a user's experiment assignment and provides tracking helpers.
 * Automatically tracks impressions on mount.
 */

import { useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import type { ExperimentAssignment, ExperimentEventType } from "@/types/experiments";

const experimentKeys = {
  all: ["experiments"] as const,
  assignment: (experimentId: string) => ["experiments", "assignment", experimentId] as const,
};

export function useExperiment(experimentId: string | undefined) {
  const { data: assignment, isLoading } = useQuery({
    queryKey: experimentKeys.assignment(experimentId ?? ""),
    queryFn: () => gateway.experiments.assign(experimentId!),
    enabled: !!experimentId,
    staleTime: Infinity, // Sticky assignment — never re-fetch
  });

  const trackMutation = useMutation({
    mutationFn: (params: { eventType: ExperimentEventType; metadata?: Record<string, unknown> }) =>
      gateway.experiments.track({
        experimentId: experimentId!,
        variantId: assignment!.variantId,
        eventType: params.eventType,
        metadata: params.metadata,
      }),
  });

  // Auto-track impression on mount
  useEffect(() => {
    if (assignment && experimentId) {
      trackMutation.mutate({ eventType: "impression" });
    }
    // Only track once on assignment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignment?.id]);

  const trackClick = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (assignment) trackMutation.mutate({ eventType: "click", metadata });
    },
    [assignment, trackMutation],
  );

  const trackDismiss = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (assignment) trackMutation.mutate({ eventType: "dismiss", metadata });
    },
    [assignment, trackMutation],
  );

  const trackConversion = useCallback(
    (metadata?: Record<string, unknown>) => {
      if (assignment) trackMutation.mutate({ eventType: "conversion", metadata });
    },
    [assignment, trackMutation],
  );

  return {
    assignment: assignment as ExperimentAssignment | undefined,
    variantId: assignment?.variantId,
    isLoading,
    trackClick,
    trackDismiss,
    trackConversion,
  };
}
