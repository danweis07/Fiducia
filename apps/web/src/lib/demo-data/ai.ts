/**
 * Demo data for AI platform (chat, knowledge base, automation, insights, escalation, prompts).
 */

import { ActionHandler, pastDate } from "./types";

// =============================================================================
// HANDLERS
// =============================================================================

export const aiHandlers: Record<string, ActionHandler> = {
  // AI Chat
  "ai.platform.chat": (p) => ({
    reply: `I'd be happy to help with that! Based on your request, here's what I found for your account.`,
    conversationId: p.conversationId || "conv-demo-001",
    ...(p.message && typeof p.message === "string" && p.message.toLowerCase().includes("transfer")
      ? {
          intent: {
            type: "transfer_money",
            confidence: 0.92,
            parameters: { fromAccount: "checking", toAccount: "savings", amountCents: 20000 },
            confirmationMessage:
              "I'll transfer $200.00 from Checking (****1234) to Savings (****5678). Shall I proceed?",
          },
        }
      : {}),
  }),

  // Knowledge Base
  "ai.kb.upload": () => ({
    document: { id: "kb-doc-001", title: "Uploaded Document", status: "processing", chunkCount: 0 },
  }),
  "ai.kb.list": () => ({
    documents: [
      {
        id: "kb-doc-001",
        title: "Overdraft Protection Policy",
        category: "policies",
        status: "active",
        createdAt: pastDate(30),
      },
      {
        id: "kb-doc-002",
        title: "CD Rate Sheet — Q1 2026",
        category: "products",
        status: "active",
        createdAt: pastDate(15),
      },
      {
        id: "kb-doc-003",
        title: "Branch Hours & Holiday Schedule",
        category: "contact",
        status: "active",
        createdAt: pastDate(60),
      },
      {
        id: "kb-doc-004",
        title: "Reg E Dispute Process",
        category: "compliance",
        status: "active",
        createdAt: pastDate(45),
      },
      {
        id: "kb-doc-005",
        title: "Mobile App FAQ",
        category: "faqs",
        status: "active",
        createdAt: pastDate(10),
      },
    ],
  }),
  "ai.kb.delete": () => ({ success: true }),
  "ai.kb.search": () => ({
    results: [
      {
        content:
          "Our overdraft protection program automatically transfers funds from your linked savings account when your checking balance is insufficient...",
        documentId: "kb-doc-001",
        title: "Overdraft Protection Policy",
        similarity: 0.89,
      },
      {
        content:
          "Members enrolled in overdraft protection are not charged NSF fees for covered transactions...",
        documentId: "kb-doc-001",
        title: "Overdraft Protection Policy",
        similarity: 0.82,
      },
    ],
  }),
  "ai.kb.gaps": () => ({
    gaps: [
      {
        id: "gap-001",
        query: "What are the wire transfer cut-off times?",
        occurrenceCount: 12,
        lastAskedAt: pastDate(1),
        resolved: false,
      },
      {
        id: "gap-002",
        query: "How do I set up Zelle?",
        occurrenceCount: 8,
        lastAskedAt: pastDate(2),
        resolved: false,
      },
      {
        id: "gap-003",
        query: "What is the maximum mobile deposit amount?",
        occurrenceCount: 5,
        lastAskedAt: pastDate(3),
        resolved: true,
      },
    ],
  }),

  // Automation Rules
  "ai.automation.list": () => ({
    rules: [
      {
        id: "rule-001",
        name: "Round-Up Savings",
        description: "Round up every purchase to the nearest dollar and save the difference",
        triggerType: "transaction",
        status: "active",
        totalExecutions: 47,
        lastExecutedAt: pastDate(0),
      },
      {
        id: "rule-002",
        name: "Sweep Excess to Savings",
        description: "When checking goes above $5,000, sweep the excess into savings",
        triggerType: "balance_threshold",
        status: "active",
        totalExecutions: 3,
        lastExecutedAt: pastDate(7),
      },
      {
        id: "rule-003",
        name: "Save on Payday",
        description: "Every time I get a direct deposit, move 10% to savings",
        triggerType: "direct_deposit",
        status: "paused",
        totalExecutions: 12,
        lastExecutedAt: pastDate(14),
      },
    ],
  }),
  "ai.automation.create": (p) => ({
    rule: {
      id: "rule-new-001",
      name: "New Automation Rule",
      triggerType: "transaction",
      triggerConfig: {},
      actionType: "transfer",
      actionParams: {},
      ...(p as Record<string, unknown>),
    },
  }),
  "ai.automation.update": (p) => ({
    rule: { id: p.ruleId || "rule-001", status: (p.status as string) || "active" },
  }),
  "ai.automation.delete": () => ({ success: true }),
  "ai.automation.history": () => ({
    executions: [
      {
        id: "exec-001",
        status: "success",
        triggerEvent: { type: "transaction", amountCents: 425 },
        actionResult: { transferAmountCents: 75 },
        executedAt: pastDate(0),
      },
      {
        id: "exec-002",
        status: "success",
        triggerEvent: { type: "transaction", amountCents: 1350 },
        actionResult: { transferAmountCents: 50 },
        executedAt: pastDate(1),
      },
      {
        id: "exec-003",
        status: "failed",
        triggerEvent: { type: "transaction", amountCents: 890 },
        actionResult: null,
        executedAt: pastDate(2),
      },
    ],
  }),

  // Proactive Insights
  "ai.insights.list": () => ({
    insights: [
      {
        id: "insight-001",
        type: "overdraft_prediction",
        title: "Overdraft Risk Detected",
        message:
          "Your checking balance of $342.50 may not cover $580.00 in upcoming payments within the next 7 days.",
        severity: "warning",
        suggestedAction: {
          type: "transfer.create",
          label: "Transfer funds to checking",
          params: { suggestedAmountCents: 23750 },
        },
        status: "pending",
        createdAt: pastDate(0),
      },
      {
        id: "insight-002",
        type: "spending_anomaly",
        title: "Unusual Spending: Dining",
        message:
          'Your spending in "Dining" this week is $245.00, which is 2.8x your 4-week average of $87.50.',
        severity: "info",
        suggestedAction: {
          type: "transactions.filter",
          label: "View Dining transactions",
          params: { category: "dining" },
        },
        status: "pending",
        createdAt: pastDate(1),
      },
      {
        id: "insight-003",
        type: "savings_opportunity",
        title: "Savings Opportunity",
        message:
          "Your checking account has maintained a balance $3,200.00 above your estimated needs. Consider moving $3,000.00 to savings to earn interest.",
        severity: "positive",
        suggestedAction: {
          type: "transfer.create",
          label: "Move $3,000.00 to savings",
          params: { amountCents: 300000 },
        },
        status: "delivered",
        createdAt: pastDate(3),
      },
    ],
  }),
  "ai.insights.act": () => ({ success: true, actionResult: { transferId: "txf-demo-001" } }),
  "ai.insights.dismiss": () => ({ success: true }),
  "ai.insights.generate": () => ({
    insights: [
      {
        type: "savings_opportunity",
        title: "Savings Opportunity",
        message: "You could earn more interest by moving excess funds to savings.",
        severity: "positive",
      },
    ],
  }),

  // Escalation Queue
  "ai.escalations.queue": () => ({
    escalations: [
      {
        id: "esc-001",
        reason: "Member requested human agent",
        summary:
          "Member is frustrated about a disputed charge at Amazon for $89.99. AI could not resolve the dispute directly.",
        sentiment: "frustrated",
        priority: "high",
        status: "pending",
        assignedTo: null,
        createdAt: pastDate(0),
      },
      {
        id: "esc-002",
        reason: "Fraud detected",
        summary:
          "Member reports unauthorized transactions on their debit card. Card has been locked by AI assistant.",
        sentiment: "angry",
        priority: "urgent",
        status: "assigned",
        assignedTo: "staff-001",
        createdAt: pastDate(1),
      },
      {
        id: "esc-003",
        reason: "Complex loan inquiry",
        summary:
          "Member inquiring about refinancing options for their auto loan. Needs specialist consultation.",
        sentiment: "neutral",
        priority: "normal",
        status: "in_progress",
        assignedTo: "staff-002",
        createdAt: pastDate(2),
      },
    ],
  }),
  "ai.escalations.get": (p) => ({
    escalation: {
      id: p.escalationId || "esc-001",
      reason: "Member requested human agent",
      summary:
        "Member is frustrated about a disputed charge at Amazon for $89.99. AI could not resolve directly.",
      transcript: [
        { role: "user", content: "I need to dispute a charge on my account" },
        {
          role: "assistant",
          content: "I can help with that. Which transaction would you like to dispute?",
        },
        {
          role: "user",
          content: "The Amazon charge for $89.99 on March 10th. I never received the item.",
        },
        {
          role: "assistant",
          content:
            "I see the charge. Let me connect you with our disputes team who can process this for you.",
        },
      ],
      sentiment: "frustrated",
      priority: "high",
      status: "pending",
      resolutionNotes: null,
    },
  }),
  "ai.escalations.assign": () => ({ success: true }),
  "ai.escalations.resolve": () => ({ success: true }),

  // Prompt Management
  "ai.platform.prompts.list": () => ({
    prompts: [
      {
        id: "prompt-001",
        stakeholder: "member",
        name: "Member Banking Assistant",
        description: "Customer-facing chat assistant",
        isActive: true,
        version: 1,
      },
      {
        id: "prompt-002",
        stakeholder: "staff",
        name: "Staff Operations Assistant",
        description: "Internal assistant for CU staff",
        isActive: true,
        version: 1,
      },
      {
        id: "prompt-003",
        stakeholder: "marketing",
        name: "Marketing Content Assistant",
        description: "Content generation and compliance-aware copy",
        isActive: true,
        version: 1,
      },
      {
        id: "prompt-004",
        stakeholder: "audit",
        name: "Compliance & Audit Assistant",
        description: "Regulatory analysis and audit trail review",
        isActive: true,
        version: 1,
      },
    ],
  }),
  "ai.platform.prompts.update": (p) => ({ prompt: { id: p.promptId || "prompt-001", version: 2 } }),
  "ai.platform.prompts.test": () => ({
    reply: "This is a test response from the AI assistant using the configured prompt.",
    tokensUsed: 145,
  }),
};
