/**
 * Gateway Domain — Incidents, Rollbacks, Change Requests, System Health
 */

import type { CallGatewayFn } from "./client";
import type {
  Incident,
  IncidentSeverity,
  IncidentStatus,
  DeploymentRollback,
  RollbackType,
  ChangeRequest,
  ChangeRequestStatus,
  SystemHealthSnapshot,
  DeploymentRecord,
} from "@/types/incident";

export function createIncidentsDomain(callGateway: CallGatewayFn) {
  return {
    incidents: {
      async list(
        params: {
          status?: IncidentStatus;
          severity?: IncidentSeverity;
          limit?: number;
          offset?: number;
        } = {},
      ) {
        return callGateway<{ incidents: Incident[] }>("incidents.list", params);
      },
      async get(incidentId: string) {
        return callGateway<{ incident: Incident }>("incidents.get", { incidentId });
      },
      async create(params: {
        title: string;
        description?: string;
        severity: IncidentSeverity;
        detectionSource?: string;
        affectedServices?: string[];
      }) {
        return callGateway<{ incident: Incident }>("incidents.create", params);
      },
      async update(params: {
        incidentId: string;
        status?: IncidentStatus;
        assignedTo?: string;
        resolutionSummary?: string;
      }) {
        return callGateway<{ incident: Incident }>("incidents.update", params);
      },
      async addTimeline(params: {
        incidentId: string;
        action: string;
        actor: string;
        detail: string;
      }) {
        return callGateway<{ incident: Incident }>("incidents.addTimeline", params);
      },
      async notifyStakeholders(params: {
        incidentId: string;
        channels: string[];
        stakeholders: string[];
      }) {
        return callGateway<{ success: boolean; notifiedAt: string }>(
          "incidents.notifyStakeholders",
          params,
        );
      },
    },

    rollbacks: {
      async list(params: { incidentId?: string; limit?: number } = {}) {
        return callGateway<{ rollbacks: DeploymentRollback[] }>("rollbacks.list", params);
      },
      async initiate(params: {
        incidentId: string;
        fromVersion: string;
        toVersion: string;
        rollbackType: RollbackType;
      }) {
        return callGateway<{ rollback: DeploymentRollback }>("rollbacks.initiate", params);
      },
      async complete(params: { rollbackId: string; success: boolean }) {
        return callGateway<{ rollback: DeploymentRollback }>("rollbacks.complete", params);
      },
    },

    changeRequests: {
      async list(params: { status?: ChangeRequestStatus; limit?: number; offset?: number } = {}) {
        return callGateway<{ changeRequests: ChangeRequest[] }>("changeRequests.list", params);
      },
      async get(changeRequestId: string) {
        return callGateway<{ changeRequest: ChangeRequest }>("changeRequests.get", {
          changeRequestId,
        });
      },
      async create(params: {
        title: string;
        description?: string;
        changeType: string;
        gitBranch?: string;
        prUrl?: string;
      }) {
        return callGateway<{ changeRequest: ChangeRequest }>("changeRequests.create", params);
      },
      async updateStatus(params: { changeRequestId: string; status: ChangeRequestStatus }) {
        return callGateway<{ changeRequest: ChangeRequest }>("changeRequests.updateStatus", params);
      },
    },

    systemHealth: {
      async snapshot() {
        return callGateway<{ health: SystemHealthSnapshot }>("system.healthSnapshot", {});
      },
      async deployments(params: { limit?: number } = {}) {
        return callGateway<{ deployments: DeploymentRecord[] }>("system.deployments", params);
      },
    },
  };
}
