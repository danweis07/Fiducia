/**
 * Gateway Domain — External Accounts, Locations, Config, Password Policy,
 * Account Products, CD, Charges, Standing Instructions, Account Opening
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  BankingCapabilities,
  TenantTheme,
  PasswordPolicy,
  AccountProduct,
  CDMaturity,
  ChargeDefinition,
  Charge,
  StandingInstruction,
} from "@/types";

export function createIntegrationsDomain(callGateway: CallGatewayFn) {
  return {
    externalAccounts: {
      async linkToken(params: { clientName?: string; products?: string[] } = {}) {
        return callGateway<{ linkToken: string; expiration: string }>(
          "external-accounts.link-token",
          params as unknown as Record<string, unknown>,
        );
      },

      async exchange(publicToken: string) {
        return callGateway<{ itemId: string; linkedAt: string }>("external-accounts.exchange", {
          publicToken,
        });
      },

      async list() {
        return callGateway<{
          accounts: Array<{
            accountId: string;
            itemId: string;
            institutionName: string;
            name: string;
            officialName: string | null;
            type: string;
            subtype: string | null;
            mask: string;
            balanceCents: number;
            availableBalanceCents: number | null;
            currencyCode: string;
            linkedAt: string;
          }>;
        }>("external-accounts.list", {});
      },

      async balances(accountId?: string) {
        return callGateway<{
          balances: Array<{
            accountId: string;
            currentCents: number;
            availableCents: number | null;
            limitCents: number | null;
            currencyCode: string;
            lastUpdatedAt: string;
          }>;
        }>("external-accounts.balances", accountId ? { accountId } : {});
      },

      async transactions(params: { accountId?: string; cursor?: string; count?: number } = {}) {
        return callGateway<{
          transactions: Array<{
            transactionId: string;
            accountId: string;
            amountCents: number;
            description: string;
            merchantName: string | null;
            category: string[];
            date: string;
            pending: boolean;
            currencyCode: string;
          }>;
          nextCursor: string;
          hasMore: boolean;
        }>("external-accounts.transactions", params as unknown as Record<string, unknown>);
      },
    },

    locations: {
      async search(params: {
        latitude: number;
        longitude: number;
        radiusMiles?: number;
        type?: string;
      }) {
        return callGateway<{ locations: import("@/types").BranchLocation[] }>(
          "locations.search",
          params as unknown as Record<string, unknown>,
        );
      },
    },

    config: {
      async capabilities() {
        return callGateway<{ capabilities: BankingCapabilities }>("config.capabilities", {});
      },

      async theme() {
        return callGateway<{ theme: TenantTheme }>("config.theme", {});
      },
    },

    passwordPolicy: {
      async get() {
        return callGateway<{ policy: PasswordPolicy }>("passwordPolicy.get", {});
      },

      async update(updates: {
        usernameMinLength?: number;
        usernameMaxLength?: number;
        usernameAllowEmail?: boolean;
        usernamePattern?: string;
        usernamePatternDescription?: string;
        passwordMinLength?: number;
        passwordMaxLength?: number;
        requireUppercase?: boolean;
        requireLowercase?: boolean;
        requireDigit?: boolean;
        requireSpecialChar?: boolean;
        specialChars?: string;
        disallowUsername?: boolean;
        passwordHistoryCount?: number;
        passwordExpiryDays?: number;
        maxFailedAttempts?: number;
        lockoutDurationMinutes?: number;
      }) {
        return callGateway<{ policy: PasswordPolicy }>("passwordPolicy.update", updates);
      },
    },

    accountProducts: {
      async list(params: { type?: string } = {}) {
        return callGateway<{ products: AccountProduct[] }>("accountProducts.list", params);
      },

      async get(id: string) {
        return callGateway<{ product: AccountProduct }>("accountProducts.get", { id });
      },
    },

    cd: {
      async maturity(accountId: string) {
        return callGateway<{ maturity: CDMaturity }>("cd.maturity", { accountId });
      },

      async updateMaturityAction(
        accountId: string,
        maturityAction: string,
        maturityTransferAccountId?: string,
      ) {
        return callGateway<{ success: boolean }>("cd.updateMaturityAction", {
          accountId,
          maturityAction,
          maturityTransferAccountId,
        });
      },
    },

    charges: {
      async definitions(params: { appliesTo?: string } = {}) {
        return callGateway<{ chargeDefinitions: ChargeDefinition[] }>(
          "charges.definitions",
          params,
        );
      },

      async list(
        params: { accountId?: string; status?: string; limit?: number; offset?: number } = {},
      ) {
        return callGateway<{ charges: Charge[]; _pagination?: Pagination }>("charges.list", params);
      },
    },

    standingInstructions: {
      async list(params: { status?: string } = {}) {
        return callGateway<{ instructions: StandingInstruction[] }>(
          "standingInstructions.list",
          params,
        );
      },

      async create(input: {
        fromAccountId: string;
        toAccountId?: string;
        toBeneficiaryId?: string;
        toLoanId?: string;
        transferType: string;
        amountCents: number;
        name: string;
        frequency: string;
        dayOfWeek?: number;
        dayOfMonth?: number;
        startDate: string;
      }) {
        return callGateway<{ instruction: StandingInstruction }>(
          "standingInstructions.create",
          input,
        );
      },

      async update(
        id: string,
        updates: {
          amountCents?: number;
          name?: string;
          frequency?: string;
          dayOfWeek?: number;
          dayOfMonth?: number;
          endDate?: string;
          status?: string;
        },
      ) {
        return callGateway<{ instruction: StandingInstruction }>("standingInstructions.update", {
          id,
          ...updates,
        });
      },
    },

    accountOpening: {
      async config() {
        return callGateway<{
          products: Array<{
            id: string;
            type: string;
            name: string;
            description: string;
            apyBps: number;
            minOpeningDepositCents: number;
            monthlyFeeCents: number;
            feeWaiverDescription?: string;
            termMonths?: number;
            isAvailable: boolean;
          }>;
          allowedFundingMethods: string[];
          minimumAge: number;
          maxApplicationsPerDay: number;
          applicationExpiryHours: number;
          allowJointApplications: boolean;
          requiredDisclosures: string[];
        }>("account-opening.config", {});
      },

      async create(applicant: Record<string, unknown>) {
        return callGateway<{
          id: string;
          tenantId: string;
          status: string;
          applicant: {
            firstNameInitial: string;
            lastNameMasked: string;
            emailMasked: string;
            ssnMasked: string;
          };
          selectedProducts: Array<{ productId: string; productType: string; productName: string }>;
          funding?: { method: string; amountCents: number; sourceAccountMasked?: string };
          createdAccounts?: Array<{ accountId: string; accountNumberMasked: string; type: string }>;
          createdAt: string;
          updatedAt: string;
          expiresAt: string;
        }>("account-opening.create", applicant);
      },

      async get(applicationId: string) {
        return callGateway<{
          id: string;
          tenantId: string;
          status: string;
          applicant: {
            firstNameInitial: string;
            lastNameMasked: string;
            emailMasked: string;
            ssnMasked: string;
          };
          selectedProducts: Array<{ productId: string; productType: string; productName: string }>;
          funding?: { method: string; amountCents: number; sourceAccountMasked?: string };
          createdAccounts?: Array<{ accountId: string; accountNumberMasked: string; type: string }>;
          createdAt: string;
          updatedAt: string;
          expiresAt: string;
        }>("account-opening.get", { applicationId });
      },

      async selectProducts(applicationId: string, productIds: string[]) {
        return callGateway<{
          id: string;
          status: string;
          selectedProducts: Array<{ productId: string; productType: string; productName: string }>;
          updatedAt: string;
        }>("account-opening.selectProducts", { applicationId, productIds });
      },

      async submitFunding(applicationId: string, funding: Record<string, unknown>) {
        return callGateway<{
          id: string;
          status: string;
          funding: { method: string; amountCents: number; sourceAccountMasked?: string };
          updatedAt: string;
        }>("account-opening.submitFunding", { applicationId, ...funding });
      },

      async complete(applicationId: string) {
        return callGateway<{
          id: string;
          status: string;
          createdAccounts: Array<{ accountId: string; accountNumberMasked: string; type: string }>;
          updatedAt: string;
        }>("account-opening.complete", { applicationId });
      },

      async cancel(applicationId: string) {
        return callGateway<{ success: boolean }>("account-opening.cancel", { applicationId });
      },
    },
  };
}
