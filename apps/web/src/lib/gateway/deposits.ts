/**
 * Gateway Domain — RDC, Statements, Checks, Direct Deposit
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  RDCDeposit,
  AccountStatement,
  StatementDetail,
  StatementConfig,
  CheckStyle,
  CheckOrder,
  CheckOrderStatus,
  SupportedEmployer,
  DirectDepositSwitch,
  AllocationTypeValue,
} from "@/types";

export function createDepositsDomain(callGateway: CallGatewayFn) {
  return {
    rdc: {
      async deposit(input: {
        accountId: string;
        amountCents: number;
        frontImageBase64: string;
        backImageBase64: string;
        checkNumber?: string;
      }) {
        return callGateway<{ deposit: RDCDeposit }>("rdc.deposit", input);
      },

      async status(id: string) {
        return callGateway<{ deposit: RDCDeposit }>("rdc.status", { id });
      },

      async history(params: { accountId?: string; limit?: number } = {}) {
        return callGateway<{ deposits: RDCDeposit[] }>("rdc.history", params);
      },
    },

    statements: {
      /** List available statements for an account */
      async list(params: { accountId: string; limit?: number; offset?: number }) {
        return callGateway<{ statements: AccountStatement[]; _pagination?: Pagination }>(
          "statements.list",
          params,
        );
      },

      /** Get statement detail (includes transactions for data/hybrid formats) */
      async get(id: string) {
        return callGateway<{ statement: StatementDetail }>("statements.get", { id });
      },

      /** Get tenant statement configuration */
      async config() {
        return callGateway<{ config: StatementConfig }>("statements.config", {});
      },

      /** Download statement as PDF (returns pre-signed URL) */
      async download(id: string) {
        return callGateway<{ downloadUrl: string; expiresAt: string }>("statements.download", {
          id,
        });
      },
    },

    checks: {
      async styles(params: { category?: string } = {}) {
        return callGateway<{ styles: CheckStyle[] }>("checks.styles", params);
      },
      async config() {
        return callGateway<{
          quantities: number[];
          shippingOptions: Array<{ method: string; label: string; costCents: number }>;
          pricingTiers: Array<{ quantity: number; boxCount: number }>;
        }>("checks.config", {});
      },
      async createOrder(params: {
        accountId: string;
        styleId: string;
        quantity: number;
        startingCheckNumber?: string;
        shippingMethod: "standard" | "expedited" | "overnight";
        deliveryAddressId?: string;
      }) {
        return callGateway<{ order: CheckOrder }>("checks.order.create", params);
      },
      async listOrders(
        params: { status?: CheckOrderStatus; limit?: number; offset?: number } = {},
      ) {
        return callGateway<{ orders: CheckOrder[]; _pagination?: Pagination }>(
          "checks.orders.list",
          params,
        );
      },
      async getOrder(orderId: string) {
        return callGateway<{ order: CheckOrder }>("checks.order.get", { orderId });
      },
      async cancelOrder(orderId: string) {
        return callGateway<{ success: boolean }>("checks.order.cancel", { orderId });
      },
    },

    directDeposit: {
      async employers(params: { query?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ employers: SupportedEmployer[]; _pagination?: Pagination }>(
          "directDeposit.employers",
          params,
        );
      },
      async initiate(params: {
        accountId: string;
        employerId: string;
        allocationType: AllocationTypeValue;
        allocationAmountCents?: number;
        allocationPercentage?: number;
      }) {
        return callGateway<{ switch: DirectDepositSwitch; widgetUrl: string; linkToken: string }>(
          "directDeposit.initiate",
          params,
        );
      },
      async status(switchId: string) {
        return callGateway<{ switch: DirectDepositSwitch }>("directDeposit.status", { switchId });
      },
      async list(params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ switches: DirectDepositSwitch[]; _pagination?: Pagination }>(
          "directDeposit.list",
          params,
        );
      },
      async cancel(switchId: string) {
        return callGateway<{ success: boolean }>("directDeposit.cancel", { switchId });
      },
      async confirm(switchId: string, providerConfirmationId: string) {
        return callGateway<{ switch: DirectDepositSwitch }>("directDeposit.confirm", {
          switchId,
          providerConfirmationId,
        });
      },
    },
  };
}
