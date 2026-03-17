/**
 * Intelligent Escalation with Context Transfer
 *
 * Analyzes AI assistant conversations to generate rich context when
 * escalating to a human agent. Includes sentiment detection, priority
 * determination, issue categorization, and pre-filled form data.
 *
 * Uses the AI Services adapter for transcript analysis and summary
 * generation. Falls back to heuristic-based analysis when AI is unavailable.
 */

import type { AIServicesAdapter } from '../adapters/ai-services/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export type Sentiment = 'positive' | 'neutral' | 'frustrated' | 'angry';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type EscalationCategory =
  | 'dispute'
  | 'fraud'
  | 'account_closure'
  | 'technical'
  | 'general'
  | 'loan_inquiry'
  | 'fee_reversal'
  | 'account_access';

export interface EscalationContext {
  conversationId: string;
  userId: string;
  tenantId: string;
  transcript: Array<{ role: string; content: string; timestamp?: string }>;
  memberContext?: {
    accountCount: number;
    relationshipYears: number;
    totalBalanceCents: number;
    recentIssues: string[];
  };
}

export interface EscalationResult {
  summary: string;
  sentiment: Sentiment;
  priority: Priority;
  category: string;
  suggestedResolution: string;
  preFilled: Record<string, unknown>;
}

// =============================================================================
// SENTIMENT DETECTION (heuristic-based)
// =============================================================================

/**
 * Frustration markers — phrases and patterns indicating growing frustration.
 * Ordered roughly by escalating intensity.
 */
const FRUSTRATION_PATTERNS: RegExp[] = [
  /already tried/i,
  /doesn'?t work/i,
  /not working/i,
  /still (having|the same)/i,
  /this is (the )?(second|third|fourth|\d+(?:st|nd|rd|th)) time/i,
  /again and again/i,
  /how many times/i,
  /been waiting/i,
  /waste of time/i,
  /nobody (helps|can help|is helping)/i,
  /very (frustrated|annoyed|disappointed|upset)/i,
  /getting nowhere/i,
  /not helpful/i,
  /keep (getting|having|seeing)/i,
  /this is ridiculous/i,
];

/**
 * Anger markers — phrases and patterns indicating strong dissatisfaction or intent to leave.
 */
const ANGER_PATTERNS: RegExp[] = [
  /unacceptable/i,
  /terrible/i,
  /awful/i,
  /worst (service|experience|bank)/i,
  /closing my account/i,
  /cancel (my |everything|all)/i,
  /switch(ing)? (to another|banks)/i,
  /speak to (a |your )?(manager|supervisor)/i,
  /escalate this/i,
  /lawyer|attorney|legal action|sue/i,
  /report (you|this|to)/i,
  /filing a complaint/i,
  /consumer (financial )?protection/i,
  /better business bureau|bbb/i,
  /absolutely (unacceptable|ridiculous|terrible)/i,
  /sick (and tired|of this)/i,
];

/** Caps-heavy messages suggest shouting */
const CAPS_THRESHOLD = 0.6; // 60% of alpha chars are uppercase
const EXCLAMATION_THRESHOLD = 2; // 2+ exclamation marks in one message

/**
 * Detect the overall sentiment of a conversation transcript using
 * keyword and pattern analysis. Analyzes only member (user) messages.
 *
 * Returns the highest severity sentiment detected:
 *   angry > frustrated > neutral > positive
 */
export function detectSentiment(
  transcript: Array<{ role: string; content: string }>,
): Sentiment {
  const memberMessages = transcript
    .filter((m) => m.role === 'user')
    .map((m) => m.content);

  if (memberMessages.length === 0) return 'neutral';

  let frustrationScore = 0;
  let angerScore = 0;
  let positiveScore = 0;

  for (const message of memberMessages) {
    // Check frustration patterns
    for (const pattern of FRUSTRATION_PATTERNS) {
      if (pattern.test(message)) {
        frustrationScore++;
      }
    }

    // Check anger patterns
    for (const pattern of ANGER_PATTERNS) {
      if (pattern.test(message)) {
        angerScore++;
      }
    }

    // Check for heavy capitalization (shouting)
    const alphaChars = message.replace(/[^a-zA-Z]/g, '');
    if (alphaChars.length > 10) {
      const upperRatio = (message.replace(/[^A-Z]/g, '').length) / alphaChars.length;
      if (upperRatio >= CAPS_THRESHOLD) {
        angerScore++;
      }
    }

    // Check for multiple exclamation marks
    const exclamationCount = (message.match(/!/g) ?? []).length;
    if (exclamationCount >= EXCLAMATION_THRESHOLD) {
      frustrationScore++;
    }

    // Check positive signals
    if (/thank(s| you)/i.test(message) || /great|perfect|awesome|excellent/i.test(message)) {
      positiveScore++;
    }
  }

  // Determine overall sentiment based on scores
  if (angerScore >= 2) return 'angry';
  if (angerScore >= 1 && frustrationScore >= 1) return 'angry';
  if (frustrationScore >= 2) return 'frustrated';
  if (frustrationScore >= 1) return 'frustrated';
  if (positiveScore > 0 && frustrationScore === 0 && angerScore === 0) return 'positive';

  return 'neutral';
}

