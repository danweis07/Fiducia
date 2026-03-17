/// Banking domain models — mirrors src/types/banking.ts
/// All monetary values are integer cents.

// =============================================================================
// ACCOUNTS
// =============================================================================

enum AccountType { checking, savings, moneyMarket, cd }

enum AccountStatus { active, frozen, closed, pending }

class Account {
  final String id;
  final String type;
  final String? nickname;
  final String accountNumberMasked;
  final String routingNumber;
  final int balanceCents;
  final int availableBalanceCents;
  final String status;
  final int interestRateBps;
  final String openedAt;
  final String? closedAt;

  const Account({
    required this.id,
    required this.type,
    this.nickname,
    required this.accountNumberMasked,
    required this.routingNumber,
    required this.balanceCents,
    required this.availableBalanceCents,
    required this.status,
    required this.interestRateBps,
    required this.openedAt,
    this.closedAt,
  });

  factory Account.fromJson(Map<String, dynamic> json) => Account(
        id: json['id'] as String,
        type: json['type'] as String,
        nickname: json['nickname'] as String?,
        accountNumberMasked: json['accountNumberMasked'] as String,
        routingNumber: json['routingNumber'] as String,
        balanceCents: json['balanceCents'] as int,
        availableBalanceCents: json['availableBalanceCents'] as int,
        status: json['status'] as String,
        interestRateBps: json['interestRateBps'] as int,
        openedAt: json['openedAt'] as String,
        closedAt: json['closedAt'] as String?,
      );

  String get displayName => nickname ?? '${type[0].toUpperCase()}${type.substring(1)} Account';
}

// =============================================================================
// TRANSACTIONS
// =============================================================================

class Transaction {
  final String id;
  final String accountId;
  final String type;
  final int amountCents;
  final String description;
  final String category;
  final String status;
  final String? merchantName;
  final int runningBalanceCents;
  final String? postedAt;
  final String createdAt;

  const Transaction({
    required this.id,
    required this.accountId,
    required this.type,
    required this.amountCents,
    required this.description,
    required this.category,
    required this.status,
    this.merchantName,
    required this.runningBalanceCents,
    this.postedAt,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        type: json['type'] as String,
        amountCents: json['amountCents'] as int,
        description: json['description'] as String,
        category: json['category'] as String,
        status: json['status'] as String,
        merchantName: json['merchantName'] as String?,
        runningBalanceCents: json['runningBalanceCents'] as int,
        postedAt: json['postedAt'] as String?,
        createdAt: json['createdAt'] as String,
      );

  bool get isCredit => amountCents >= 0;
}

// =============================================================================
// LOANS
// =============================================================================

class Loan {
  final String id;
  final String loanNumberMasked;
  final int principalCents;
  final int interestRateBps;
  final int termMonths;
  final int outstandingBalanceCents;
  final int principalPaidCents;
  final int interestPaidCents;
  final String? nextPaymentDueDate;
  final int? nextPaymentAmountCents;
  final int? paymentsRemaining;
  final String? autopayAccountId;
  final String status;
  final int daysPastDue;
  final String? maturityDate;
  final String createdAt;

  const Loan({
    required this.id,
    required this.loanNumberMasked,
    required this.principalCents,
    required this.interestRateBps,
    required this.termMonths,
    required this.outstandingBalanceCents,
    required this.principalPaidCents,
    required this.interestPaidCents,
    this.nextPaymentDueDate,
    this.nextPaymentAmountCents,
    this.paymentsRemaining,
    this.autopayAccountId,
    required this.status,
    required this.daysPastDue,
    this.maturityDate,
    required this.createdAt,
  });

  factory Loan.fromJson(Map<String, dynamic> json) => Loan(
        id: json['id'] as String,
        loanNumberMasked: json['loanNumberMasked'] as String,
        principalCents: json['principalCents'] as int,
        interestRateBps: json['interestRateBps'] as int,
        termMonths: json['termMonths'] as int,
        outstandingBalanceCents: json['outstandingBalanceCents'] as int,
        principalPaidCents: json['principalPaidCents'] as int,
        interestPaidCents: json['interestPaidCents'] as int,
        nextPaymentDueDate: json['nextPaymentDueDate'] as String?,
        nextPaymentAmountCents: json['nextPaymentAmountCents'] as int?,
        paymentsRemaining: json['paymentsRemaining'] as int?,
        autopayAccountId: json['autopayAccountId'] as String?,
        status: json['status'] as String,
        daysPastDue: json['daysPastDue'] as int,
        maturityDate: json['maturityDate'] as String?,
        createdAt: json['createdAt'] as String,
      );

