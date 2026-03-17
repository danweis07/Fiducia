import 'package:flutter/material.dart';
import '../../models/secure_message.dart';
import '../../services/gateway_client.dart';

/// Secure Messaging — member-to-agent messaging threads.
/// Thread list view with navigation to conversation detail.
class SecureMessagingScreen extends StatefulWidget {
  const SecureMessagingScreen({super.key});

  @override
  State<SecureMessagingScreen> createState() => _SecureMessagingScreenState();
}

class _SecureMessagingScreenState extends State<SecureMessagingScreen> {
  List<MessageThread> _threads = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadThreads();
  }

  Future<void> _loadThreads() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final threads = await GatewayClient.instance.getMessageThreads();
      if (mounted) setState(() { _threads = threads; _isLoading = false; });
    } catch (e) {
      if (mounted) setState(() { _isLoading = false; _error = e.toString(); });
    }
  }

  void _newThread() {
    final subjectController = TextEditingController();
    final bodyController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Message'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: subjectController,
              decoration: const InputDecoration(labelText: 'Subject'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: bodyController,
              decoration: const InputDecoration(labelText: 'Message'),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (subjectController.text.isNotEmpty && bodyController.text.isNotEmpty) {
                Navigator.pop(ctx);
                await GatewayClient.instance.createMessageThread(
                  subject: subjectController.text,
                  body: bodyController.text,
                );
                _loadThreads();
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      floatingActionButton: FloatingActionButton(
        onPressed: _newThread,
        child: const Icon(Icons.edit),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _loadThreads, child: const Text('Retry')),
                    ],
                  ),
                )
              : _threads.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.mail_outline, size: 48, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          Text('No messages', style: TextStyle(color: Colors.grey.shade500)),
                          const SizedBox(height: 8),
                          const Text('Tap + to start a conversation'),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadThreads,
                      child: ListView.separated(
                        itemCount: _threads.length,
                        separatorBuilder: (_, __) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final thread = _threads[index];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: thread.unreadCount > 0
                                  ? Theme.of(context).colorScheme.primary
                                  : Colors.grey.shade300,
                              child: Icon(
                                thread.status == 'closed' ? Icons.check : Icons.mail,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            title: Text(
                              thread.subject,
                              style: TextStyle(
                                fontWeight: thread.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                                fontSize: 14,
                              ),
                            ),
                            subtitle: Text(
                              '${thread.messageCount} messages \u00B7 ${thread.status}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                            ),
                            trailing: thread.unreadCount > 0
                                ? Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Theme.of(context).colorScheme.primary,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '${thread.unreadCount}',
                                      style: const TextStyle(color: Colors.white, fontSize: 11),
                                    ),
                                  )
                                : null,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => _ConversationScreen(threadId: thread.id, subject: thread.subject),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}

class _ConversationScreen extends StatefulWidget {
  final String threadId;
  final String subject;

  const _ConversationScreen({required this.threadId, required this.subject});

  @override
  State<_ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<_ConversationScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  List<SecureMessage> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final messages = await GatewayClient.instance.getMessages(widget.threadId);
      if (mounted) {
        setState(() { _messages = messages; _isLoading = false; });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isSending) return;

    _controller.clear();
    setState(() => _isSending = true);
    try {
      final msg = await GatewayClient.instance.sendMessage(
        threadId: widget.threadId,
        body: text,
      );
      if (mounted) {
        setState(() {
          _messages.add(msg);
          _isSending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSending = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(widget.subject, style: const TextStyle(fontSize: 16))),
      body: Column(
        children: [
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final msg = _messages[index];
                      final isMember = msg.senderType == 'member';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          mainAxisAlignment: isMember ? MainAxisAlignment.end : MainAxisAlignment.start,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isMember) ...[
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: theme.colorScheme.primary.withAlpha(25),
                                child: Text(
                                  msg.senderName?.substring(0, 1) ?? 'A',
                                  style: TextStyle(fontSize: 12, color: theme.colorScheme.primary),
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Flexible(
                              child: Column(
                                crossAxisAlignment: isMember ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                children: [
                                  if (!isMember && msg.senderName != null)
                                    Padding(
                                      padding: const EdgeInsets.only(bottom: 4),
                                      child: Text(msg.senderName!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                    ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isMember ? theme.colorScheme.primary : Colors.grey.shade100,
                                      borderRadius: BorderRadius.only(
                                        topLeft: const Radius.circular(16),
                                        topRight: const Radius.circular(16),
                                        bottomLeft: Radius.circular(isMember ? 16 : 4),
                                        bottomRight: Radius.circular(isMember ? 4 : 16),
                                      ),
                                    ),
                                    child: Text(
                                      msg.body,
                                      style: TextStyle(fontSize: 14, color: isMember ? Colors.white : Colors.black87),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        isDense: true,
                      ),
                      onSubmitted: (_) => _send(),
                      textInputAction: TextInputAction.send,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    shape: const CircleBorder(),
                    color: theme.colorScheme.primary,
                    child: InkWell(
                      onTap: _isSending ? null : _send,
                      customBorder: const CircleBorder(),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Icon(Icons.send, size: 20, color: _isSending ? Colors.grey : Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