// =============================================================================
// PRIORITY DETERMINATION
// =============================================================================

/**
 * Categories that are inherently higher priority regardless of sentiment.
 */
const HIGH_PRIORITY_CATEGORIES: string[] = ['fraud', 'account_closure'];
const ELEVATED_PRIORITY_CATEGORIES: string[] = ['dispute', 'account_access'];

/**
 * Determine escalation priority based on sentiment, category, and member context.
 *
 * Priority factors:
 *   1. Sentiment (angry/frustrated raises priority)
 *   2. Category (fraud/account_closure are inherently urgent)
 *   3. Member value (long relationship, high balance raises priority)
 *   4. Recent repeat issues (raises priority)
 */
export function determinePriority(
  sentiment: string,
  category: string,
  memberContext?: {
    accountCount?: number;
    relationshipYears?: number;
    totalBalanceCents?: number;
    recentIssues?: string[];
  },
): Priority {
  let score = 0;

  // Sentiment scoring
  switch (sentiment) {
    case 'angry':
      score += 3;
      break;
    case 'frustrated':
      score += 2;
      break;
    case 'neutral':
      score += 0;
      break;
    case 'positive':
      score -= 1;
      break;
  }

  // Category scoring
  if (HIGH_PRIORITY_CATEGORIES.includes(category)) {
    score += 3;
  } else if (ELEVATED_PRIORITY_CATEGORIES.includes(category)) {
    score += 1;
  }

  // Member context scoring
  if (memberContext) {
    // Long-standing members get higher priority
    if (typeof memberContext.relationshipYears === 'number' && memberContext.relationshipYears >= 5) {
      score += 1;
    }

    // High-value members get higher priority (>$50,000 total balance)
    if (typeof memberContext.totalBalanceCents === 'number' && memberContext.totalBalanceCents >= 5000000) {
      score += 1;
    }

    // Repeat issues bump priority
    if (memberContext.recentIssues && memberContext.recentIssues.length >= 2) {
      score += 1;
    }
  }

  // Map score to priority
  if (score >= 5) return 'urgent';
  if (score >= 3) return 'high';
  if (score >= 1) return 'normal';
  return 'low';
}

// =============================================================================
// ISSUE CATEGORIZATION (heuristic fallback)
// =============================================================================

const CATEGORY_KEYWORDS: Record<EscalationCategory, RegExp[]> = {
  fraud: [
    /fraud/i,
    /unauthorized/i,
    /didn'?t (make|authorize|recogni[sz]e)/i,
    /stolen/i,
    /scam/i,
    /identity theft/i,
    /suspicious/i,
    /compromised/i,
  ],
  dispute: [
    /dispute/i,
    /charg(e\s?)?back/i,
    /wrong (amount|charge)/i,
    /overcharged/i,
    /double charged/i,
    /didn'?t receive/i,
    /never got/i,
    /refund/i,
    /return/i,
  ],
  account_closure: [
    /clos(e|ing) (my |the )?account/i,
    /cancel/i,
    /leaving/i,
    /switch(ing)? bank/i,
    /moving my money/i,
  ],
  account_access: [
    /locked out/i,
    /can'?t (log ?in|access|sign in|get in)/i,
    /password (reset|forgot|expired)/i,
    /two[- ]?factor/i,
    /mfa/i,
    /verification/i,
    /frozen account/i,
  ],
  technical: [
    /error/i,
    /bug/i,
    /crash/i,
    /not loading/i,
    /app (is )?(down|broken|not working)/i,
    /website (is )?(down|broken|not working)/i,
    /glitch/i,
    /screen/i,
    /timeout/i,
  ],
  loan_inquiry: [
    /loan/i,
    /mortgage/i,
    /interest rate/i,
    /apr/i,
    /refinanc/i,
    /pre[- ]?approv/i,
    /credit (line|limit)/i,
  ],
  fee_reversal: [
    /fee/i,
    /overdraft/i,
    /nsf/i,
    /late (fee|charge|payment)/i,
    /service charge/i,
    /monthly (fee|charge)/i,
    /waive/i,
    /reverse/i,
  ],
  general: [],
};

