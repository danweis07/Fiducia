/**
 * Gateway Domain — Loans, Loan Products, Loan Origination
 */

import type { CallGatewayFn, Pagination } from "./client";
import type {
  LoanProduct,
  Loan,
  LoanScheduleItem,
  LoanPayment,
  LoanApplication,
  LoanOriginationDocument,
  DocumentEntityType,
  DocumentEntityContext,
  LoanDocumentFile,
} from "@/types";

export function createLoansDomain(callGateway: CallGatewayFn) {
  return {
    loanProducts: {
      async list(params: { loanType?: string } = {}) {
        return callGateway<{ products: LoanProduct[] }>("loanProducts.list", params);
      },
    },

    loans: {
      async list(params: { status?: string } = {}) {
        return callGateway<{ loans: Loan[] }>("loans.list", params);
      },

      async get(id: string) {
        return callGateway<{ loan: Loan }>("loans.get", { id });
      },

      async schedule(loanId: string, params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ schedule: LoanScheduleItem[]; _pagination?: Pagination }>(
          "loans.schedule",
          { loanId, ...params },
        );
      },

      async payments(loanId: string, params: { limit?: number; offset?: number } = {}) {
        return callGateway<{ payments: LoanPayment[]; _pagination?: Pagination }>(
          "loans.payments",
          { loanId, ...params },
        );
      },

      async makePayment(input: {
        loanId: string;
        amountCents: number;
        fromAccountId: string;
        extraPrincipalCents?: number;
      }) {
        return callGateway<{ payment: LoanPayment }>("loans.makePayment", input);
      },
    },

    loanOrigination: {
      async getApplication(params: {
        applicationId: string;
        institutionId: string;
        environmentId?: string;
        productId?: string;
      }) {
        return callGateway<{ application: LoanApplication }>(
          "loanOrigination.application.get",
          params,
        );
      },

      async createApplication(input: {
        institutionId: string;
        environmentId?: string;
        productId?: string;
        requestedAmountCents: number;
        termMonths?: number;
        applicant: { firstName: string; lastName: string; email?: string; phone?: string };
        coApplicant?: { firstName: string; lastName: string; email?: string; phone?: string };
        additionalFields?: Record<string, unknown>;
      }) {
        return callGateway<{ application: LoanApplication }>(
          "loanOrigination.application.create",
          input,
        );
      },

      async getDocument(params: {
        documentId: string;
        institutionId: string;
        environmentId?: string;
        productId?: string;
      }) {
        return callGateway<{ document: LoanOriginationDocument }>(
          "loanOrigination.document.get",
          params,
        );
      },

      async createDocument(input: {
        institutionId: string;
        environmentId?: string;
        productId?: string;
        idDocument?: string;
        documentTemplateType: number;
        documentEntityType: DocumentEntityType;
        documentEntity: { id: string; context: DocumentEntityContext };
        statementDate?: string;
        dueDate?: string;
        requestedDate?: string;
        documentFile?: LoanDocumentFile;
      }) {
        return callGateway<{ idDocument: string }>("loanOrigination.document.create", input);
      },

      async updateDocument(input: {
        documentId: string;
        institutionId: string;
        environmentId?: string;
        productId?: string;
        documentFile?: LoanDocumentFile;
        statementDate?: string;
        dueDate?: string;
      }) {
        return callGateway<{ idDocument: string }>("loanOrigination.document.update", input);
      },
    },
  };
}
