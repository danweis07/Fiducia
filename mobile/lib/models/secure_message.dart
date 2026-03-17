/// Secure Messaging models — matches backend secureMessaging handlers

class MessageThread {
  final String id;
  final String subject;
  final String status;
  final int messageCount;
  final int unreadCount;
  final String? lastMessageAt;
  final String createdAt;

  const MessageThread({
    required this.id,
    required this.subject,
    this.status = 'open',
    this.messageCount = 0,
    this.unreadCount = 0,
    this.lastMessageAt,
    required this.createdAt,
  });

  factory MessageThread.fromJson(Map<String, dynamic> json) {
    return MessageThread(
      id: json['id'] as String,
      subject: json['subject'] as String,
      status: json['status'] as String? ?? 'open',
      messageCount: json['messageCount'] as int? ?? json['message_count'] as int? ?? 0,
      unreadCount: json['unreadCount'] as int? ?? json['unread_count'] as int? ?? 0,
      lastMessageAt: json['lastMessageAt'] as String? ?? json['last_message_at'] as String?,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
    );
  }
}

class SecureMessage {
  final String id;
  final String threadId;
  final String body;
  final String senderType; // 'member' or 'agent'
  final String? senderName;
  final bool isRead;
  final String createdAt;

  const SecureMessage({
    required this.id,
    required this.threadId,
    required this.body,
    required this.senderType,
    this.senderName,
    this.isRead = false,
    required this.createdAt,
  });

  factory SecureMessage.fromJson(Map<String, dynamic> json) {
    return SecureMessage(
      id: json['id'] as String,
      threadId: json['threadId'] as String? ?? json['thread_id'] as String? ?? '',
      body: json['body'] as String,
      senderType: json['senderType'] as String? ?? json['sender_type'] as String? ?? 'member',
      senderName: json['senderName'] as String? ?? json['sender_name'] as String?,
      isRead: json['isRead'] as bool? ?? json['is_read'] as bool? ?? false,
      createdAt: json['createdAt'] as String? ?? json['created_at'] as String? ?? '',
    );
  }
}
