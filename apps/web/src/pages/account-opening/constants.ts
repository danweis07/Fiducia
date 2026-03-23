import { Shield, CreditCard, DollarSign, Building2 } from "lucide-react";

export type StepId =
  | "welcome"
  | "products"
  | "personal"
  | "review"
  | "processing"
  | "funding"
  | "confirmation";

export const STEP_ORDER: StepId[] = [
  "welcome",
  "products",
  "personal",
  "review",
  "processing",
  "funding",
  "confirmation",
];

export const STEP_LABEL_KEYS: Record<StepId, string> = {
  welcome: "accountOpening.stepWelcome",
  products: "accountOpening.stepProducts",
  personal: "accountOpening.stepPersonal",
  review: "accountOpening.stepReview",
  processing: "accountOpening.stepProcessing",
  funding: "accountOpening.stepFunding",
  confirmation: "accountOpening.stepConfirmation",
};

export const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

export interface FormData {
  // Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  citizenship: string;
  employmentStatus: string;
  // Product selection
  selectedProductIds: string[];
  // Funding
  fundingMethod: string;
  fundingAmountDollars: string;
}

export const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  ssn: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  citizenship: "",
  employmentStatus: "",
  selectedProductIds: [],
  fundingMethod: "",
  fundingAmountDollars: "",
};

export function productTypeIcon(type: string) {
  switch (type) {
    case "checking":
      return CreditCard;
    case "savings":
      return DollarSign;
    case "money_market":
      return Building2;
    case "cd":
      return Shield;
    default:
      return CreditCard;
  }
}

export const PRODUCT_TYPE_BADGE_KEYS: Record<string, string> = {
  checking: "accountOpening.productChecking",
  savings: "accountOpening.productSavings",
  money_market: "accountOpening.productMoneyMarket",
  cd: "accountOpening.productCd",
};

export interface ProductConfig {
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
}