  int get progressPercent => principalCents > 0
      ? ((principalCents - outstandingBalanceCents) / principalCents * 100).round()
      : 0;
}

// =============================================================================
// LOAN SCHEDULE & PAYMENTS
// =============================================================================

class LoanScheduleItem {
  final String id;
  final String loanId;
  final int installmentNumber;
  final String dueDate;
  final int principalCents;
  final int interestCents;
  final int feeCents;
  final int totalCents;
  final int paidCents;
  final String? paidAt;
  final String status;

  const LoanScheduleItem({
    required this.id,
    required this.loanId,
    required this.installmentNumber,
    required this.dueDate,
    required this.principalCents,
    required this.interestCents,
    required this.feeCents,
    required this.totalCents,
    required this.paidCents,
    this.paidAt,
    required this.status,
  });

  factory LoanScheduleItem.fromJson(Map<String, dynamic> json) => LoanScheduleItem(
        id: json['id'] as String,
        loanId: json['loanId'] as String,
        installmentNumber: json['installmentNumber'] as int,
        dueDate: json['dueDate'] as String,
        principalCents: json['principalCents'] as int,
        interestCents: json['interestCents'] as int,
        feeCents: json['feeCents'] as int,
        totalCents: json['totalCents'] as int,
        paidCents: json['paidCents'] as int,
        paidAt: json['paidAt'] as String?,
        status: json['status'] as String,
      );
}

class LoanPayment {
  final String id;
  final String loanId;
  final int amountCents;
  final int principalPortionCents;
  final int interestPortionCents;
  final int feePortionCents;
  final int extraPrincipalCents;
  final String fromAccountId;
  final String paymentMethod;
  final String status;
  final String? processedAt;
  final String createdAt;

  const LoanPayment({
    required this.id,
    required this.loanId,
    required this.amountCents,
    required this.principalPortionCents,
    required this.interestPortionCents,
    required this.feePortionCents,
    required this.extraPrincipalCents,
    required this.fromAccountId,
    required this.paymentMethod,
    required this.status,
    this.processedAt,
    required this.createdAt,
  });

