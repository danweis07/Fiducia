/**
 * Automation Rules Engine
 *
 * Parses natural language rules into structured automation definitions
 * and evaluates them against incoming events (transactions, balance changes,
 * schedules, etc.).
 *
 * Uses the AI Services adapter for natural language parsing and returns
 * structured rule definitions that can be stored and evaluated at runtime.
 */

import type { AIServicesAdapter } from '../adapters/ai-services/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export type TriggerType =
  | 'transaction'
  | 'balance_threshold'
  | 'schedule'
  | 'direct_deposit'
  | 'recurring_payment';

export interface ParsedRule {
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: string;
  actionParams: Record<string, unknown>;
}

export interface RuleEvaluationContext {
  trigger: {
    type: TriggerType;
    event: Record<string, unknown>;
  };
  rule: {
    id: string;
    triggerType: TriggerType;
    triggerConfig: Record<string, unknown>;
    actionType: string;
    actionParams: Record<string, unknown>;
  };
  accounts: Array<{ id: string; type: string; balanceCents: number }>;
}

interface RuleEvaluationResult {
  shouldExecute: boolean;
  resolvedParams: Record<string, unknown>;
}

// =============================================================================
// RULE EXAMPLES (used for prompt engineering)
// =============================================================================

export const RULE_EXAMPLES: Array<{ input: string; parsed: ParsedRule }> = [
  {
    input: 'Round up every purchase to the nearest dollar and transfer the difference to my savings account',
    parsed: {
      name: 'Round-Up Savings',
      triggerType: 'transaction',
      triggerConfig: {
        transactionType: 'debit',
        minAmountCents: 1,
      },
      actionType: 'transfer',
      actionParams: {
        fromAccountType: 'checking',
        toAccountType: 'savings',
        amountStrategy: 'round_up_difference',
        roundTo: 100, // nearest dollar in cents
      },
    },
  },
  {
    input: 'When my checking account goes above $5,000, sweep the excess into savings',
    parsed: {
      name: 'Sweep Excess to Savings',
      triggerType: 'balance_threshold',
      triggerConfig: {
        accountType: 'checking',
        thresholdCents: 500000,
        direction: 'above',
      },
      actionType: 'transfer',
      actionParams: {
        fromAccountType: 'checking',
        toAccountType: 'savings',
        amountStrategy: 'excess_above_threshold',
        thresholdCents: 500000,
      },
    },
  },
  {
    input: 'Every time I get a direct deposit, move 10% to my savings',
    parsed: {
      name: 'Save on Payday',
      triggerType: 'direct_deposit',
      triggerConfig: {
        minAmountCents: 0,
      },
      actionType: 'transfer',
      actionParams: {
        fromAccountType: 'checking',
        toAccountType: 'savings',
        amountStrategy: 'percentage_of_trigger',
        percentage: 10,
      },
    },
  },
  {
    input: 'Alert me when any single charge is over $500',
    parsed: {
      name: 'Large Charge Alert',
      triggerType: 'transaction',
      triggerConfig: {
        transactionType: 'debit',
        minAmountCents: 50000,
      },
      actionType: 'notification',
      actionParams: {
        channel: 'push',
        template: 'large_charge_alert',
        includeTransactionDetails: true,
      },
    },
  },
  {
    input: 'Freeze my debit card if a transaction happens outside the US',
    parsed: {
      name: 'Freeze Card Outside US',
      triggerType: 'transaction',
      triggerConfig: {
        transactionType: 'debit',
        locationFilter: { excludeCountries: ['US'] },
      },
      actionType: 'card_control',
      actionParams: {
        action: 'freeze',
        reason: 'international_transaction_detected',
        notifyMember: true,
      },
    },
  },
  {
    input: 'Automatically pay my credit card balance in full every month on the 15th',
    parsed: {
      name: 'Auto-Pay Credit Card',
      triggerType: 'schedule',
      triggerConfig: {
        cron: '0 8 15 * *', // 8 AM on the 15th
        timezone: 'America/New_York',
      },
      actionType: 'transfer',
      actionParams: {
        fromAccountType: 'checking',
        toAccountType: 'credit_card',
        amountStrategy: 'full_balance',
      },
    },
  },
  {
    input: 'When my savings drops below $1,000, transfer $200 from checking',
    parsed: {
      name: 'Low Balance Safety Net',
      triggerType: 'balance_threshold',
      triggerConfig: {
        accountType: 'savings',
        thresholdCents: 100000,
        direction: 'below',
      },
      actionType: 'transfer',
      actionParams: {
        fromAccountType: 'checking',
        toAccountType: 'savings',
        amountStrategy: 'fixed',
        amountCents: 20000,
      },
    },
  },
  {
    input: 'Notify me every time a recurring payment is processed from my account',
    parsed: {
      name: 'Recurring Payment Alert',
      triggerType: 'recurring_payment',
      triggerConfig: {
        minAmountCents: 0,
      },
      actionType: 'notification',
      actionParams: {
        channel: 'push',
        template: 'recurring_payment_processed',
        includeTransactionDetails: true,
      },
    },
  },
];

