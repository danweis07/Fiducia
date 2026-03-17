/**
 * ISO 20022 Data Types
 *
 * TypeScript representations of ISO 20022 MX message structures
 * used by FedNow, SWIFT, and international clearinghouses.
 *
 * Reference: ISO 20022 Universal Financial Industry message scheme
 * Message types supported:
 *   - pain.001 (Customer Credit Transfer Initiation)
 *   - pacs.008 (FI to FI Customer Credit Transfer)
 *   - camt.053 (Bank to Customer Statement)
 */

// =============================================================================
// COMMON TYPES
// =============================================================================

export interface ISO20022Amount {
  /** Amount as string to preserve precision */
  value: string;
  /** ISO 4217 currency code (e.g., 'USD', 'EUR') */
  currency: string;
}

export interface ISO20022Party {
  name: string;
  postalAddress?: {
    streetName?: string;
    buildingNumber?: string;
    postCode?: string;
    townName?: string;
    countrySubDivision?: string;
    country: string;
  };
  identification?: {
    organisationId?: {
      bic?: string;
      lei?: string;
    };
    privateId?: {
      dateAndPlaceOfBirth?: {
        birthDate: string;
        cityOfBirth: string;
        countryOfBirth: string;
      };
    };
  };
}

export interface ISO20022Account {
  iban?: string;
  /** US routing/account number */
  other?: {
    id: string;
    schemeName: {
      code: string; // e.g., 'BBAN', 'USABA'
    };
  };
  currency?: string;
}

export interface ISO20022Agent {
  financialInstitutionId: {
    bic?: string;
    clearingSystemMemberId?: {
      clearingSystemId: string; // e.g., 'USABA' for ABA routing
      memberId: string;
    };
    name?: string;
  };
}

// =============================================================================
// PAIN.001 — Customer Credit Transfer Initiation
// =============================================================================

export interface Pain001CreditTransfer {
  messageId: string;
  creationDateTime: string;
  numberOfTransactions: number;
  controlSum: string;
  initiatingParty: ISO20022Party;
  payments: Pain001Payment[];
}

export interface Pain001Payment {
  paymentId: string;
  paymentMethod: 'TRF' | 'CHK';
  requestedExecutionDate: string;
  debtor: ISO20022Party;
  debtorAccount: ISO20022Account;
  debtorAgent: ISO20022Agent;
  creditTransfers: Pain001Transfer[];
}

export interface Pain001Transfer {
  endToEndId: string;
  instructedAmount: ISO20022Amount;
  creditor: ISO20022Party;
  creditorAccount: ISO20022Account;
  creditorAgent?: ISO20022Agent;
  remittanceInfo?: {
    unstructured?: string;
    structured?: {
      referenceType: string;
      reference: string;
    };
  };
}

// =============================================================================
// PACS.008 — FI to FI Customer Credit Transfer
// =============================================================================

export interface Pacs008FITransfer {
  messageId: string;
  creationDateTime: string;
  numberOfTransactions: number;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  settlementDate?: string;
  transactions: Pacs008Transaction[];
}

export interface Pacs008Transaction {
  instructionId: string;
  endToEndId: string;
  transactionId: string;
  interbankSettlementAmount: ISO20022Amount;
  interbankSettlementDate: string;
  chargeBearer: 'DEBT' | 'CRED' | 'SHAR' | 'SLEV';
  instructingAgent: ISO20022Agent;
  instructedAgent: ISO20022Agent;
  debtor: ISO20022Party;
  debtorAccount: ISO20022Account;
  creditor: ISO20022Party;
  creditorAccount: ISO20022Account;
  remittanceInfo?: {
    unstructured?: string;
  };
}

// =============================================================================
// CAMT.053 — Bank to Customer Statement
// =============================================================================

export interface Camt053Statement {
  messageId: string;
  creationDateTime: string;
  statements: Camt053StatementEntry[];
}

export interface Camt053StatementEntry {
  statementId: string;
  sequenceNumber: number;
  creationDateTime: string;
  account: ISO20022Account;
  balances: Camt053Balance[];
  entries: Camt053TransactionEntry[];
}

export interface Camt053Balance {
  type: 'OPBD' | 'CLBD' | 'ITBD' | 'PRCD' | 'FWAV';
  amount: ISO20022Amount;
  creditDebitIndicator: 'CRDT' | 'DBIT';
  date: string;
}

export interface Camt053TransactionEntry {
  entryReference: string;
  amount: ISO20022Amount;
  creditDebitIndicator: 'CRDT' | 'DBIT';
  status: 'BOOK' | 'PDNG' | 'INFO';
  bookingDate: string;
  valueDate: string;
  bankTransactionCode?: {
    domain: string;
    family: string;
    subFamily: string;
  };
  entryDetails?: {
    transactionId?: string;
    endToEndId?: string;
    remittanceInfo?: string;
    relatedParties?: {
      debtor?: ISO20022Party;
      creditor?: ISO20022Party;
    };
  };
}

// =============================================================================
// INTERNAL TRANSFER OBJECT (platform canonical form)
// =============================================================================

export interface InternalTransfer {
  id: string;
  fromAccountId: string;
  toAccountId?: string;
  fromRoutingNumber?: string;
  toRoutingNumber?: string;
  fromAccountNumber?: string;
  toAccountNumber?: string;
  amountCents: number;
  currency: string;
  memo?: string;
  senderName: string;
  senderAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  recipientName: string;
  recipientAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  senderBIC?: string;
  recipientBIC?: string;
  requestedDate: string;
  createdAt: string;
  tenantId: string;
}

export interface InternalTransaction {
  id: string;
  accountId: string;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'posted' | 'pending' | 'info';
  description: string;
  bookingDate: string;
  valueDate: string;
  category?: string;
  counterpartyName?: string;
  endToEndId?: string;
  remittanceInfo?: string;
}

export interface InternalStatement {
  id: string;
  accountId: string;
  accountIBAN?: string;
  accountNumber?: string;
  currency: string;
  openingBalance: number;
  closingBalance: number;
  statementDate: string;
  transactions: InternalTransaction[];
}
