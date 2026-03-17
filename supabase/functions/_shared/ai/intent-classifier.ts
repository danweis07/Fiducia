/**
 * Intent Classifier & Action Router
 *
 * Maps natural language member requests to gateway actions.
 * The AI classifies the user's intent, extracts parameters,
 * and returns a structured action that can be confirmed and executed.
 */

import type { AIServicesAdapter } from '../adapters/ai-services/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ClassifiedIntent {
  intent: string;                          // e.g. 'transfer_money'
  confidence: number;                      // 0-1
  gatewayAction: string;                   // e.g. 'transfers.create'
  params: Record<string, unknown>;         // extracted parameters
  confirmationMessage: string;             // human-readable confirmation prompt
  requiresConfirmation: boolean;           // whether to ask before executing
  missingParams?: string[];                // params that couldn't be extracted
}

export interface IntentClassificationResult {
  classified: boolean;
  intent?: ClassifiedIntent;
  fallbackResponse?: string;               // response if no action intent detected
  isQuestion: boolean;                     // true if this is informational, not actionable
}

// =============================================================================
// INTENT CATALOG — maps intents to gateway actions
// =============================================================================

export interface IntentDefinition {
  intent: string;
  description: string;
  gatewayAction: string;
  requiredParams: string[];
  optionalParams: string[];
  confirmationTemplate: string;
  requiresConfirmation: boolean;
  examples: string[];
}