// =============================================================================
// VALID VALUES
// =============================================================================

const VALID_TRIGGER_TYPES: TriggerType[] = [
  'transaction',
  'balance_threshold',
  'schedule',
  'direct_deposit',
  'recurring_payment',
];

const VALID_ACTION_TYPES = [
  'transfer',
  'notification',
  'card_control',
  'categorize',
  'tag',
];

// =============================================================================
// NATURAL LANGUAGE PARSING
// =============================================================================

function buildSystemPrompt(): string {
  const examplesBlock = RULE_EXAMPLES.map(
    (ex, i) =>
      `Example ${i + 1}:\nUser input: "${ex.input}"\nParsed rule:\n${JSON.stringify(ex.parsed, null, 2)}`
  ).join('\n\n');

  return `You are an automation rules parser for a digital banking platform. Your job is to convert a member's plain English description of a financial automation rule into a structured JSON object.

The output must be a single JSON object with exactly these fields:
- name (string): A short descriptive name for the rule
- triggerType (string): One of: transaction, balance_threshold, schedule, direct_deposit, recurring_payment
- triggerConfig (object): Configuration specific to the trigger type
- actionType (string): One of: transfer, notification, card_control, categorize, tag
- actionParams (object): Parameters for the action to execute

Monetary values must always be in cents (integer). For example, $5.00 = 500, $1,000 = 100000.

Trigger config guidelines:
- transaction: { transactionType, minAmountCents, maxAmountCents, merchantFilter, categoryFilter, locationFilter }
- balance_threshold: { accountType, thresholdCents, direction ("above" or "below") }
- schedule: { cron (standard 5-field cron), timezone }
- direct_deposit: { minAmountCents }
- recurring_payment: { minAmountCents, merchantFilter }

Action params guidelines:
- transfer: { fromAccountType, toAccountType, amountStrategy, amountCents, percentage, thresholdCents, roundTo }
  amountStrategy options: fixed, percentage_of_trigger, round_up_difference, excess_above_threshold, full_balance
- notification: { channel (push|email|sms), template, includeTransactionDetails }
- card_control: { action (freeze|unfreeze|restrict), reason, notifyMember }

Here are examples of correct parsing:

${examplesBlock}

Respond ONLY with valid JSON. No markdown, no explanation, no code blocks.`;
}

/**
 * Parse a natural language rule description into a structured ParsedRule.
 *
 * Sends the member's plain English text to the AI adapter along with
 * a system prompt containing examples, then validates the structured output.
 */
export async function parseNaturalLanguageRule(
  input: string,
  adapter: AIServicesAdapter,
): Promise<ParsedRule> {
  if (!input || input.trim().length === 0) {
    throw new Error('Rule input cannot be empty');
  }

  if (input.trim().length > 2000) {
    throw new Error('Rule input exceeds maximum length of 2000 characters');
  }

  const parsed = await adapter.completeJSON<ParsedRule>({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: input.trim() },
    ],
    temperature: 0.1,
    maxTokens: 1024,
    jsonResponse: true,
    trace: {
      name: 'rules_engine.parse_natural_language',
      metadata: { inputLength: input.length },
    },
  });

  validateParsedRule(parsed);
  return parsed;
}

/**
 * Validate a parsed rule has all required fields and valid values.
 */
function validateParsedRule(rule: ParsedRule): void {
  if (!rule.name || typeof rule.name !== 'string') {
    throw new Error('Parsed rule missing required field: name');
  }

  if (!VALID_TRIGGER_TYPES.includes(rule.triggerType)) {
    throw new Error(
      `Invalid triggerType "${rule.triggerType}". Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`
    );
  }

  if (!rule.triggerConfig || typeof rule.triggerConfig !== 'object') {
    throw new Error('Parsed rule missing required field: triggerConfig');
  }

  if (!rule.actionType || typeof rule.actionType !== 'string') {
    throw new Error('Parsed rule missing required field: actionType');
  }

  if (!VALID_ACTION_TYPES.includes(rule.actionType)) {
    throw new Error(
      `Invalid actionType "${rule.actionType}". Must be one of: ${VALID_ACTION_TYPES.join(', ')}`
    );
  }

  if (!rule.actionParams || typeof rule.actionParams !== 'object') {
    throw new Error('Parsed rule missing required field: actionParams');
  }

  // Trigger-specific validation
  if (rule.triggerType === 'balance_threshold') {
    const config = rule.triggerConfig as Record<string, unknown>;
    if (typeof config.thresholdCents !== 'number' || config.thresholdCents < 0) {
      throw new Error('balance_threshold trigger requires a non-negative thresholdCents');
    }
    if (!['above', 'below'].includes(config.direction as string)) {
      throw new Error('balance_threshold trigger requires direction: "above" or "below"');
    }
  }

  if (rule.triggerType === 'schedule') {
    const config = rule.triggerConfig as Record<string, unknown>;
    if (!config.cron || typeof config.cron !== 'string') {
      throw new Error('schedule trigger requires a cron expression');
    }
  }
}

