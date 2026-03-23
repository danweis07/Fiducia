import type { LiteracyResource, GlossaryTerm } from "@/types/financial-literacy";

export const FINANCIAL_RESOURCES: LiteracyResource[] = [
  // CFPB — Budgeting
  {
    id: "cfpb-budget-worksheet",
    title: "Budget Worksheet",
    description:
      "A step-by-step worksheet from the CFPB to help you track income and expenses and build a monthly budget.",
    url: "https://www.consumerfinance.gov/consumer-tools/budget-worksheet/",
    source: "CFPB",
    category: "budgeting",
    difficulty: "beginner",
  },
  {
    id: "cfpb-spending-tracker",
    title: "Spending Tracker",
    description:
      "Track your daily spending and identify areas where you can cut back to reach your financial goals.",
    url: "https://www.consumerfinance.gov/consumer-tools/spending-tracker/",
    source: "CFPB",
    category: "budgeting",
    difficulty: "beginner",
  },
  {
    id: "cfpb-credit-reports",
    title: "Understanding Your Credit Report",
    description:
      "Learn how to read your credit report, dispute errors, and understand what factors affect your credit score.",
    url: "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/",
    source: "CFPB",
    category: "credit",
    difficulty: "beginner",
  },
  {
    id: "cfpb-mortgage-basics",
    title: "Mortgage Key Terms",
    description:
      "Understand key mortgage terms including APR, points, escrow, and how to compare loan offers.",
    url: "https://www.consumerfinance.gov/owning-a-home/",
    source: "CFPB",
    category: "loans",
    difficulty: "intermediate",
  },
  {
    id: "cfpb-debt-collection",
    title: "Dealing with Debt Collection",
    description:
      "Know your rights when a debt collector contacts you and learn how to respond effectively.",
    url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/",
    source: "CFPB",
    category: "credit",
    difficulty: "intermediate",
  },
  {
    id: "cfpb-auto-loans",
    title: "Auto Loan Basics",
    description:
      "Compare auto financing options, understand loan terms, and learn how to negotiate a fair deal.",
    url: "https://www.consumerfinance.gov/consumer-tools/auto-loans/",
    source: "CFPB",
    category: "loans",
    difficulty: "beginner",
  },

  // FDIC Money Smart
  {
    id: "fdic-bank-on-it",
    title: "Bank On It — Banking Basics",
    description:
      "Learn how to choose a bank, open an account, and use banking services effectively.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "saving",
    difficulty: "beginner",
  },
  {
    id: "fdic-check-it-out",
    title: "Check It Out — Choosing & Keeping a Checking Account",
    description:
      "Understand checking account features, fees, and how to manage your account to avoid overdrafts.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "budgeting",
    difficulty: "beginner",
  },
  {
    id: "fdic-money-matters",
    title: "Money Matters — Keeping Track of Your Money",
    description:
      "Strategies for managing your money, reconciling your accounts, and creating a spending plan.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "budgeting",
    difficulty: "beginner",
  },
  {
    id: "fdic-saving-borrowing",
    title: "Setting Goals & Saving",
    description:
      "Set realistic savings goals, understand savings accounts, and learn about certificates of deposit.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "saving",
    difficulty: "beginner",
  },
  {
    id: "fdic-borrowing-basics",
    title: "Borrowing Basics",
    description:
      "Understand the cost of borrowing, types of loans, and how to manage debt responsibly.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "loans",
    difficulty: "intermediate",
  },
  {
    id: "fdic-fraud-protection",
    title: "Protecting Your Identity & Money",
    description:
      "Recognize common scams, protect your personal information, and learn what to do if you become a victim.",
    url: "https://www.fdic.gov/resources/consumers/money-smart/index.html",
    source: "FDIC Money Smart",
    category: "fraud_prevention",
    difficulty: "beginner",
  },

  // MyMoney.gov
  {
    id: "mymoney-five-principles",
    title: "My Money Five — Core Financial Principles",
    description:
      "The five building blocks of financial well-being: earn, save and invest, protect, spend, and borrow.",
    url: "https://www.mymoney.gov/mymoneyfive",
    source: "MyMoney.gov",
    category: "budgeting",
    difficulty: "beginner",
  },
  {
    id: "mymoney-saving-investing",
    title: "Save and Invest for the Future",
    description:
      "Federal resources on building an emergency fund, saving for retirement, and starting to invest.",
    url: "https://www.mymoney.gov/save-invest",
    source: "MyMoney.gov",
    category: "saving",
    difficulty: "intermediate",
  },
  {
    id: "mymoney-protect",
    title: "Protect Your Finances",
    description:
      "Learn about insurance, safeguarding personal information, and preparing for unexpected financial events.",
    url: "https://www.mymoney.gov/protect",
    source: "MyMoney.gov",
    category: "fraud_prevention",
    difficulty: "intermediate",
  },

  // Federal Reserve Education
  {
    id: "fed-basics-of-banking",
    title: "Basics of Banking",
    description:
      "Educational content from the Federal Reserve on how banks work, the role of interest rates, and monetary policy basics.",
    url: "https://www.federalreserveeducation.org/",
    source: "Federal Reserve",
    category: "saving",
    difficulty: "intermediate",
  },
  {
    id: "fed-understanding-inflation",
    title: "Understanding Inflation",
    description:
      "Learn what inflation is, how it is measured, and how it affects your purchasing power and savings.",
    url: "https://www.federalreserveeducation.org/",
    source: "Federal Reserve",
    category: "investing",
    difficulty: "intermediate",
  },
  {
    id: "fed-interest-rates",
    title: "How Interest Rates Work",
    description:
      "Understand how the Federal Reserve sets interest rates and how changes impact loans, savings, and the economy.",
    url: "https://www.federalreserveeducation.org/",
    source: "Federal Reserve",
    category: "loans",
    difficulty: "advanced",
  },

  // Investor.gov (SEC)
  {
    id: "sec-investing-basics",
    title: "Introduction to Investing",
    description:
      "Learn the basics of investing, including stocks, bonds, mutual funds, and the importance of diversification.",
    url: "https://www.investor.gov/introduction-investing",
    source: "Investor.gov (SEC)",
    category: "investing",
    difficulty: "beginner",
  },
  {
    id: "sec-compound-interest",
    title: "The Power of Compound Interest",
    description:
      "Use the SEC compound interest calculator to see how your savings can grow over time.",
    url: "https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator",
    source: "Investor.gov (SEC)",
    category: "investing",
    difficulty: "beginner",
  },
  {
    id: "sec-avoid-fraud",
    title: "How to Avoid Investment Fraud",
    description:
      "Recognize red flags of investment fraud, Ponzi schemes, and learn how to verify financial professionals.",
    url: "https://www.investor.gov/protect-your-investments",
    source: "Investor.gov (SEC)",
    category: "fraud_prevention",
    difficulty: "intermediate",
  },
  {
    id: "sec-retirement-planning",
    title: "Saving for Retirement — IRAs and 401(k)s",
    description:
      "Understand different retirement account types, contribution limits, and tax advantages.",
    url: "https://www.investor.gov/introduction-investing/getting-started/saving-and-investing",
    source: "Investor.gov (SEC)",
    category: "investing",
    difficulty: "advanced",
  },
  {
    id: "cfpb-scam-alerts",
    title: "Recognizing and Reporting Scams",
    description:
      "Stay informed about the latest financial scams and learn how to report suspicious activity to authorities.",
    url: "https://www.consumerfinance.gov/consumer-tools/fraud/",
    source: "CFPB",
    category: "fraud_prevention",
    difficulty: "beginner",
  },
];

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: "ACH",
    definition:
      "Automated Clearing House — an electronic network for processing financial transactions such as direct deposits and bill payments between banks in the United States.",
    relatedTerms: ["Wire Transfer", "Direct Deposit", "Routing Number"],
  },
  {
    term: "Amortization",
    definition:
      "The process of spreading a loan into a series of fixed payments over time. Each payment covers interest and a portion of the principal balance.",
    relatedTerms: ["Principal", "Interest Rate", "Mortgage"],
  },
  {
    term: "APR",
    definition:
      "Annual Percentage Rate — the yearly cost of borrowing money expressed as a percentage, including interest and fees.",
    relatedTerms: ["APY", "Interest Rate", "Fixed Rate", "Variable Rate"],
  },
  {
    term: "APY",
    definition:
      "Annual Percentage Yield — the total amount of interest earned on a deposit account in one year, including compound interest.",
    relatedTerms: ["APR", "Compound Interest", "Savings", "Yield"],
  },
  {
    term: "Balance",
    definition:
      "The amount of money currently in an account, or the amount still owed on a loan or credit card.",
    relatedTerms: ["Principal", "Statement"],
  },
  {
    term: "Beneficiary",
    definition:
      "A person or entity designated to receive funds from an account, insurance policy, or trust.",
    relatedTerms: ["Joint Account"],
  },
  {
    term: "CD",
    definition:
      "Certificate of Deposit — a savings product that earns interest on a lump sum for a fixed period of time (the term). Early withdrawal typically incurs a penalty.",
    relatedTerms: ["APY", "Maturity Date", "Term", "Savings"],
  },
  {
    term: "Checking",
    definition:
      "A bank account designed for everyday transactions such as deposits, withdrawals, and bill payments. Typically offers debit card access and check-writing privileges.",
    relatedTerms: ["Savings", "Debit", "Overdraft", "Direct Deposit"],
  },
  {
    term: "Compound Interest",
    definition:
      "Interest calculated on both the initial principal and the accumulated interest from previous periods, allowing savings to grow faster over time.",
    relatedTerms: ["APY", "Interest Rate", "Principal"],
  },
  {
    term: "Credit Score",
    definition:
      "A numerical rating (typically 300–850) representing a person's creditworthiness, based on credit history, payment behavior, and outstanding debt.",
    relatedTerms: ["FICO", "APR"],
  },
  {
    term: "Debit",
    definition:
      "A transaction that withdraws money from a bank account, or a card that draws funds directly from a checking account for purchases.",
    relatedTerms: ["Checking", "Balance"],
  },
  {
    term: "Direct Deposit",
    definition:
      "An electronic transfer of a payment (such as a paycheck or government benefit) directly into a recipient's bank account.",
    relatedTerms: ["ACH", "Checking"],
  },
  {
    term: "FDIC",
    definition:
      "Federal Deposit Insurance Corporation — a U.S. government agency that insures deposits in member banks up to $250,000 per depositor, per institution.",
    relatedTerms: ["Savings", "Checking", "CD"],
  },
  {
    term: "FICO",
    definition:
      "Fair Isaac Corporation — the company that created the most widely used credit scoring model. FICO scores range from 300 to 850.",
    relatedTerms: ["Credit Score"],
  },
  {
    term: "Fixed Rate",
    definition:
      "An interest rate that remains the same for the entire term of a loan or deposit, providing predictable payments.",
    relatedTerms: ["Variable Rate", "APR", "Mortgage"],
  },
  {
    term: "Grace Period",
    definition:
      "A period of time after a payment due date during which no late fee or penalty is charged. Common with credit cards and some loans.",
    relatedTerms: ["APR", "Interest Rate"],
  },
  {
    term: "Interest Rate",
    definition:
      "The percentage charged by a lender for borrowing money or paid by a bank on deposited funds, usually expressed on an annual basis.",
    relatedTerms: ["APR", "APY", "Fixed Rate", "Variable Rate"],
  },
  {
    term: "IRA",
    definition:
      "Individual Retirement Account — a tax-advantaged savings account designed for retirement. Common types include Traditional IRA and Roth IRA.",
    relatedTerms: ["Compound Interest", "APY"],
  },
  {
    term: "Joint Account",
    definition:
      "A bank account shared by two or more individuals, where each owner has equal access to the funds.",
    relatedTerms: ["Checking", "Savings", "Beneficiary"],
  },
  {
    term: "Lien",
    definition:
      "A legal claim on an asset (such as a house or car) used as collateral for a loan. The lien is removed once the debt is paid in full.",
    relatedTerms: ["Mortgage", "Principal"],
  },
  {
    term: "Maturity Date",
    definition:
      "The date on which a financial product (such as a CD or bond) reaches its full term and the principal is returned to the investor.",
    relatedTerms: ["CD", "Term", "Principal"],
  },
  {
    term: "Money Market",
    definition:
      "A type of savings account that typically offers higher interest rates than regular savings accounts, often with limited check-writing privileges.",
    relatedTerms: ["Savings", "APY", "Checking"],
  },
  {
    term: "Mortgage",
    definition:
      "A loan used to purchase real estate, where the property serves as collateral. Mortgages are typically repaid over 15 or 30 years.",
    relatedTerms: ["Amortization", "Fixed Rate", "Variable Rate", "Lien", "Principal"],
  },
  {
    term: "Overdraft",
    definition:
      "A situation where withdrawals from a bank account exceed the available balance, potentially resulting in fees. Overdraft protection can link accounts to cover shortfalls.",
    relatedTerms: ["Checking", "Balance"],
  },
  {
    term: "Principal",
    definition:
      "The original amount of money deposited, invested, or borrowed — excluding any interest or earnings.",
    relatedTerms: ["Amortization", "Interest Rate", "Balance"],
  },
  {
    term: "Refinance",
    definition:
      "The process of replacing an existing loan with a new one, usually to secure a lower interest rate, reduce monthly payments, or change the loan term.",
    relatedTerms: ["Mortgage", "APR", "Fixed Rate", "Variable Rate"],
  },
  {
    term: "Routing Number",
    definition:
      "A nine-digit code identifying a financial institution in the United States, used for processing electronic transactions such as direct deposits and wire transfers.",
    relatedTerms: ["ACH", "Wire Transfer", "Direct Deposit"],
  },
  {
    term: "Savings",
    definition:
      "A deposit account that earns interest on the balance. Designed for accumulating funds over time rather than daily transactions.",
    relatedTerms: ["APY", "Compound Interest", "Checking", "Money Market"],
  },
  {
    term: "Statement",
    definition:
      "A periodic summary of all transactions, deposits, withdrawals, fees, and interest earned on a bank account during a billing cycle.",
    relatedTerms: ["Balance", "Checking", "Savings"],
  },
  {
    term: "Term",
    definition:
      "The length of time for a loan, CD, or other financial agreement — for example, a 30-year mortgage or a 12-month CD.",
    relatedTerms: ["Maturity Date", "CD", "Mortgage"],
  },
  {
    term: "Variable Rate",
    definition:
      "An interest rate that can change over time based on market conditions or an index, leading to fluctuating payments.",
    relatedTerms: ["Fixed Rate", "APR", "Interest Rate"],
  },
  {
    term: "Wire Transfer",
    definition:
      "An electronic method of transferring funds between banks or financial institutions, typically faster than ACH but with higher fees.",
    relatedTerms: ["ACH", "Routing Number"],
  },
  {
    term: "Yield",
    definition:
      "The income earned on an investment or deposit, expressed as a percentage of the investment's value.",
    relatedTerms: ["APY", "Interest Rate", "Compound Interest"],
  },
  {
    term: "Escrow",
    definition:
      "A financial arrangement where a third party holds funds on behalf of two other parties until certain conditions are met, commonly used in real estate transactions for taxes and insurance.",
    relatedTerms: ["Mortgage", "Principal"],
  },
  {
    term: "Garnishment",
    definition:
      "A legal process in which a creditor can collect what a debtor owes by requiring a third party (such as an employer or bank) to withhold funds.",
    relatedTerms: ["Lien", "Balance"],
  },
];