export const INTENT_CATALOG: IntentDefinition[] = [
  // --- Money Movement ---
  {
    intent: 'transfer_money',
    description: 'Transfer money between accounts',
    gatewayAction: 'transfers.create',
    requiredParams: ['fromAccountId', 'toAccountId', 'amountCents'],
    optionalParams: ['memo'],
    confirmationTemplate: 'Transfer {{amount}} from {{fromAccount}} to {{toAccount}}?',
    requiresConfirmation: true,
    examples: [
      'Transfer $200 to savings',
      'Move $500 from checking to savings',
      'Send $100 to my savings account',
    ],
  },
  {
    intent: 'pay_bill',
    description: 'Pay a bill or enroll a payee',
    gatewayAction: 'billpay.payments.schedule',
    requiredParams: ['payeeId', 'amountCents', 'scheduledDate'],
    optionalParams: ['memo'],
    confirmationTemplate: 'Pay {{amount}} to {{payee}} on {{date}}?',
    requiresConfirmation: true,
    examples: [
      'Pay my electric bill',
      'Set up autopay for my rent',
      'Pay $150 to Comcast',
    ],
  },
  {
    intent: 'send_p2p',
    description: 'Send money to another person via P2P/Zelle',
    gatewayAction: 'p2p.send',
    requiredParams: ['recipientValue', 'amountCents'],
    optionalParams: ['memo', 'recipientType'],
    confirmationTemplate: 'Send {{amount}} to {{recipient}}?',
    requiresConfirmation: true,
    examples: [
      'Send $50 to john@email.com',
      'Zelle $25 to 555-1234',
      'Pay Sarah $100 for dinner',
    ],
  },
  {
    intent: 'schedule_recurring_transfer',
    description: 'Set up a recurring/standing transfer',
    gatewayAction: 'standingInstructions.create',
    requiredParams: ['fromAccountId', 'toAccountId', 'amountCents', 'frequency'],
    optionalParams: ['startDate', 'endDate', 'name'],
    confirmationTemplate: 'Set up {{frequency}} transfer of {{amount}} from {{fromAccount}} to {{toAccount}}?',
    requiresConfirmation: true,
    examples: [
      'Save $50 every payday',
      'Set up weekly transfer of $100 to savings',
      'Auto-transfer $200 monthly to savings',
    ],
  },

  // --- Card Management ---
  {
    intent: 'lock_card',
    description: 'Lock/freeze a debit or credit card',
    gatewayAction: 'cards.lock',
    requiredParams: ['cardId'],
    optionalParams: [],
    confirmationTemplate: 'Lock your card ending in {{lastFour}}?',
    requiresConfirmation: true,
    examples: [
      'Lock my debit card',
      'Freeze my card',
      'Block my card ending in 4567',
    ],
  },
  {
    intent: 'unlock_card',
    description: 'Unlock/unfreeze a card',
    gatewayAction: 'cards.unlock',
    requiredParams: ['cardId'],
    optionalParams: [],
    confirmationTemplate: 'Unlock your card ending in {{lastFour}}?',
    requiresConfirmation: false,
    examples: [
      'Unlock my debit card',
      'Unfreeze my card',
    ],
  },
  {
    intent: 'set_card_limit',
    description: 'Set daily spending limit on a card',
    gatewayAction: 'cards.setLimit',
    requiredParams: ['cardId', 'dailyLimitCents'],
    optionalParams: [],
    confirmationTemplate: 'Set daily limit to {{amount}} on card ****{{lastFour}}?',
    requiresConfirmation: true,
    examples: [
      'Set my card limit to $500',
      'Change daily spending limit to $1000',
    ],
  },
  {
    intent: 'report_lost_card',
    description: 'Report a card as lost or stolen and request replacement',
    gatewayAction: 'cardServices.replacement.request',
    requiredParams: ['cardId', 'reason'],
    optionalParams: ['shippingMethod'],
    confirmationTemplate: 'Report card ****{{lastFour}} as {{reason}} and order a replacement?',
    requiresConfirmation: true,
    examples: [
      'I lost my card',
      'My card was stolen',
      'Report my debit card stolen',
    ],
  },

  // --- Account Services ---
  {
    intent: 'order_checks',
    description: 'Order new checks for an account',
    gatewayAction: 'checks.order.create',
    requiredParams: ['accountId', 'styleId'],
    optionalParams: ['quantity'],
    confirmationTemplate: 'Order checks for account ****{{lastFour}}?',
    requiresConfirmation: true,
    examples: [
      'Order new checks',
      'I need more checks for my checking account',
    ],
  },
  {
    intent: 'create_stop_payment',
    description: 'Place a stop payment on a check',
    gatewayAction: 'stopPayments.create',
    requiredParams: ['accountId', 'checkNumber'],
    optionalParams: ['amountCents', 'payeeName'],
    confirmationTemplate: 'Stop payment on check #{{checkNumber}} from account ****{{lastFour}}?',
    requiresConfirmation: true,
    examples: [
      'Stop payment on check 1234',
      'Cancel check number 5678',
    ],
  },
  {
    intent: 'file_dispute',
    description: 'File a transaction dispute',
    gatewayAction: 'disputes.file',
    requiredParams: ['transactionId', 'reason'],
    optionalParams: ['description'],
    confirmationTemplate: 'File a dispute for the {{amount}} charge at {{merchant}}?',
    requiresConfirmation: true,
    examples: [
      "I didn't make this $89 charge at Amazon",
      'Dispute the $50 charge from yesterday',
      'I want to dispute a transaction',
    ],
  },
  {
    intent: 'create_travel_notice',
    description: 'Set a travel notice on a card',
    gatewayAction: 'cardServices.travelNotice.create',
    requiredParams: ['cardId', 'destinations', 'startDate', 'endDate'],
    optionalParams: ['contactPhone'],
    confirmationTemplate: 'Set travel notice for {{destinations}} from {{startDate}} to {{endDate}}?',
    requiresConfirmation: true,
    examples: [
      "I'm traveling to Mexico next week",
      'Set up a travel notice for Europe',
      'Let my card know I will be in Japan',
    ],
  },

  // --- Savings & Goals ---
  {
    intent: 'create_savings_goal',
    description: 'Create a new savings goal',
    gatewayAction: 'goals.create',
    requiredParams: ['name', 'targetAmountCents'],
    optionalParams: ['targetDate', 'accountId'],
    confirmationTemplate: 'Create savings goal "{{name}}" for {{amount}}?',
    requiresConfirmation: true,
    examples: [
      'Create a vacation savings goal for $5000',
      'I want to save $10000 for a car by December',
      'Start an emergency fund goal',
    ],
  },
  {
    intent: 'contribute_to_goal',
    description: 'Add money to a savings goal',
    gatewayAction: 'goals.contribute',
    requiredParams: ['goalId', 'amountCents'],
    optionalParams: ['fromAccountId'],
    confirmationTemplate: 'Add {{amount}} to your "{{goalName}}" goal?',
    requiresConfirmation: true,
    examples: [
      'Add $200 to my vacation fund',
      'Put $100 toward my emergency fund',
    ],
  },

  // --- Information Queries (no action, just look up data) ---
  {
    intent: 'check_balance',
    description: 'Check account balance(s)',
    gatewayAction: 'accounts.summary',
    requiredParams: [],
    optionalParams: ['accountId'],
    confirmationTemplate: '',
    requiresConfirmation: false,
    examples: [
      'What is my balance?',
      'How much money do I have?',
      'Check my savings balance',
    ],
  },
  {
    intent: 'search_transactions',
    description: 'Search or filter transaction history',
    gatewayAction: 'transactions.search',
    requiredParams: ['query'],
    optionalParams: ['accountId', 'startDate', 'endDate', 'category'],
    confirmationTemplate: '',
    requiresConfirmation: false,
    examples: [
      'What did I spend at Target last 3 months?',
      'Show me all restaurant charges this week',
      'Find the charge from Amazon on March 1st',
    ],
  },
  {
    intent: 'spending_summary',
    description: 'Get spending breakdown or budget status',
    gatewayAction: 'financial.spending',
    requiredParams: [],
    optionalParams: ['period', 'category'],
    confirmationTemplate: '',
    requiresConfirmation: false,
    examples: [
      'How much have I spent this month?',
      'Show my spending by category',
      'Am I over budget on dining?',
    ],
  },

  // --- Alerts & Settings ---
  {
    intent: 'set_spending_alert',
    description: 'Create a spending alert',
    gatewayAction: 'alerts.create',
    requiredParams: ['alertType', 'thresholdCents'],
    optionalParams: ['category', 'accountId'],
    confirmationTemplate: 'Set alert when {{alertType}} exceeds {{amount}}?',
    requiresConfirmation: true,
    examples: [
      'Alert me if any charge over $500',
      'Notify me when I spend more than $200 on dining',
      'Set up a low balance alert at $100',
    ],
  },
  {
    intent: 'update_overdraft',
    description: 'Update overdraft protection settings',
    gatewayAction: 'overdraft.settings.update',
    requiredParams: ['accountId'],
    optionalParams: ['enabled', 'sourceAccountId'],
    confirmationTemplate: '{{action}} overdraft protection on account ****{{lastFour}}?',
    requiresConfirmation: true,
    examples: [
      'Enable overdraft protection',
      'Turn off overdraft on my checking',
      'Link my savings as overdraft backup',
    ],
  },
];