// =============================================================================
// RULE EVALUATION
// =============================================================================

/**
 * Evaluate whether a rule should execute given the current trigger event
 * and resolve the action parameters with concrete values.
 */
export function evaluateRule(ctx: RuleEvaluationContext): RuleEvaluationResult {
  const { trigger, rule, accounts } = ctx;

  // Trigger type must match the rule
  if (trigger.type !== rule.triggerType) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  switch (rule.triggerType) {
    case 'balance_threshold':
      return evaluateBalanceThreshold(trigger.event, rule, accounts);

    case 'transaction':
      return evaluateTransaction(trigger.event, rule, accounts);

    case 'schedule':
      return evaluateSchedule(rule, accounts);

    case 'direct_deposit':
      return evaluateDirectDeposit(trigger.event, rule, accounts);

    case 'recurring_payment':
      return evaluateRecurringPayment(trigger.event, rule, accounts);

    default:
      return { shouldExecute: false, resolvedParams: {} };
  }
}

// =============================================================================
// TRIGGER EVALUATORS
// =============================================================================

function evaluateBalanceThreshold(
  event: Record<string, unknown>,
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
): RuleEvaluationResult {
  const config = rule.triggerConfig;
  const thresholdCents = config.thresholdCents as number;
  const direction = config.direction as string;
  const accountType = config.accountType as string;

  const currentBalanceCents = event.currentBalanceCents as number;
  const previousBalanceCents = event.previousBalanceCents as number;

  if (typeof currentBalanceCents !== 'number' || typeof previousBalanceCents !== 'number') {
    return { shouldExecute: false, resolvedParams: {} };
  }

  let crossed = false;

  if (direction === 'above') {
    // Balance crossed upward through the threshold
    crossed = previousBalanceCents <= thresholdCents && currentBalanceCents > thresholdCents;
  } else if (direction === 'below') {
    // Balance crossed downward through the threshold
    crossed = previousBalanceCents >= thresholdCents && currentBalanceCents < thresholdCents;
  }

  if (!crossed) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  const resolvedParams = resolveActionParams(rule, accounts, {
    currentBalanceCents,
    previousBalanceCents,
    thresholdCents,
    accountType,
  });

  return { shouldExecute: true, resolvedParams };
}

function evaluateTransaction(
  event: Record<string, unknown>,
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
): RuleEvaluationResult {
  const config = rule.triggerConfig;

  // Check transaction type filter
  if (config.transactionType && event.transactionType !== config.transactionType) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  const amountCents = event.amountCents as number;

  // Check minimum amount
  if (typeof config.minAmountCents === 'number' && amountCents < (config.minAmountCents as number)) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  // Check maximum amount
  if (typeof config.maxAmountCents === 'number' && amountCents > (config.maxAmountCents as number)) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  // Check merchant filter
  if (config.merchantFilter) {
    const merchant = (event.merchantName as string ?? '').toLowerCase();
    const filter = (config.merchantFilter as string).toLowerCase();
    if (!merchant.includes(filter)) {
      return { shouldExecute: false, resolvedParams: {} };
    }
  }

  // Check category filter
  if (config.categoryFilter) {
    const category = event.category as string;
    const filter = config.categoryFilter as string;
    if (category !== filter) {
      return { shouldExecute: false, resolvedParams: {} };
    }
  }

  // Check location filter (country exclusion)
  if (config.locationFilter) {
    const locationFilter = config.locationFilter as { excludeCountries?: string[] };
    const country = event.country as string;
    if (
      locationFilter.excludeCountries &&
      country &&
      !locationFilter.excludeCountries.includes(country)
    ) {
      // Transaction is in an allowed country, do not trigger
      return { shouldExecute: false, resolvedParams: {} };
    }
  }

  const resolvedParams = resolveActionParams(rule, accounts, {
    amountCents,
    merchantName: event.merchantName,
    category: event.category,
    transactionId: event.transactionId,
  });

  return { shouldExecute: true, resolvedParams };
}

function evaluateSchedule(
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
): RuleEvaluationResult {
  // Schedule triggers are pre-filtered by the cron scheduler.
  // If evaluation is called, the schedule has already matched.
  const resolvedParams = resolveActionParams(rule, accounts, {});
  return { shouldExecute: true, resolvedParams };
}