  factory LoanPayment.fromJson(Map<String, dynamic> json) => LoanPayment(
        id: json['id'] as String,
        loanId: json['loanId'] as String,
        amountCents: json['amountCents'] as int,
        principalPortionCents: json['principalPortionCents'] as int,
        interestPortionCents: json['interestPortionCents'] as int,
        feePortionCents: json['feePortionCents'] as int,
        extraPrincipalCents: json['extraPrincipalCents'] as int,
        fromAccountId: json['fromAccountId'] as String,
        paymentMethod: json['paymentMethod'] as String,
        status: json['status'] as String,
        processedAt: json['processedAt'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

// =============================================================================
// BENEFICIARIES
// =============================================================================

class Beneficiary {
  final String id;
  final String name;
  final String? nickname;
  final String accountNumberMasked;
  final String? bankName;
  final String type;
  final bool isVerified;

  const Beneficiary({
    required this.id,
    required this.name,
    this.nickname,
    required this.accountNumberMasked,
    this.bankName,
    required this.type,
    required this.isVerified,
  });

  factory Beneficiary.fromJson(Map<String, dynamic> json) => Beneficiary(
        id: json['id'] as String,
        name: json['name'] as String,
        nickname: json['nickname'] as String?,
        accountNumberMasked: json['accountNumberMasked'] as String,
        bankName: json['bankName'] as String?,
        type: json['type'] as String,
        isVerified: json['isVerified'] as bool,
      );
}

// =============================================================================
// CARDS
// =============================================================================

class BankCard {
  final String id;
  final String accountId;
  final String type;
  final String lastFour;
  final String cardholderName;
  final String status;
  final int dailyLimitCents;
  final int singleTransactionLimitCents;
  final String expirationDate;
  final bool isContactless;
  final bool isVirtual;

  const BankCard({
    required this.id,
    required this.accountId,
    required this.type,
    required this.lastFour,
    required this.cardholderName,
    required this.status,
    required this.dailyLimitCents,
    required this.singleTransactionLimitCents,
    required this.expirationDate,
    required this.isContactless,
    required this.isVirtual,
  });

  factory BankCard.fromJson(Map<String, dynamic> json) => BankCard(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        type: json['type'] as String,
        lastFour: json['lastFour'] as String,
        cardholderName: json['cardholderName'] as String,
        status: json['status'] as String,
        dailyLimitCents: json['dailyLimitCents'] as int,
        singleTransactionLimitCents: json['singleTransactionLimitCents'] as int,
        expirationDate: json['expirationDate'] as String,
        isContactless: json['isContactless'] as bool,
        isVirtual: json['isVirtual'] as bool,
      );

  bool get isLocked => status == 'locked';
  bool get isActive => status == 'active';
}

// =============================================================================
// BILLS
// =============================================================================

class Bill {
  final String id;
  final String payeeName;
  final String payeeAccountNumberMasked;
  final int amountCents;
  final String dueDate;
  final String status;
  final bool autopay;
  final String fromAccountId;
  final String? paidAt;
  final String createdAt;

  const Bill({
    required this.id,
    required this.payeeName,
    required this.payeeAccountNumberMasked,
    required this.amountCents,
    required this.dueDate,
    required this.status,
    required this.autopay,
    required this.fromAccountId,
    this.paidAt,
    required this.createdAt,
  });

  factory Bill.fromJson(Map<String, dynamic> json) => Bill(
        id: json['id'] as String,
        payeeName: json['payeeName'] as String,
        payeeAccountNumberMasked: json['payeeAccountNumberMasked'] as String,
        amountCents: json['amountCents'] as int,
        dueDate: json['dueDate'] as String,
        status: json['status'] as String,
        autopay: json['autopay'] as bool,
        fromAccountId: json['fromAccountId'] as String,
        paidAt: json['paidAt'] as String?,
        createdAt: json['createdAt'] as String,
      );

  bool get isPaid => status == 'paid';
  bool get isUpcoming => status == 'scheduled';
}

// =============================================================================
// RDC DEPOSITS
// =============================================================================

class RDCDeposit {
  final String id;
  final String accountId;
  final int amountCents;
  final String status;
  final String? checkNumber;
  final String? rejectionReason;
  final String? clearedAt;
  final String createdAt;

  const RDCDeposit({
    required this.id,
    required this.accountId,
    required this.amountCents,
    required this.status,
    this.checkNumber,
    this.rejectionReason,
    this.clearedAt,
    required this.createdAt,
  });

  factory RDCDeposit.fromJson(Map<String, dynamic> json) => RDCDeposit(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        amountCents: json['amountCents'] as int,
        status: json['status'] as String,
        checkNumber: json['checkNumber'] as String?,
        rejectionReason: json['rejectionReason'] as String?,
        clearedAt: json['clearedAt'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================

class BankNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final bool isRead;
  final String? actionUrl;
  final String createdAt;

  const BankNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.isRead,
    this.actionUrl,
    required this.createdAt,
  });

  factory BankNotification.fromJson(Map<String, dynamic> json) => BankNotification(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        isRead: json['isRead'] as bool,
        actionUrl: json['actionUrl'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

// =============================================================================
// STATEMENTS
// =============================================================================

class AccountStatement {
  final String id;
  final String accountId;
  final String periodLabel;
  final String periodStart;
  final String periodEnd;
  final String format;
  final int openingBalanceCents;
  final int closingBalanceCents;
  final int totalCreditsCents;
  final int totalDebitsCents;
  final int transactionCount;
  final String? downloadUrl;
  final String generatedAt;

  const AccountStatement({
    required this.id,
    required this.accountId,
    required this.periodLabel,
    required this.periodStart,
    required this.periodEnd,
    required this.format,
    required this.openingBalanceCents,
    required this.closingBalanceCents,
    required this.totalCreditsCents,
    required this.totalDebitsCents,
    required this.transactionCount,
    this.downloadUrl,
    required this.generatedAt,
  });

  factory AccountStatement.fromJson(Map<String, dynamic> json) => AccountStatement(
        id: json['id'] as String,
        accountId: json['accountId'] as String,
        periodLabel: json['periodLabel'] as String,
        periodStart: json['periodStart'] as String,
        periodEnd: json['periodEnd'] as String,
        format: json['format'] as String,
        openingBalanceCents: json['openingBalanceCents'] as int,
        closingBalanceCents: json['closingBalanceCents'] as int,
        totalCreditsCents: json['totalCreditsCents'] as int,
        totalDebitsCents: json['totalDebitsCents'] as int,
        transactionCount: json['transactionCount'] as int,
        downloadUrl: json['downloadUrl'] as String?,
        generatedAt: json['generatedAt'] as String,
      );
}

// =============================================================================
// STANDING INSTRUCTIONS
// =============================================================================

class StandingInstruction {
  final String id;
  final String fromAccountId;
  final String? toAccountId;
  final String? toBeneficiaryId;
  final String transferType;
  final int amountCents;
  final String name;
  final String frequency;
  final int? dayOfMonth;
  final String? nextExecutionDate;
  final String status;
  final int totalExecutions;
  final String? lastExecutedAt;
  final String? lastFailureReason;
  final String createdAt;

  const StandingInstruction({
    required this.id,
    required this.fromAccountId,
    this.toAccountId,
    this.toBeneficiaryId,
    required this.transferType,
    required this.amountCents,
    required this.name,
    required this.frequency,
    this.dayOfMonth,
    this.nextExecutionDate,
    required this.status,
    required this.totalExecutions,
    this.lastExecutedAt,
    this.lastFailureReason,
    required this.createdAt,
  });

  factory StandingInstruction.fromJson(Map<String, dynamic> json) => StandingInstruction(
        id: json['id'] as String,
        fromAccountId: json['fromAccountId'] as String,
        toAccountId: json['toAccountId'] as String?,
        toBeneficiaryId: json['toBeneficiaryId'] as String?,
        transferType: json['transferType'] as String,
        amountCents: json['amountCents'] as int,
        name: json['name'] as String,
        frequency: json['frequency'] as String,
        dayOfMonth: json['dayOfMonth'] as int?,
        nextExecutionDate: json['nextExecutionDate'] as String?,
        status: json['status'] as String,
        totalExecutions: json['totalExecutions'] as int,
        lastExecutedAt: json['lastExecutedAt'] as String?,
        lastFailureReason: json['lastFailureReason'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

// =============================================================================
// MEMBER PROFILE DETAILS
// =============================================================================

class MemberAddress {
  final String id;
  final String type;
  final bool isPrimary;
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String zip;
  final String country;
  final String? verifiedAt;

  const MemberAddress({
    required this.id,
    required this.type,
    required this.isPrimary,
    required this.line1,
    this.line2,
    required this.city,
    required this.state,
    required this.zip,
    required this.country,
    this.verifiedAt,
  });

  factory MemberAddress.fromJson(Map<String, dynamic> json) => MemberAddress(
        id: json['id'] as String,
        type: json['type'] as String,
        isPrimary: json['isPrimary'] as bool,
        line1: json['line1'] as String,
        line2: json['line2'] as String?,
        city: json['city'] as String,
        state: json['state'] as String,
        zip: json['zip'] as String,
        country: json['country'] as String,
        verifiedAt: json['verifiedAt'] as String?,
      );

  String get fullAddress => '$line1${line2 != null ? ', $line2' : ''}, $city, $state $zip';
}

class MemberDocument {
  final String id;
  final String type;
  final String label;
  final String? documentNumberMasked;
  final String? issuingAuthority;
  final String? issuedDate;
  final String? expirationDate;
  final String status;

  const MemberDocument({
    required this.id,
    required this.type,
    required this.label,
    this.documentNumberMasked,
    this.issuingAuthority,
    this.issuedDate,
    this.expirationDate,
    required this.status,
  });

  factory MemberDocument.fromJson(Map<String, dynamic> json) => MemberDocument(
        id: json['id'] as String,
        type: json['type'] as String,
        label: json['label'] as String,
        documentNumberMasked: json['documentNumberMasked'] as String?,
        issuingAuthority: json['issuingAuthority'] as String?,
        issuedDate: json['issuedDate'] as String?,
        expirationDate: json['expirationDate'] as String?,
        status: json['status'] as String,
      );
}

class MemberIdentifier {
  final String id;
  final String type;
  final String valueMasked;
  final bool isPrimary;

  const MemberIdentifier({
    required this.id,
    required this.type,
    required this.valueMasked,
    required this.isPrimary,
  });

  factory MemberIdentifier.fromJson(Map<String, dynamic> json) => MemberIdentifier(
        id: json['id'] as String,
        type: json['type'] as String,
        valueMasked: json['valueMasked'] as String,
        isPrimary: json['isPrimary'] as bool,
      );
}

// =============================================================================
// ATM / BRANCH LOCATIONS
// =============================================================================

enum LocationType { atm, branch, sharedBranch }

class BranchLocation {
  final String id;
  final String name;
  final String type;
  final double latitude;
  final double longitude;
  final String address;
  final String city;
  final String state;
  final String zip;
  final String? phone;
  final double? distanceMiles;
  final Map<String, String>? hours;
  final List<String> services;
  final bool isOpen;
  final bool isDepositAccepting;
  final String? network;

  const BranchLocation({
    required this.id,
    required this.name,
    required this.type,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.city,
    required this.state,
    required this.zip,
    this.phone,
    this.distanceMiles,
    this.hours,
    this.services = const [],
    required this.isOpen,
    required this.isDepositAccepting,
    this.network,
  });

  factory BranchLocation.fromJson(Map<String, dynamic> json) => BranchLocation(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        address: json['address'] as String,
        city: json['city'] as String,
        state: json['state'] as String,
        zip: json['zip'] as String,
        phone: json['phone'] as String?,
        distanceMiles: (json['distanceMiles'] as num?)?.toDouble(),
        hours: json['hours'] != null
            ? Map<String, String>.from(json['hours'] as Map)
            : null,
        services: json['services'] != null
            ? List<String>.from(json['services'] as List)
            : const [],
        isOpen: json['isOpen'] as bool? ?? false,
        isDepositAccepting: json['isDepositAccepting'] as bool? ?? false,
        network: json['network'] as String?,
      );

  String get fullAddress => '$address, $city, $state $zip';
}

// =============================================================================
// USER PROFILE
// =============================================================================

class BankingUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String kycStatus;
  final bool mfaEnabled;

  const BankingUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    required this.kycStatus,
    required this.mfaEnabled,
  });

  factory BankingUser.fromJson(Map<String, dynamic> json) => BankingUser(
        id: json['id'] as String,
        email: json['email'] as String,
        firstName: json['firstName'] as String,
        lastName: json['lastName'] as String,
        phone: json['phone'] as String?,
        kycStatus: json['kycStatus'] as String,
        mfaEnabled: json['mfaEnabled'] as bool,
      );

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName[0]}${lastName[0]}'.toUpperCase();
}

// =============================================================================
// CMS CONTENT
// =============================================================================

class CMSContent {
  final String id;
  final String slug;
  final String title;
  final String? body;
  final String contentType;
  final String status;
  final List<String> channels;
  final Map<String, dynamic> metadata;
  final String? publishedAt;
  final String? expiresAt;
  final String createdAt;

  const CMSContent({
    required this.id,
    required this.slug,
    required this.title,
    this.body,
    required this.contentType,
    required this.status,
    required this.channels,
    this.metadata = const {},
    this.publishedAt,
    this.expiresAt,
    required this.createdAt,
  });

  factory CMSContent.fromJson(Map<String, dynamic> json) => CMSContent(
        id: json['id'] as String,
        slug: json['slug'] as String,
        title: json['title'] as String,
        body: json['body'] as String?,
        contentType: json['contentType'] as String,
        status: json['status'] as String,
        channels: (json['channels'] as List?)?.cast<String>() ?? [],
        metadata: (json['metadata'] as Map<String, dynamic>?) ?? {},
        publishedAt: json['publishedAt'] as String?,
        expiresAt: json['expiresAt'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

// =============================================================================
// EXPERIMENTS
// =============================================================================

class ExperimentAssignment {
  final String id;
  final String experimentId;
  final String userId;
  final String variantId;
  final String assignedAt;

  const ExperimentAssignment({
    required this.id,
    required this.experimentId,
    required this.userId,
    required this.variantId,
    required this.assignedAt,
  });

  factory ExperimentAssignment.fromJson(Map<String, dynamic> json) =>
      ExperimentAssignment(
        id: json['id'] as String,
        experimentId: json['experimentId'] as String,
        userId: json['userId'] as String,
        variantId: json['variantId'] as String,
        assignedAt: json['assignedAt'] as String,
      );
}