// =============================================================================
// CLASSIFICATION PROMPT
// =============================================================================

function buildClassificationPrompt(intentCatalog: IntentDefinition[]): string {
  const intentSummaries = intentCatalog.map((i) => {
    const exampleStr = i.examples.map((e) => `  - "${e}"`).join('\n');
    return `INTENT: ${i.intent}
  Action: ${i.gatewayAction}
  Description: ${i.description}
  Required params: ${i.requiredParams.join(', ') || 'none'}
  Optional params: ${i.optionalParams.join(', ') || 'none'}
  Examples:
${exampleStr}`;
  }).join('\n\n');

  return `You are an intent classifier for a digital banking assistant.
Given a user message, classify it into one of the known intents and extract parameters.

KNOWN INTENTS:
${intentSummaries}

RULES:
1. If the message matches an intent, return a JSON object with the classification
2. If the message is a general question or conversation (not an action), set "isQuestion" to true and provide a helpful response in "fallbackResponse"
3. Extract as many parameters as possible from the message. Use null for unknown values.
4. For monetary amounts, convert to cents (e.g., "$200" → 20000)
5. For account references like "checking" or "savings", use the account type as a hint — the system will resolve to actual account IDs
6. Confidence should be 0.0-1.0 based on how clearly the intent matches
7. If confidence is below 0.5, treat as a question instead

RESPOND WITH EXACTLY THIS JSON STRUCTURE:
{
  "classified": true/false,
  "isQuestion": true/false,
  "intent": "intent_name" or null,
  "confidence": 0.0-1.0,
  "params": { extracted parameters } or {},
  "missingParams": ["param1", "param2"] or [],
  "confirmationMessage": "human readable confirmation" or null,
  "fallbackResponse": "response if this is just a question" or null
}`;
}

// =============================================================================
// CLASSIFIER
// =============================================================================

/**
 * Classify a user message into a structured intent with extracted parameters.
 */
