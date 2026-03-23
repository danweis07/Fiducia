import { Car, Home, DollarSign, Landmark, GraduationCap, Briefcase } from "lucide-react";

export type StepId =
  | "select-product"
  | "personal-info"
  | "employment"
  | "loan-details"
  | "documents"
  | "review"
  | "submitted";

export const STEP_ORDER: StepId[] = [
  "select-product",
  "personal-info",
  "employment",
  "loan-details",
  "documents",
  "review",
  "submitted",
];

export const STEP_LABEL_KEYS: Record<StepId, string> = {
  "select-product": "loanApplication.steps.selectProduct",
  "personal-info": "loanApplication.steps.personalInfo",
  employment: "loanApplication.steps.employment",
  "loan-details": "loanApplication.steps.loanDetails",
  documents: "loanApplication.steps.documents",
  review: "loanApplication.steps.review",
  submitted: "loanApplication.steps.confirmation",
};

export function loanTypeIcon(type: string) {
  switch (type) {
    case "auto":
      return Car;
    case "mortgage":
      return Home;
    case "heloc":
      return Landmark;
    case "student":
      return GraduationCap;
    case "business":
      return Briefcase;
    default:
      return DollarSign;
  }
}

export const LOAN_TYPE_LABEL_KEYS: Record<string, string> = {
  personal: "loanApplication.loanTypes.personal",
  auto: "loanApplication.loanTypes.auto",
  mortgage: "loanApplication.loanTypes.mortgage",
  heloc: "loanApplication.loanTypes.heloc",
  student: "loanApplication.loanTypes.student",
  credit_builder: "loanApplication.loanTypes.creditBuilder",
  business: "loanApplication.loanTypes.business",
  line_of_credit: "loanApplication.loanTypes.lineOfCredit",
};

export const EMPLOYMENT_STATUS_KEYS: { value: string; labelKey: string }[] = [
  { value: "employed", labelKey: "loanApplication.employmentStatuses.employed" },
  { value: "self_employed", labelKey: "loanApplication.employmentStatuses.selfEmployed" },
  { value: "retired", labelKey: "loanApplication.employmentStatuses.retired" },
  { value: "student", labelKey: "loanApplication.employmentStatuses.student" },
  { value: "unemployed", labelKey: "loanApplication.employmentStatuses.unemployed" },
];

export const LOAN_PURPOSE_KEYS: Record<string, { value: string; labelKey: string }[]> = {
  personal: [
    { value: "debt_consolidation", labelKey: "loanApplication.purposes.debtConsolidation" },
    { value: "home_improvement", labelKey: "loanApplication.purposes.homeImprovement" },
    { value: "medical_expenses", labelKey: "loanApplication.purposes.medicalExpenses" },
    { value: "major_purchase", labelKey: "loanApplication.purposes.majorPurchase" },
    { value: "vacation", labelKey: "loanApplication.purposes.vacation" },
    { value: "other", labelKey: "loanApplication.purposes.other" },
  ],
  auto: [
    { value: "new_vehicle", labelKey: "loanApplication.purposes.newVehiclePurchase" },
    { value: "used_vehicle", labelKey: "loanApplication.purposes.usedVehiclePurchase" },
    { value: "refinance_auto", labelKey: "loanApplication.purposes.refinanceAutoLoan" },
  ],
  mortgage: [
    { value: "purchase", labelKey: "loanApplication.purposes.purchase" },
    { value: "refinance", labelKey: "loanApplication.purposes.refinance" },
    { value: "construction", labelKey: "loanApplication.purposes.construction" },
  ],
  heloc: [
    { value: "home_improvement", labelKey: "loanApplication.purposes.homeImprovement" },
    { value: "debt_consolidation", labelKey: "loanApplication.purposes.debtConsolidation" },
    { value: "education", labelKey: "loanApplication.purposes.education" },
    { value: "other", labelKey: "loanApplication.purposes.other" },
  ],
  student: [
    { value: "tuition", labelKey: "loanApplication.purposes.tuition" },
    { value: "living_expenses", labelKey: "loanApplication.purposes.livingExpenses" },
    { value: "books_supplies", labelKey: "loanApplication.purposes.booksAndSupplies" },
  ],
  business: [
    { value: "working_capital", labelKey: "loanApplication.purposes.workingCapital" },
    { value: "equipment", labelKey: "loanApplication.purposes.equipment" },
    { value: "expansion", labelKey: "loanApplication.purposes.expansion" },
    { value: "inventory", labelKey: "loanApplication.purposes.inventory" },
  ],
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
  selectedProductId: string;
  selectedLoanType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  employmentStatus: string;
  employerName: string;
  annualIncomeDollars: string;
  yearsEmployed: string;
  requestedAmountDollars: string;
  termMonths: string;
  purpose: string;
  additionalNotes: string;
  hasCoApplicant: boolean;
  coFirstName: string;
  coLastName: string;
  coEmail: string;
  coPhone: string;
}

export const INITIAL_FORM: FormData = {
  selectedProductId: "",
  selectedLoanType: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  employmentStatus: "",
  employerName: "",
  annualIncomeDollars: "",
  yearsEmployed: "",
  requestedAmountDollars: "",
  termMonths: "",
  purpose: "",
  additionalNotes: "",
  hasCoApplicant: false,
  coFirstName: "",
  coLastName: "",
  coEmail: "",
  coPhone: "",
};
