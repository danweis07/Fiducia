/**
 * Gateway Route Map
 *
 * Maps action strings to handler functions.
 * Single source of truth for every route the gateway supports.
 */

import type { Handler } from './core.ts';

// Handlers
import { createLinkToken, exchangeToken, listExternalAccounts, getExternalBalances, getExternalTransactions } from './routes/external-accounts.ts';
import { enhanceTransaction, batchEnrichTransactions } from './handlers/enrichment.ts';
import { evaluateKYC, getKYCStatus, refreshKYC, configureKYCRefresh } from './handlers/kyc.ts';
import { screenAML, getAMLScreening, listAMLMonitoring, updateAMLMonitoring, listAMLAlerts, reviewAMLAlert } from './handlers/aml-screening.ts';
import { getActivationConfig, verifyIdentity, acceptTerms, createCredentials, enrollMFA, verifyMFA, registerDevice, completeActivation, getTermsDocuments, createTermsVersion, getTermsAcceptances, checkTermsStatus } from './handlers/activation.ts';
import { listAccounts, getAccount, getAccountSummary, listTransactions, getTransaction, searchTransactions, createTransfer, scheduleTransfer, cancelTransfer, listTransfers, listBeneficiaries, createBeneficiary, deleteBeneficiary, listBills, createBill, payBill, cancelBill, submitDeposit, getDepositStatus, listDepositHistory, listCards, lockCard, unlockCard, setCardLimit, listStatements, getStatement, getStatementConfig, downloadStatement, listNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount, getCapabilities, getTenantTheme } from './handlers/banking.ts';
import { searchLocations } from './handlers/locations.ts';
import { getPasswordPolicy, updatePasswordPolicy } from './handlers/password-policy.ts';
import { listAddresses, updateAddress, listDocuments as listMemberDocuments, listIdentifiers, listAccountProducts, getAccountProduct, listLoanProducts, listLoans, getLoan, getLoanSchedule, listLoanPayments, makeLoanPayment, listChargeDefinitions, listCharges, listStandingInstructions, createStandingInstruction, updateStandingInstruction, getCDMaturity, updateCDMaturityAction } from './handlers/consumer-banking.ts';
import { listProviders, listConnected, connectWithApiKey, disconnectIntegration, getIntegrationHealth, getSyncLogs } from './handlers/integrations.ts';
import { healthCheck } from './handlers/health.ts';
import { listChannels, updateChannel, listContent, getContent, createContent, updateContent, deleteContent, publishContent, archiveContent, getContentVersions, listTokens, createToken, revokeToken, getPublicContent, listPublicContent } from './handlers/cms.ts';
import { suspendUser, activateUser, resetUserPassword, inviteUser } from './handlers/admin-users.ts';
import { updateBranding, getDesignSystem, updateDesignSystem } from './handlers/admin-branding.ts';
import { listKycReviews, approveKyc, rejectKyc, listAmlAlerts, updateAmlStatus, listGdprRequests, updateGdprStatus } from './handlers/admin-compliance.ts';
import { getAccountGrowth, getTransactionVolume, getDepositTrends, getKeyMetrics } from './handlers/admin-analytics.ts';
import { listExperiments, getExperiment, createExperiment, updateExperiment, startExperiment, pauseExperiment, resumeExperiment, completeExperiment, getAssignment, trackEvent, getResults } from './handlers/experiments.ts';
import { searchBillers, enrollPayee, listPayees, schedulePayment, cancelPayment as cancelBillPayment, getPaymentStatus, listPayments, listEBills } from './handlers/bill-pay.ts';
import { enrichTransactions as enrichFinancialTransactions, getSpendingSummary, getMonthlyTrends, listBudgets, setBudget, getNetWorth, getNetWorthHistory, getRecurringTransactions } from './handlers/financial-data.ts';
import { listOffers, activateOffer, deactivateOffer, listRedemptions, getOfferSummary } from './handlers/card-offers.ts';
import { getAccountOpeningConfig, createAccountOpeningApplication, getAccountOpeningApplication, selectAccountOpeningProducts, submitAccountOpeningFunding, completeAccountOpeningApplication, cancelAccountOpeningApplication } from './handlers/account-opening.ts';
import { listSsoProviders, getSsoProvider, createSsoProvider, updateSsoProvider, deleteSsoProvider, testSsoConnection } from './handlers/sso.ts';
import { sendMessage, getSuggestions, submitFeedback, escalateToHuman } from './handlers/ai-chat.ts';
import { sendAssistantMessage, listPrompts, updatePrompt, getConversationHistory } from './handlers/ai-assistant.ts';
import { listExports, createExport, getExport, downloadExport, deleteExport, getExportSummary, listReportTemplates, createReportTemplate, updateReportTemplate, deleteReportTemplate } from './handlers/data-export.ts';
import { getNotificationPreferences, updateNotificationPreferences, testNotification } from './handlers/notification-preferences.ts';
import { listSessions, revokeSession, revokeAllSessions, getSessionActivity } from './handlers/sessions.ts';
import { getOnboardingStatus, updateOnboardingStep, completeOnboarding, resetOnboarding } from './handlers/tenant-onboarding.ts';
import { listRoles, createRole, updateRole, deleteRole, assignRole, getUserPermissions } from './handlers/rbac.ts';
import { listWebhookEndpoints, createWebhookEndpoint, updateWebhookEndpoint, deleteWebhookEndpoint, listDeliveries, getDeadLetterQueue, retryDelivery, getWebhookStats } from './handlers/webhooks.ts';
import { listThreads, getThread, createThread, replyToThread, markThreadRead, archiveThread, listDepartments, getUnreadMessageCount } from './handlers/secure-messaging.ts';
import { fileDispute, listDisputes, getDispute, addDisputeDocument, cancelDispute, getDisputeTimeline } from './handlers/disputes.ts';
import { listCheckStyles, getCheckOrderConfig, createCheckOrder, listCheckOrders, getCheckOrder, cancelCheckOrder } from './handlers/check-orders.ts';
import { listEmployers, initiateSwitch, getSwitchStatus, listSwitches, cancelSwitch, confirmSwitch } from './handlers/direct-deposit.ts';
import { createTravelNotice, listTravelNotices, cancelTravelNotice, requestCardReplacement, listCardReplacements, getCardReplacementStatus, activateReplacementCard } from './handlers/card-services.ts';
import { listDevices, getDevice, renameDevice, removeDevice, getDeviceActivity, trustDevice, untrustDevice } from './handlers/devices.ts';
import { createDomesticWire, createInternationalWire, listWires, getWire, cancelWire, getWireFees, getWireLimits } from './handlers/wire-transfers.ts';
import { createStopPayment, listStopPayments, getStopPayment, cancelStopPayment, renewStopPayment, getStopPaymentFee } from './handlers/stop-payments.ts';
import { enrollP2P, getP2PEnrollment, unenrollP2P, sendP2P, requestP2P, listP2PTransactions, getP2PTransaction, cancelP2PRequest, getP2PLimits } from './handlers/p2p.ts';
import { listSavingsGoals, createSavingsGoal, getSavingsGoal, updateSavingsGoal, deleteSavingsGoal, contributeToGoal, withdrawFromGoal, getGoalSummary } from './handlers/savings-goals.ts';
import { listJointOwners, addJointOwner, removeJointOwner, updateJointOwnerPermissions, listPendingInvitations, acceptInvitation, declineInvitation, getJointAccountSummary } from './handlers/joint-accounts.ts';
import { getOverdraftSettings, updateOverdraftSettings, getOverdraftHistory, getOverdraftFeeSchedule } from './handlers/overdraft.ts';
import { listAlerts, createAlert, updateAlert, deleteAlert, listAlertHistory, getAlertSummary } from './handlers/spending-alerts.ts';
import { listVaultDocuments, uploadDocument, getVaultDocument, updateVaultDocument, deleteVaultDocument, getVaultSummary, searchVaultDocuments } from './handlers/document-vault.ts';
import { getLoanApplication, createLoanApplication, getLoanDocument, createLoanDocument, updateLoanDocument } from './handlers/loan-origination.ts';
import { getProvisioningConfig, checkProvisioningEligibility, initiateProvisioning, completeProvisioning, getCardCredentials, setTemporaryExpiration, requestDigitalOnlyCard, requestPhysicalCard, reportAndReplaceCard } from './handlers/card-provisioning.ts';
import { syncEvidence, reportIncident, getComplianceAuditStatus, listComplianceSyncHistory, testComplianceConnection } from './handlers/compliance-audit.ts';
import { conversationalChat, kbUploadDocument, kbListDocuments, kbDeleteDocument, kbSearch, kbGetGaps, listAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, getAutomationHistory, getInsights, actOnInsight, dismissInsight, generateInsights as generateInsightsHandler, getEscalationQueue, getEscalation, assignEscalation, resolveEscalation, listSystemPrompts, updateSystemPrompt, testPrompt } from './handlers/ai-platform.ts';
import { listServiceAccounts, createServiceAccount, updateServiceAccount, revokeServiceAccount, listExecutionPolicies, upsertExecutionPolicy, deleteExecutionPolicy, listAutonomousExecutions, approveExecution, rejectExecution, getExecutionStats, listEventInbox, toggleAutonomous, triggerExecutor } from './handlers/admin-autonomous.ts';
import { resolveScreen, getCurrentPersona, listPersonas, createPersona, updatePersona, deletePersona, listManifests, getManifest, createManifest, updateManifest, deleteManifest } from './handlers/sdui.ts';
import { getCDPConfig, updateCDPConfig, listCDPDestinations, createCDPDestination, updateCDPDestination, deleteCDPDestination, listRecentCDPEvents, getCDPEventSummary } from './handlers/admin-cdp.ts';
import { listConsents, getConsent, grantConsent, revokeConsent, listAccessLogs, getConsentSummary } from './handlers/open-banking.ts';
import { listInternationalConsents, getInternationalConsent, revokeInternationalConsent, revokeInternationalConsentScope, listInternationalConsentAccessLogs, getInternationalConsentSummary, getSCAConfig, createSCAChallenge, verifySCAFactor, listSCATrustedDevices, bindSCADevice, unbindSCADevice, listEKYCProviders, initiateEKYC, getEKYCStatus, startLivenessCheck, completeLivenessCheck, listEKYCVerifications, listPaymentAliases, createPaymentAlias, deletePaymentAlias, confirmPayee, sendInternationalPayment, parseQRPayment, generateQRPayment, listInternationalPayments, getInternationalPaymentLimits, listOpenFinanceConnections, createOpenFinanceConnection, refreshOpenFinanceConnection, removeOpenFinanceConnection, listOpenFinanceAccounts, getOpenFinanceNetWorth, getAlternativeCreditData } from './handlers/international-compliance.ts';
import { searchAggregatorInstitutions, createAggregatorConnection, handleAggregatorCallback, listAggregatorConnections, refreshAggregatorConnection, removeAggregatorConnection, listAggregatedAccounts, listAggregatedTransactions } from './handlers/aggregator.ts';
import { analyzeInvoice, confirmInvoice, listInvoices, getInvoice, cancelInvoice } from './handlers/invoice-processor.ts';
import { getCashFlowForecast } from './handlers/cash-flow.ts';
import { listTreasuryVaults, createTreasuryVault, closeTreasuryVault, getTreasurySummary } from './handlers/treasury.ts';
import { sendInstantPayment, getInstantPayment, listInstantPayments, checkInstantPaymentReceiver, sendRequestForPayment, exportPaymentISO20022, getInstantPaymentLimits } from './handlers/instant-payments.ts';
import { listSweepRules, createSweepRule, updateSweepRule, deleteSweepRule, toggleSweepRule, listSweepExecutions, getSweepSummary } from './handlers/cash-sweeps.ts';
import { getInternationalCoverage, getFXQuote, createInternationalPayment, getInternationalPayment, listInternationalPayments, issueGlobalCard, listGlobalCards, createInternationalPayout, listInternationalPayouts } from './handlers/international-payments.ts';
import { searchInternationalBillers, payInternationalBill, getInternationalBillPayment, listInternationalBillPayments, getInternationalBillPayCountries } from './handlers/international-bill-pay.ts';
import { createInternationalLoanApplication, getInternationalLoanApplication, listInternationalLoanApplications, getInternationalCreditAssessment, getInternationalComplianceChecks } from './handlers/international-loans.ts';
import { listBaaSAccounts, createBaaSAccount, getBaaSAccount, initiateBaaSPayment, getBaaSKYCStatus, getBaaSComplianceStatus } from './handlers/baas.ts';
import { listApprovalRequests, getApprovalRequest, approveRequest, denyRequest, cancelRequest, listApprovalPolicies, createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy, getApprovalSummary } from './handlers/jit-permissions.ts';
import { resolveAlias, payByAlias, listInboundR2P, respondToR2P, sendR2P, listOutboundR2P, getSupportedDirectories } from './handlers/alias-payments.ts';
import { listCurrencyPots, createCurrencyPot, getCurrencyPot, closeCurrencyPot, generateVIBAN, getSwapQuote, executeSwap, listSwaps, getSafeguardingInfo, listInterestWithholding, getCarbonFootprint, getCarbonSummary } from './handlers/multi-currency.ts';
import { verifyPayee, getVerification } from './handlers/confirmation-of-payee.ts';
import { initiateChallenge, completeChallenge, checkExemption } from './handlers/sca.ts';
import { requestDataPortability, getDataResidency, getLoanCoolingOff, exerciseLoanWithdrawal, getInterestWithholding } from './handlers/global-compliance.ts';