export async function classifyIntent(
  message: string,
  adapter: AIServicesAdapter,
  opts?: {
    accountContext?: Array<{ id: string; type: string; nickname: string; lastFour: string; balanceCents: number }>;
    cardContext?: Array<{ id: string; type: string; lastFour: string; status: string }>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  },
): Promise<IntentClassificationResult> {
  const classificationPrompt = buildClassificationPrompt(INTENT_CATALOG);

  // Build context about the member's accounts/cards so the AI can resolve references
  let memberContext = '';
  if (opts?.accountContext?.length) {
    memberContext += '\nMEMBER ACCOUNTS:\n';
    for (const a of opts.accountContext) {
      memberContext += `- ${a.type} "${a.nickname}" (****${a.lastFour}) ID: ${a.id}, Balance: $${(a.balanceCents / 100).toFixed(2)}\n`;
    }
  }
  if (opts?.cardContext?.length) {
    memberContext += '\nMEMBER CARDS:\n';
    for (const c of opts.cardContext) {
      memberContext += `- ${c.type} card ****${c.lastFour}, Status: ${c.status}, ID: ${c.id}\n`;
    }
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: classificationPrompt + memberContext },
  ];

  // Include recent conversation for context
  if (opts?.conversationHistory?.length) {
    const recent = opts.conversationHistory.slice(-4); // last 4 messages for context
    for (const msg of recent) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: 'user', content: message });

  try {
    const result = await adapter.completeJSON<{
      classified: boolean;
      isQuestion: boolean;
      intent: string | null;
      confidence: number;
      params: Record<string, unknown>;
      missingParams: string[];
      confirmationMessage: string | null;
      fallbackResponse: string | null;
    }>({
      messages,
      temperature: 0.1, // low temp for consistent classification
      maxTokens: 512,
    });

    if (!result.classified || !result.intent || result.confidence < 0.5) {
      return {
        classified: false,
        isQuestion: result.isQuestion ?? true,
        fallbackResponse: result.fallbackResponse ?? undefined,
      };
    }

    // Look up the intent definition
    const definition = INTENT_CATALOG.find((d) => d.intent === result.intent);
    if (!definition) {
      return {
        classified: false,
        isQuestion: true,
        fallbackResponse: result.fallbackResponse ?? undefined,
      };
    }

    return {
      classified: true,
      isQuestion: false,
      intent: {
        intent: result.intent,
        confidence: result.confidence,
        gatewayAction: definition.gatewayAction,
        params: result.params,
        confirmationMessage: result.confirmationMessage ?? definition.confirmationTemplate,
        requiresConfirmation: definition.requiresConfirmation,
        missingParams: result.missingParams,
      },
    };
  } catch (err) {
    console.error('[intent-classifier] classification failed:', err);
    return {
      classified: false,
      isQuestion: true,
      fallbackResponse: "I'm sorry, I had trouble understanding that. Could you rephrase?",
    };
  }
}

/**
 * Execute a confirmed intent by calling the gateway action.
 * This function is called after the user confirms the action.
 */
export async function executeIntent(
  intent: ClassifiedIntent,
  gatewayInvoke: (action: string, params: Record<string, unknown>) => Promise<{ data?: unknown; error?: { code: string; message: string } }>,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    const result = await gatewayInvoke(intent.gatewayAction, intent.params);

    if (result.error) {
      return {
        success: false,
        message: `I wasn't able to complete that: ${result.error.message}`,
      };
    }

    return {
      success: true,
      message: formatSuccessMessage(intent),
      data: result.data,
    };
  } catch (err) {
    console.error('[intent-classifier] execution failed:', err);
    return {
      success: false,
      message: "Something went wrong while processing your request. Please try again or contact support.",
    };
  }
}

function formatSuccessMessage(intent: ClassifiedIntent): string {
  const amountCents = intent.params.amountCents as number | undefined;
  const amount = amountCents ? `$${(amountCents / 100).toFixed(2)}` : '';

  switch (intent.intent) {
    case 'transfer_money':
      return `Done! I've transferred ${amount} for you.`;
    case 'pay_bill':
      return `Your payment of ${amount} has been scheduled.`;
    case 'send_p2p':
      return `Sent! ${amount} is on its way.`;
    case 'lock_card':
      return 'Your card has been locked. You can unlock it anytime.';
    case 'unlock_card':
      return 'Your card is now unlocked and ready to use.';
    case 'file_dispute':
      return 'Your dispute has been filed. We\'ll investigate and follow up within 10 business days.';
    case 'create_travel_notice':
      return 'Travel notice created! Your card is ready for your trip.';
    case 'create_savings_goal':
      return 'Savings goal created! I\'ll help you track your progress.';
    case 'set_spending_alert':
      return 'Alert set! I\'ll notify you when the threshold is reached.';
    default:
      return 'Done! Your request has been processed.';
  }
}