function evaluateDirectDeposit(
  event: Record<string, unknown>,
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
): RuleEvaluationResult {
  const config = rule.triggerConfig;
  const amountCents = event.amountCents as number;

  if (typeof amountCents !== 'number') {
    return { shouldExecute: false, resolvedParams: {} };
  }

  // Check minimum amount
  if (typeof config.minAmountCents === 'number' && amountCents < (config.minAmountCents as number)) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  const resolvedParams = resolveActionParams(rule, accounts, {
    amountCents,
    depositSource: event.depositSource,
  });

  return { shouldExecute: true, resolvedParams };
}

function evaluateRecurringPayment(
  event: Record<string, unknown>,
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
): RuleEvaluationResult {
  const config = rule.triggerConfig;
  const amountCents = event.amountCents as number;

  if (typeof amountCents !== 'number') {
    return { shouldExecute: false, resolvedParams: {} };
  }

  // Check minimum amount
  if (typeof config.minAmountCents === 'number' && amountCents < (config.minAmountCents as number)) {
    return { shouldExecute: false, resolvedParams: {} };
  }

  // Check merchant filter
  if (config.merchantFilter) {
    const merchant = (event.merchantName as string ?? '').toLowerCase();
    const filter = (config.merchantFilter as string).toLowerCase();
    if (!merchant.includes(filter)) {
      return { shouldExecute: false, resolvedParams: {} };
    }
  }

  const resolvedParams = resolveActionParams(rule, accounts, {
    amountCents,
    merchantName: event.merchantName,
    transactionId: event.transactionId,
  });

  return { shouldExecute: true, resolvedParams };
}

// =============================================================================
// ACTION PARAMETER RESOLUTION
// =============================================================================

/**
 * Resolve action parameters by filling in concrete account IDs and amounts
 * based on the rule's action configuration and the current account state.
 */
function resolveActionParams(
  rule: RuleEvaluationContext['rule'],
  accounts: RuleEvaluationContext['accounts'],
  eventData: Record<string, unknown>,
): Record<string, unknown> {
  const params = { ...rule.actionParams };

  // Resolve account references to concrete account IDs
  if (params.fromAccountType) {
    const fromAccount = accounts.find((a) => a.type === params.fromAccountType);
    if (fromAccount) {
      params.fromAccountId = fromAccount.id;
    }
  }

  if (params.toAccountType) {
    const toAccount = accounts.find((a) => a.type === params.toAccountType);
    if (toAccount) {
      params.toAccountId = toAccount.id;
    }
  }

  // Resolve amount based on strategy
  if (params.amountStrategy) {
    const resolvedAmount = resolveAmount(
      params.amountStrategy as string,
      params,
      accounts,
      eventData,
    );
    if (resolvedAmount !== null) {
      params.resolvedAmountCents = resolvedAmount;
    }
  }

  // Attach trigger event data for notification templates
  if (rule.actionType === 'notification') {
    params.eventData = eventData;
  }

  return params;
}

/**
 * Calculate the concrete transfer amount based on the configured strategy.
 */
function resolveAmount(
  strategy: string,
  params: Record<string, unknown>,
  accounts: RuleEvaluationContext['accounts'],
  eventData: Record<string, unknown>,
): number | null {
  switch (strategy) {
    case 'fixed': {
      const amountCents = params.amountCents as number;
      return typeof amountCents === 'number' ? amountCents : null;
    }

    case 'percentage_of_trigger': {
      const triggerAmount = eventData.amountCents as number;
      const percentage = params.percentage as number;
      if (typeof triggerAmount !== 'number' || typeof percentage !== 'number') return null;
      return Math.round(triggerAmount * (percentage / 100));
    }

    case 'round_up_difference': {
      const triggerAmount = eventData.amountCents as number;
      const roundTo = (params.roundTo as number) || 100; // Default to nearest dollar
      if (typeof triggerAmount !== 'number') return null;
      const rounded = Math.ceil(triggerAmount / roundTo) * roundTo;
      const difference = rounded - triggerAmount;
      // If the amount is already a round number, use the full roundTo value
      return difference === 0 ? roundTo : difference;
    }

    case 'excess_above_threshold': {
      const thresholdCents = params.thresholdCents as number;
      const fromAccount = accounts.find((a) => a.type === params.fromAccountType);
      if (!fromAccount || typeof thresholdCents !== 'number') return null;
      const excess = fromAccount.balanceCents - thresholdCents;
      return excess > 0 ? excess : null;
    }

    case 'full_balance': {
      const toAccount = accounts.find((a) => a.type === params.toAccountType);
      if (!toAccount) return null;
      // For credit cards, the "balance" is the amount owed
      return Math.abs(toAccount.balanceCents);
    }

    default:
      return null;
  }
}