// =============================================================================
// ROUTE MAP
// =============================================================================

export const routes: Record<string, Handler> = {
  // External Accounts (Plaid)
  'external-accounts.link-token':    createLinkToken,
  'external-accounts.exchange':      exchangeToken,
  'external-accounts.list':          listExternalAccounts,
  'external-accounts.balances':      getExternalBalances,
  'external-accounts.transactions':  getExternalTransactions,

  // Transaction Enrichment (MX Platform)
  'enrichment.enhance':         enhanceTransaction,
  'enrichment.batch':           batchEnrichTransactions,

  // KYC Identity Verification (Alloy / LexisNexis)
  'kyc.evaluate':               evaluateKYC,
  'kyc.status':                 getKYCStatus,
  'kyc.refresh':                refreshKYC,
  'kyc.configureRefresh':       configureKYCRefresh,

  // AML Screening — Global Watchlists (ComplyAdvantage / LexisNexis)
  'aml.screen':                 screenAML,
  'aml.getScreening':           getAMLScreening,
  'aml.monitoring.list':        listAMLMonitoring,
  'aml.monitoring.update':      updateAMLMonitoring,
  'aml.alerts.list':            listAMLAlerts,
  'aml.alerts.review':          reviewAMLAlert,

  // Accounts
  'accounts.list':              listAccounts,
  'accounts.get':               getAccount,
  'accounts.summary':           getAccountSummary,

  // Transactions
  'transactions.list':          listTransactions,
  'transactions.get':           getTransaction,
  'transactions.search':        searchTransactions,

  // Transfers
  'transfers.create':           createTransfer,
  'transfers.schedule':         scheduleTransfer,
  'transfers.cancel':           cancelTransfer,
  'transfers.list':             listTransfers,

  // Beneficiaries
  'beneficiaries.list':         listBeneficiaries,
  'beneficiaries.create':       createBeneficiary,
  'beneficiaries.delete':       deleteBeneficiary,

  // Bill Pay
  'bills.list':                 listBills,
  'bills.create':               createBill,
  'bills.pay':                  payBill,
  'bills.cancel':               cancelBill,

  // Remote Deposit Capture (RDC)
  'rdc.deposit':                submitDeposit,
  'rdc.status':                 getDepositStatus,
  'rdc.history':                listDepositHistory,

  // Cards
  'cards.list':                 listCards,
  'cards.lock':                 lockCard,
  'cards.unlock':               unlockCard,
  'cards.setLimit':             setCardLimit,

  // Account Statements
  'statements.list':            listStatements,
  'statements.get':             getStatement,
  'statements.config':          getStatementConfig,
  'statements.download':        downloadStatement,

  // Notifications
  'notifications.list':         listNotifications,
  'notifications.markRead':     markNotificationRead,
  'notifications.markAllRead':  markAllNotificationsRead,
  'notifications.unreadCount':  getUnreadCount,

  // Config (Backend-Driven UI)
  'config.capabilities':        getCapabilities,
  'config.theme':               getTenantTheme,

  // Password Policy (admin-managed)
  'passwordPolicy.get':         getPasswordPolicy,
  'passwordPolicy.update':      updatePasswordPolicy,

  // Member Profile
  'member.addresses':             listAddresses,
  'member.updateAddress':         updateAddress,
  'member.documents':             listMemberDocuments,
  'member.identifiers':           listIdentifiers,

  // Account Products
  'accountProducts.list':         listAccountProducts,
  'accountProducts.get':          getAccountProduct,

  // CD Maturity
  'cd.maturity':                  getCDMaturity,
  'cd.updateMaturityAction':      updateCDMaturityAction,

  // Loan Products
  'loanProducts.list':            listLoanProducts,

  // Loan Origination (LoanVantage)
  'loanOrigination.application.get':      getLoanApplication,
  'loanOrigination.application.create':   createLoanApplication,
  'loanOrigination.document.get':         getLoanDocument,
  'loanOrigination.document.create':      createLoanDocument,
  'loanOrigination.document.update':      updateLoanDocument,

  // Loans
  'loans.list':                   listLoans,
  'loans.get':                    getLoan,
  'loans.schedule':               getLoanSchedule,
  'loans.payments':               listLoanPayments,
  'loans.makePayment':            makeLoanPayment,

  // Charges & Fees
  'charges.definitions':          listChargeDefinitions,
  'charges.list':                 listCharges,

  // Standing Instructions
  'standingInstructions.list':    listStandingInstructions,
  'standingInstructions.create':  createStandingInstruction,
  'standingInstructions.update':  updateStandingInstruction,

  // Digital Activation (existing member enrollment)
  'activation.config':            getActivationConfig,
  'activation.verifyIdentity':    verifyIdentity,
  'activation.acceptTerms':       acceptTerms,
  'activation.createCredentials': createCredentials,
  'activation.enrollMFA':         enrollMFA,
  'activation.verifyMFA':         verifyMFA,
  'activation.registerDevice':    registerDevice,
  'activation.complete':          completeActivation,
  'activation.getTerms':          getTermsDocuments,
  'activation.createTermsVersion': createTermsVersion,
  'activation.getTermsAcceptances': getTermsAcceptances,
  'activation.checkTermsStatus':  checkTermsStatus,

  // ATM / Branch Locator
  'locations.search':         searchLocations,

  // Integrations
  'integrations.providers':   listProviders,
  'integrations.connected':   listConnected,
  'integrations.connect':     connectWithApiKey,
  'integrations.disconnect':  disconnectIntegration,
  'integrations.health':      getIntegrationHealth,
  'integrations.syncLogs':    getSyncLogs,

  // CMS — Channels
  'cms.channels.list':        listChannels,
  'cms.channels.update':      updateChannel,

  // CMS — Content
  'cms.content.list':         listContent,
  'cms.content.get':          getContent,
  'cms.content.create':       createContent,
  'cms.content.update':       updateContent,
  'cms.content.delete':       deleteContent,
  'cms.content.publish':      publishContent,
  'cms.content.archive':      archiveContent,
  'cms.content.versions':     getContentVersions,

  // CMS — API Tokens
  'cms.tokens.list':          listTokens,
  'cms.tokens.create':        createToken,
  'cms.tokens.revoke':        revokeToken,

  // Experiments — A/B Testing
  'experiments.list':         listExperiments,
  'experiments.get':          getExperiment,
  'experiments.create':       createExperiment,
  'experiments.update':       updateExperiment,
  'experiments.start':        startExperiment,
  'experiments.pause':        pauseExperiment,
  'experiments.resume':       resumeExperiment,
  'experiments.complete':     completeExperiment,
  'experiments.assign':       getAssignment,
  'experiments.track':        trackEvent,
  'experiments.results':      getResults,

  // Bill Pay (adapter-backed)
  'billpay.billers.search':       searchBillers,
  'billpay.payees.list':          listPayees,
  'billpay.payees.enroll':        enrollPayee,
  'billpay.payments.schedule':    schedulePayment,
  'billpay.payments.cancel':      cancelBillPayment,
  'billpay.payments.status':      getPaymentStatus,
  'billpay.payments.list':        listPayments,
  'billpay.ebills.list':          listEBills,

  // Financial Data & Insights (adapter-backed)
  'financial.enrich':             enrichFinancialTransactions,
  'financial.spending':           getSpendingSummary,
  'financial.trends':             getMonthlyTrends,
  'financial.budgets.list':       listBudgets,
  'financial.budgets.set':        setBudget,
  'financial.networth':           getNetWorth,
  'financial.networth.history':   getNetWorthHistory,
  'financial.recurring':          getRecurringTransactions,

  // Card Provisioning — Digital Wallets & Digital Issuance (adapter-backed)
  'cardProvisioning.config':              getProvisioningConfig,
  'cardProvisioning.checkEligibility':    checkProvisioningEligibility,
  'cardProvisioning.initiate':            initiateProvisioning,
  'cardProvisioning.complete':            completeProvisioning,
  'cardProvisioning.credentials':         getCardCredentials,
  'cardProvisioning.setTempExpiration':   setTemporaryExpiration,
  'cardProvisioning.digitalOnly':         requestDigitalOnlyCard,
  'cardProvisioning.requestPhysical':     requestPhysicalCard,
  'cardProvisioning.reportReplace':       reportAndReplaceCard,

  // Card-Linked Offers (adapter-backed)
  'offers.list':                  listOffers,
  'offers.activate':              activateOffer,
  'offers.deactivate':            deactivateOffer,
  'offers.redemptions':           listRedemptions,
  'offers.summary':               getOfferSummary,

  // Account Opening
  'account-opening.config':         getAccountOpeningConfig,
  'account-opening.create':         createAccountOpeningApplication,
  'account-opening.get':            getAccountOpeningApplication,
  'account-opening.selectProducts': selectAccountOpeningProducts,
  'account-opening.submitFunding':  submitAccountOpeningFunding,
  'account-opening.complete':       completeAccountOpeningApplication,
  'account-opening.cancel':         cancelAccountOpeningApplication,

  // SSO Provider Management
  'sso.providers.list':       listSsoProviders,
  'sso.providers.get':        getSsoProvider,
  'sso.providers.create':     createSsoProvider,
  'sso.providers.update':     updateSsoProvider,
  'sso.providers.delete':     deleteSsoProvider,
  'sso.providers.test':       testSsoConnection,

  // Admin — User Management Actions
  'admin.users.suspend':          suspendUser,
  'admin.users.activate':         activateUser,
  'admin.users.resetPassword':    resetUserPassword,
  'admin.users.invite':           inviteUser,

  // Admin — Branding / Design System
  'admin.branding.update':        updateBranding,
  'admin.designSystem.get':       getDesignSystem,
  'admin.designSystem.update':    updateDesignSystem,

  // Admin — Compliance
  'admin.compliance.kycReviews':      listKycReviews,
  'admin.compliance.approveKyc':      approveKyc,
  'admin.compliance.rejectKyc':       rejectKyc,
  'admin.compliance.amlAlerts':       listAmlAlerts,
  'admin.compliance.updateAmlStatus': updateAmlStatus,
  'admin.compliance.gdprRequests':    listGdprRequests,
  'admin.compliance.updateGdprStatus': updateGdprStatus,

  // Admin — Analytics
  'admin.analytics.accountGrowth':      getAccountGrowth,
  'admin.analytics.transactionVolume':  getTransactionVolume,
  'admin.analytics.depositTrends':      getDepositTrends,
  'admin.analytics.keyMetrics':         getKeyMetrics,

  // CMS — Public Content (no auth required)
  'cms.content.public':       getPublicContent,
  'cms.content.publicList':   listPublicContent,

  // AI Chat Assistant
  'ai.chat.send':             sendMessage,
  'ai.chat.suggestions':      getSuggestions,
  'ai.chat.feedback':         submitFeedback,
  'ai.chat.escalate':         escalateToHuman,

  // AI Assistant (multi-turn + prompt management)
  'ai.assistant.chat':        sendAssistantMessage,
  'ai.prompts.list':          listPrompts,
  'ai.prompts.update':        updatePrompt,
  'ai.history':               getConversationHistory,

  // Data Export & Reporting
  'exports.list':                listExports,
  'exports.create':              createExport,
  'exports.get':                 getExport,
  'exports.download':            downloadExport,
  'exports.delete':              deleteExport,
  'exports.summary':             getExportSummary,
  'reports.templates.list':      listReportTemplates,
  'reports.templates.create':    createReportTemplate,
  'reports.templates.update':    updateReportTemplate,
  'reports.templates.delete':    deleteReportTemplate,

  // Notification Preferences
  'notifications.preferences.get':     getNotificationPreferences,
  'notifications.preferences.update':  updateNotificationPreferences,
  'notifications.test':                testNotification,

  // Session Management
  'sessions.list':           listSessions,
  'sessions.revoke':         revokeSession,
  'sessions.revokeAll':      revokeAllSessions,
  'sessions.activity':       getSessionActivity,

  // Tenant Onboarding
  'onboarding.status':          getOnboardingStatus,
  'onboarding.updateStep':      updateOnboardingStep,
  'onboarding.complete':        completeOnboarding,
  'onboarding.reset':           resetOnboarding,

  // Admin RBAC
  'admin.roles.list':           listRoles,
  'admin.roles.create':         createRole,
  'admin.roles.update':         updateRole,
  'admin.roles.delete':         deleteRole,
  'admin.roles.assign':         assignRole,
  'admin.roles.permissions':    getUserPermissions,

  // Webhook Delivery System
  'webhooks.endpoints.list':     listWebhookEndpoints,
  'webhooks.endpoints.create':   createWebhookEndpoint,
  'webhooks.endpoints.update':   updateWebhookEndpoint,
  'webhooks.endpoints.delete':   deleteWebhookEndpoint,
  'webhooks.deliveries.list':    listDeliveries,
  'webhooks.dlq':                getDeadLetterQueue,
  'webhooks.deliveries.retry':   retryDelivery,
  'webhooks.stats':              getWebhookStats,

  // Secure Messaging
  'messaging.threads.list':       listThreads,
  'messaging.threads.get':        getThread,
  'messaging.threads.create':     createThread,
  'messaging.threads.reply':      replyToThread,
  'messaging.threads.markRead':   markThreadRead,
  'messaging.threads.archive':    archiveThread,
  'messaging.departments.list':   listDepartments,
  'messaging.unreadCount':        getUnreadMessageCount,

  // Transaction Disputes (Reg E)
  'disputes.file':              fileDispute,
  'disputes.list':              listDisputes,
  'disputes.get':               getDispute,
  'disputes.addDocument':       addDisputeDocument,
  'disputes.cancel':            cancelDispute,
  'disputes.timeline':          getDisputeTimeline,

  // Check Ordering
  'checks.styles':              listCheckStyles,
  'checks.config':              getCheckOrderConfig,
  'checks.order.create':        createCheckOrder,
  'checks.orders.list':         listCheckOrders,
  'checks.order.get':           getCheckOrder,
  'checks.order.cancel':        cancelCheckOrder,

  // Direct Deposit Switching
  'directDeposit.employers':       listEmployers,
  'directDeposit.initiate':        initiateSwitch,
  'directDeposit.status':          getSwitchStatus,
  'directDeposit.list':            listSwitches,
  'directDeposit.cancel':          cancelSwitch,
  'directDeposit.confirm':         confirmSwitch,

  // Card Services — Travel Notices
  'cardServices.travelNotice.create':    createTravelNotice,
  'cardServices.travelNotice.list':      listTravelNotices,
  'cardServices.travelNotice.cancel':    cancelTravelNotice,

  // Card Services — Replacement
  'cardServices.replacement.request':    requestCardReplacement,
  'cardServices.replacement.list':       listCardReplacements,
  'cardServices.replacement.status':     getCardReplacementStatus,
  'cardServices.replacement.activate':   activateReplacementCard,

  // Device Management
  'devices.list':             listDevices,
  'devices.get':              getDevice,
  'devices.rename':           renameDevice,
  'devices.remove':           removeDevice,
  'devices.activity':         getDeviceActivity,
  'devices.trust':            trustDevice,
  'devices.untrust':          untrustDevice,

  // Wire Transfers
  'wires.createDomestic':       createDomesticWire,
  'wires.createInternational':  createInternationalWire,
  'wires.list':                 listWires,
  'wires.get':                  getWire,
  'wires.cancel':               cancelWire,
  'wires.fees':                 getWireFees,
  'wires.limits':               getWireLimits,

  // Stop Payments
  'stopPayments.create':        createStopPayment,
  'stopPayments.list':          listStopPayments,
  'stopPayments.get':           getStopPayment,
  'stopPayments.cancel':        cancelStopPayment,
  'stopPayments.renew':         renewStopPayment,
  'stopPayments.fee':           getStopPaymentFee,

  // P2P / Zelle Transfers
  'p2p.enroll':               enrollP2P,
  'p2p.enrollment':           getP2PEnrollment,
  'p2p.unenroll':             unenrollP2P,
  'p2p.send':                 sendP2P,
  'p2p.request':              requestP2P,
  'p2p.transactions':         listP2PTransactions,
  'p2p.transaction':          getP2PTransaction,
  'p2p.cancelRequest':        cancelP2PRequest,
  'p2p.limits':               getP2PLimits,

  // Savings Goals
  'goals.list':               listSavingsGoals,
  'goals.create':             createSavingsGoal,
  'goals.get':                getSavingsGoal,
  'goals.update':             updateSavingsGoal,
  'goals.delete':             deleteSavingsGoal,
  'goals.contribute':         contributeToGoal,
  'goals.withdraw':           withdrawFromGoal,
  'goals.summary':            getGoalSummary,

  // Joint Account Management
  'jointAccounts.owners.list':              listJointOwners,
  'jointAccounts.owners.add':               addJointOwner,
  'jointAccounts.owners.remove':            removeJointOwner,
  'jointAccounts.owners.updatePermissions': updateJointOwnerPermissions,
  'jointAccounts.invitations.list':         listPendingInvitations,
  'jointAccounts.invitations.accept':       acceptInvitation,
  'jointAccounts.invitations.decline':      declineInvitation,
  'jointAccounts.summary':                  getJointAccountSummary,

  // Overdraft Protection
  'overdraft.settings.get':       getOverdraftSettings,
  'overdraft.settings.update':    updateOverdraftSettings,
  'overdraft.history':            getOverdraftHistory,
  'overdraft.feeSchedule':        getOverdraftFeeSchedule,

  // Spending Alerts
  'alerts.list':                  listAlerts,
  'alerts.create':                createAlert,
  'alerts.update':                updateAlert,
  'alerts.delete':                deleteAlert,
  'alerts.history':               listAlertHistory,
  'alerts.summary':               getAlertSummary,

  // Document Vault
  'vault.documents.list':         listVaultDocuments,
  'vault.documents.upload':       uploadDocument,
  'vault.documents.get':          getVaultDocument,
  'vault.documents.update':       updateVaultDocument,
  'vault.documents.delete':       deleteVaultDocument,
  'vault.summary':                getVaultSummary,
  'vault.documents.search':       searchVaultDocuments,

  // AI Platform — Conversational Banking
  'ai.platform.chat':                 conversationalChat,

  // AI Platform — Knowledge Base (RAG)
  'ai.kb.upload':                     kbUploadDocument,
  'ai.kb.list':                       kbListDocuments,
  'ai.kb.delete':                     kbDeleteDocument,
  'ai.kb.search':                     kbSearch,
  'ai.kb.gaps':                       kbGetGaps,

  // AI Platform — Automation Rules
  'ai.automation.list':               listAutomationRules,
  'ai.automation.create':             createAutomationRule,
  'ai.automation.update':             updateAutomationRule,
  'ai.automation.delete':             deleteAutomationRule,
  'ai.automation.history':            getAutomationHistory,

  // AI Platform — Proactive Insights
  'ai.insights.list':                 getInsights,
  'ai.insights.act':                  actOnInsight,
  'ai.insights.dismiss':              dismissInsight,
  'ai.insights.generate':             generateInsightsHandler,

  // AI Platform — Escalation Queue
  'ai.escalations.queue':             getEscalationQueue,
  'ai.escalations.get':               getEscalation,
  'ai.escalations.assign':            assignEscalation,
  'ai.escalations.resolve':           resolveEscalation,

  // AI Platform — Prompt Management
  'ai.platform.prompts.list':         listSystemPrompts,
  'ai.platform.prompts.update':       updateSystemPrompt,
  'ai.platform.prompts.test':         testPrompt,

  // Admin — Autonomous Execution
  'admin.autonomous.serviceAccounts.list':      listServiceAccounts,
  'admin.autonomous.serviceAccounts.create':    createServiceAccount,
  'admin.autonomous.serviceAccounts.update':    updateServiceAccount,
  'admin.autonomous.serviceAccounts.revoke':    revokeServiceAccount,
  'admin.autonomous.policies.list':             listExecutionPolicies,
  'admin.autonomous.policies.upsert':           upsertExecutionPolicy,
  'admin.autonomous.policies.delete':           deleteExecutionPolicy,
  'admin.autonomous.executions.list':           listAutonomousExecutions,
  'admin.autonomous.executions.approve':        approveExecution,
  'admin.autonomous.executions.reject':         rejectExecution,
  'admin.autonomous.stats':                     getExecutionStats,
  'admin.autonomous.events.list':               listEventInbox,
  'admin.autonomous.toggle':                    toggleAutonomous,
  'admin.autonomous.trigger':                   triggerExecutor,

  // Server-Driven UI (SDUI)
  'sdui.resolve':               resolveScreen,
  'sdui.persona':               getCurrentPersona,
  'sdui.personas.list':         listPersonas,
  'sdui.personas.create':       createPersona,
  'sdui.personas.update':       updatePersona,
  'sdui.personas.delete':       deletePersona,
  'sdui.manifests.list':        listManifests,
  'sdui.manifests.get':         getManifest,
  'sdui.manifests.create':      createManifest,
  'sdui.manifests.update':      updateManifest,
  'sdui.manifests.delete':      deleteManifest,

  // Admin — CDP (Customer Data Platform / RudderStack)
  'admin.cdp.config.get':             getCDPConfig,
  'admin.cdp.config.update':          updateCDPConfig,
  'admin.cdp.destinations.list':      listCDPDestinations,
  'admin.cdp.destinations.create':    createCDPDestination,
  'admin.cdp.destinations.update':    updateCDPDestination,
  'admin.cdp.destinations.delete':    deleteCDPDestination,
  'admin.cdp.events.recent':          listRecentCDPEvents,
  'admin.cdp.events.summary':         getCDPEventSummary,

  // Compliance Audit (Vanta / Drata)
  'complianceAudit.syncEvidence':       syncEvidence,
  'complianceAudit.reportIncident':     reportIncident,
  'complianceAudit.status':             getComplianceAuditStatus,
  'complianceAudit.syncHistory':        listComplianceSyncHistory,
  'complianceAudit.testConnection':     testComplianceConnection,

  // Open Banking — Consent Management (CFPB Section 1033)
  'openBanking.consents.list':       listConsents,
  'openBanking.consents.get':        getConsent,
  'openBanking.consents.grant':      grantConsent,
  'openBanking.consents.revoke':     revokeConsent,
  'openBanking.accessLogs.list':     listAccessLogs,
  'openBanking.consents.summary':    getConsentSummary,

  // Data Aggregation — Multi-Bank Aggregator (Salt Edge, Akoya, Plaid)
  'aggregator.institutions.search':    searchAggregatorInstitutions,
  'aggregator.connections.create':     createAggregatorConnection,
  'aggregator.connections.callback':   handleAggregatorCallback,
  'aggregator.connections.list':       listAggregatorConnections,
  'aggregator.connections.refresh':    refreshAggregatorConnection,
  'aggregator.connections.remove':     removeAggregatorConnection,
  'aggregator.accounts.list':          listAggregatedAccounts,
  'aggregator.transactions.list':      listAggregatedTransactions,

  // Business Orchestration — Invoice Processor (Zero-Touch AP)
  'invoices.analyze':             analyzeInvoice,
  'invoices.confirm':             confirmInvoice,
  'invoices.list':                listInvoices,
  'invoices.get':                 getInvoice,
  'invoices.cancel':              cancelInvoice,

  // Business Orchestration — Cash Sweeps (Smart Sweep / Yield Optimization)
  'sweeps.rules.list':            listSweepRules,
  'sweeps.rules.create':          createSweepRule,
  'sweeps.rules.update':          updateSweepRule,
  'sweeps.rules.delete':          deleteSweepRule,
  'sweeps.rules.toggle':          toggleSweepRule,
  'sweeps.executions.list':       listSweepExecutions,
  'sweeps.summary':               getSweepSummary,

  // Business Orchestration — JIT Permissions (Approval Workflow)
  'approvals.requests.list':      listApprovalRequests,
  'approvals.requests.get':       getApprovalRequest,
  'approvals.requests.approve':   approveRequest,
  'approvals.requests.deny':      denyRequest,
  'approvals.requests.cancel':    cancelRequest,
  'approvals.policies.list':      listApprovalPolicies,
  'approvals.policies.create':    createApprovalPolicy,
  'approvals.policies.update':    updateApprovalPolicy,
  'approvals.policies.delete':    deleteApprovalPolicy,
  'approvals.summary':            getApprovalSummary,

  // Business Orchestration — Cash Flow Forecast (Liquidity Dashboard)
  'cashflow.forecast':            getCashFlowForecast,

  // Business Orchestration — Treasury-as-a-Service (Vault Yield)
  'treasury.vaults.list':         listTreasuryVaults,
  'treasury.vaults.create':       createTreasuryVault,
  'treasury.vaults.close':        closeTreasuryVault,
  'treasury.summary':             getTreasurySummary,

  // International Compliance — Consent Dashboard (PSD3 / Open Finance)
  'intl.consents.list':             listInternationalConsents,
  'intl.consents.get':              getInternationalConsent,
  'intl.consents.revoke':           revokeInternationalConsent,
  'intl.consents.revokeScope':      revokeInternationalConsentScope,
  'intl.consents.accessLogs':       listInternationalConsentAccessLogs,
  'intl.consents.summary':          getInternationalConsentSummary,

  // International Compliance — Strong Customer Authentication (SCA)
  'intl.sca.config':                getSCAConfig,
  'intl.sca.createChallenge':       createSCAChallenge,
  'intl.sca.verifyFactor':          verifySCAFactor,
  'intl.sca.devices.list':          listSCATrustedDevices,
  'intl.sca.devices.bind':          bindSCADevice,
  'intl.sca.devices.unbind':        unbindSCADevice,

  // International Compliance — Localized eKYC
  'intl.ekyc.providers':            listEKYCProviders,
  'intl.ekyc.initiate':             initiateEKYC,
  'intl.ekyc.status':               getEKYCStatus,
  'intl.ekyc.liveness.start':       startLivenessCheck,
  'intl.ekyc.liveness.complete':    completeLivenessCheck,
  'intl.ekyc.list':                 listEKYCVerifications,

  // International Compliance — Specialized Payments (VPA / Pix / UPI)
  'intl.payments.aliases.list':     listPaymentAliases,
  'intl.payments.aliases.create':   createPaymentAlias,
  'intl.payments.aliases.delete':   deletePaymentAlias,
  'intl.payments.confirmPayee':     confirmPayee,
  'intl.payments.send':             sendInternationalPayment,
  'intl.payments.parseQR':          parseQRPayment,
  'intl.payments.generateQR':       generateQRPayment,
  'intl.payments.list':             listInternationalPayments,
  'intl.payments.limits':           getInternationalPaymentLimits,

  // International Compliance — Open Finance (Aggregation + Alt Credit)
  'intl.openFinance.connections.list':      listOpenFinanceConnections,
  'intl.openFinance.connections.create':    createOpenFinanceConnection,
  'intl.openFinance.connections.refresh':   refreshOpenFinanceConnection,
  'intl.openFinance.connections.remove':    removeOpenFinanceConnection,
  'intl.openFinance.accounts.list':         listOpenFinanceAccounts,
  'intl.openFinance.netWorth':              getOpenFinanceNetWorth,
  'intl.openFinance.alternativeCredit':     getAlternativeCreditData,

  // International Payments (Stripe / Marqeta — Global Coverage)
  'internationalPayments.coverage':          getInternationalCoverage,
  'internationalPayments.fxQuote':           getFXQuote,
  'internationalPayments.create':            createInternationalPayment,
  'internationalPayments.get':               getInternationalPayment,
  'internationalPayments.list':              listInternationalPayments,
  'internationalPayments.cards.issue':       issueGlobalCard,
  'internationalPayments.cards.list':        listGlobalCards,
  'internationalPayments.payouts.create':    createInternationalPayout,
  'internationalPayments.payouts.list':      listInternationalPayouts,

  // International Bill Pay (Pipit Global / Wise / ConnectPay)
  'internationalBillPay.billers.search':     searchInternationalBillers,
  'internationalBillPay.pay':                payInternationalBill,
  'internationalBillPay.get':                getInternationalBillPayment,
  'internationalBillPay.list':               listInternationalBillPayments,
  'internationalBillPay.countries':          getInternationalBillPayCountries,

  // International Loan Origination (Finastra / nCino)
  'internationalLoans.application.create':   createInternationalLoanApplication,
  'internationalLoans.application.get':      getInternationalLoanApplication,
  'internationalLoans.application.list':     listInternationalLoanApplications,
  'internationalLoans.creditAssessment':     getInternationalCreditAssessment,
  'internationalLoans.complianceChecks':     getInternationalComplianceChecks,

  // Banking-as-a-Service Partners (Solaris / ClearBank)
  'baas.accounts.list':          listBaaSAccounts,
  'baas.accounts.create':        createBaaSAccount,
  'baas.accounts.get':           getBaaSAccount,
  'baas.payments.initiate':      initiateBaaSPayment,
  'baas.kyc.status':             getBaaSKYCStatus,
  'baas.compliance.status':      getBaaSComplianceStatus,

  // Alias-First Payments (Global Alias Resolution + Request-to-Pay)
  'alias.resolve':                 resolveAlias,
  'alias.pay':                     payByAlias,
  'alias.r2p.inbound.list':        listInboundR2P,
  'alias.r2p.inbound.respond':     respondToR2P,
  'alias.r2p.outbound.send':       sendR2P,
  'alias.r2p.outbound.list':       listOutboundR2P,
  'alias.directories':             getSupportedDirectories,

  // Multi-Currency Pots & vIBAN Manager
  'currency.pots.list':            listCurrencyPots,
  'currency.pots.create':          createCurrencyPot,
  'currency.pots.get':             getCurrencyPot,
  'currency.pots.close':           closeCurrencyPot,
  'currency.viban.generate':       generateVIBAN,
  'currency.swap.quote':           getSwapQuote,
  'currency.swap.execute':         executeSwap,
  'currency.swap.list':            listSwaps,

  // Regulatory Transparency Widgets
  'regulatory.safeguarding':       getSafeguardingInfo,
  'regulatory.withholding':        listInterestWithholding,
  'regulatory.carbon.transaction': getCarbonFootprint,
  'regulatory.carbon.summary':     getCarbonSummary,

  // Confirmation of Payee (Name-Account Verification)
  'cop.verify':                verifyPayee,
  'cop.getVerification':       getVerification,

  // Strong Customer Authentication (PSD2 SCA)
  'sca.initiate':              initiateChallenge,
  'sca.complete':              completeChallenge,
  'sca.checkExemption':        checkExemption,

  // Instant Payments (FedNow, RTP, SEPA Instant, Pix, UPI — ISO 20022)
  'instantPayments.send':              sendInstantPayment,
  'instantPayments.get':               getInstantPayment,
  'instantPayments.list':              listInstantPayments,
  'instantPayments.checkReceiver':     checkInstantPaymentReceiver,
  'instantPayments.requestForPayment': sendRequestForPayment,
  'instantPayments.exportISO20022':    exportPaymentISO20022,
  'instantPayments.limits':            getInstantPaymentLimits,

  // Global Compliance (GDPR, Cooling-Off, Tax Withholding)
  'compliance.dataPortability':         requestDataPortability,
  'compliance.dataResidency':           getDataResidency,
  'compliance.loanCoolingOff':          getLoanCoolingOff,
  'compliance.loanWithdrawal':          exerciseLoanWithdrawal,
  'compliance.interestWithholding':     getInterestWithholding,

  // System
  'system.health':            healthCheck,
};