function categorizeFromTranscript(
  transcript: Array<{ role: string; content: string }>,
): EscalationCategory {
  const fullText = transcript.map((m) => m.content).join(' ');
  const scores: Record<string, number> = {};

  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'general') continue;
    scores[category] = 0;
    for (const pattern of patterns) {
      if (pattern.test(fullText)) {
        scores[category]++;
      }
    }
  }

  const topCategory = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (topCategory && topCategory[1] > 0) {
    return topCategory[0] as EscalationCategory;
  }

  return 'general';
}

// =============================================================================
// PRE-FILLED FORM DATA
// =============================================================================

/**
 * Extract data from the transcript that can pre-fill forms for the agent.
 * For example, a dispute form needs the transaction date, amount, and merchant.
 */
function extractPreFilledData(
  category: EscalationCategory,
  transcript: Array<{ role: string; content: string }>,
): Record<string, unknown> {
  const fullText = transcript.map((m) => m.content).join(' ');
  const preFilled: Record<string, unknown> = {};

  // Extract dollar amounts mentioned
  const amountMatches = fullText.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (amountMatches && amountMatches.length > 0) {
    preFilled.mentionedAmounts = amountMatches.map((a) =>
      Math.round(parseFloat(a.replace(/[$,]/g, '')) * 100)
    );
  }

  // Extract dates mentioned
  const dateMatches = fullText.match(
    /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:[,\s]+\d{4})?\b/gi
  );
  if (dateMatches && dateMatches.length > 0) {
    preFilled.mentionedDates = dateMatches;
  }

  // Category-specific extraction
  switch (category) {
    case 'dispute': {
      preFilled.formType = 'transaction_dispute';
      // Try to extract merchant name near "at" or "from"
      const merchantMatch = fullText.match(/(?:at|from|by|charged by)\s+([A-Z][\w\s&'.]+?)(?:\s+(?:for|on|was|charged)|\.|,|$)/i);
      if (merchantMatch) {
        preFilled.merchantName = merchantMatch[1].trim();
      }
      break;
    }

    case 'fraud': {
      preFilled.formType = 'fraud_report';
      preFilled.requiresCardReplacement = /card/i.test(fullText);
      preFilled.requiresAccountFreeze = /freeze|lock|block/i.test(fullText);
      break;
    }

    case 'fee_reversal': {
      preFilled.formType = 'fee_reversal_request';
      const feeTypeMatch = fullText.match(/(overdraft|nsf|late|service|monthly|maintenance)\s*(fee|charge)/i);
      if (feeTypeMatch) {
        preFilled.feeType = feeTypeMatch[1].toLowerCase();
      }
      break;
    }

    case 'account_closure': {
      preFilled.formType = 'account_closure';
      break;
    }

    default:
      break;
  }

  return preFilled;
}

// =============================================================================
// AI-POWERED ESCALATION ANALYSIS
// =============================================================================

function buildEscalationPrompt(ctx: EscalationContext): string {
  const transcriptText = ctx.transcript
    .map((m) => `[${m.role}]: ${m.content}`)
    .join('\n');

  const memberInfo = ctx.memberContext
    ? `\nMember context:
- Accounts: ${ctx.memberContext.accountCount}
- Relationship: ${ctx.memberContext.relationshipYears} years
- Total balance: $${(ctx.memberContext.totalBalanceCents / 100).toFixed(2)}
- Recent issues: ${ctx.memberContext.recentIssues.length > 0 ? ctx.memberContext.recentIssues.join(', ') : 'none'}`
    : '';

  return `You are an escalation analyst for a digital banking platform. A customer conversation with an AI assistant is being escalated to a human agent. Analyze the conversation and provide a structured handoff summary.

Conversation transcript:
${transcriptText}
${memberInfo}

Respond with a JSON object containing exactly these fields:
- summary (string): A concise 2-3 sentence summary for the human agent, highlighting the core issue and what has already been tried. Do not include PII.
- category (string): One of: dispute, fraud, account_closure, technical, general, loan_inquiry, fee_reversal, account_access
- suggestedResolution (string): A recommended next step or resolution approach for the agent, based on common banking procedures.

Respond ONLY with valid JSON. No markdown, no explanation, no code blocks.`;
}

/**
 * Analyze a conversation for escalation to a human agent.
 *
 * Combines AI-powered transcript analysis with heuristic sentiment detection
 * and priority determination. The AI generates the summary and suggested
 * resolution, while sentiment and priority use deterministic logic for
 * consistency and auditability.
 */
export async function analyzeEscalation(
  ctx: EscalationContext,
  adapter: AIServicesAdapter,
): Promise<EscalationResult> {
  if (!ctx.transcript || ctx.transcript.length === 0) {
    throw new Error('Escalation context must include at least one transcript message');
  }

  // Heuristic-based analysis (deterministic, auditable)
  const sentiment = detectSentiment(ctx.transcript);
  const heuristicCategory = categorizeFromTranscript(ctx.transcript);

  // AI-powered analysis for summary, category refinement, and suggested resolution
  let aiSummary: string;
  let aiCategory: string;
  let aiSuggestedResolution: string;

  try {
    const aiResult = await adapter.completeJSON<{
      summary: string;
      category: string;
      suggestedResolution: string;
    }>({
      messages: [
        { role: 'system', content: buildEscalationPrompt(ctx) },
        { role: 'user', content: 'Analyze this escalation.' },
      ],
      temperature: 0.2,
      maxTokens: 1024,
      jsonResponse: true,
      trace: {
        name: 'escalation.analyze',
        metadata: {
          conversationId: ctx.conversationId,
          tenantId: ctx.tenantId,
          messageCount: ctx.transcript.length,
        },
        sessionId: ctx.conversationId,
        userId: ctx.userId,
      },
    });

    aiSummary = aiResult.summary ?? '';
    aiCategory = aiResult.category ?? heuristicCategory;
    aiSuggestedResolution = aiResult.suggestedResolution ?? '';
  } catch {
    // Fall back to heuristic-only analysis if AI is unavailable
    aiSummary = buildFallbackSummary(ctx.transcript);
    aiCategory = heuristicCategory;
    aiSuggestedResolution = buildFallbackResolution(heuristicCategory);
  }

  // Use AI category if valid, otherwise fall back to heuristic
  const validCategories = [
    'dispute', 'fraud', 'account_closure', 'technical',
    'general', 'loan_inquiry', 'fee_reversal', 'account_access',
  ];
  const category = validCategories.includes(aiCategory) ? aiCategory : heuristicCategory;

  const priority = determinePriority(sentiment, category, ctx.memberContext);
  const preFilled = extractPreFilledData(category as EscalationCategory, ctx.transcript);

  return {
    summary: aiSummary,
    sentiment,
    priority,
    category,
    suggestedResolution: aiSuggestedResolution,
    preFilled,
  };
}

// =============================================================================
// FALLBACK HELPERS
// =============================================================================

/**
 * Generate a basic summary when AI is unavailable.
 */
function buildFallbackSummary(
  transcript: Array<{ role: string; content: string }>,
): string {
  const memberMessages = transcript.filter((m) => m.role === 'user');
  const messageCount = memberMessages.length;

  if (messageCount === 0) {
    return 'Member requested escalation to a human agent.';
  }

  // Use the first and last member messages to frame the summary
  const firstMessage = memberMessages[0].content.slice(0, 150);
  const lastMessage = memberMessages[memberMessages.length - 1].content.slice(0, 150);

  if (messageCount === 1) {
    return `Member contacted support regarding: "${firstMessage}". Escalating after initial interaction.`;
  }

  return `Member initially reported: "${firstMessage}". After ${messageCount} messages, their latest concern is: "${lastMessage}".`;
}

/**
 * Provide a generic resolution suggestion based on category when AI is unavailable.
 */
function buildFallbackResolution(category: EscalationCategory): string {
  switch (category) {
    case 'fraud':
      return 'Verify recent transactions with the member. If confirmed unauthorized, initiate fraud claim, freeze affected card, and issue replacement. File SAR if applicable.';
    case 'dispute':
      return 'Review the disputed transaction details. Gather merchant name, date, and amount. Initiate chargeback process per Reg E timeline requirements.';
    case 'account_closure':
      return 'Attempt retention conversation. If member proceeds, verify zero balances, pending transactions, and linked services before processing closure.';
    case 'account_access':
      return 'Verify member identity through security questions. Reset credentials or unlock account as appropriate. Check for suspicious login attempts.';
    case 'technical':
      return 'Gather device type, OS version, and app version. Check known issues board. Escalate to engineering if not a known issue.';
    case 'fee_reversal':
      return 'Review account history for the fee in question. Check fee reversal eligibility per policy. Process reversal if within guidelines.';
    case 'loan_inquiry':
      return 'Transfer to loan specialist. Provide pre-qualification details if available from member profile.';
    case 'general':
    default:
      return 'Review the conversation transcript and address the member\'s specific needs. Check if any previous tickets are related.';
  }
}
