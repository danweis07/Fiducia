import 'package:flutter/material.dart';
import '../../theme/design_tokens.dart';

/// AI Chat Assistant screen — conversational banking assistant.
/// Supports quick suggestion chips, AI response rendering, and typing indicators.
class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  bool _isLoading = false;

  static const _suggestions = [
    'What is my balance?',
    'Show recent transactions',
    'Transfer money',
    'When is my next bill due?',
    'Find ATMs near me',
    'Card spending limits',
  ];

  // Simulated AI responses keyed to patterns
  static const _responses = {
    'balance': 'Your account balances are:\n'
        '\u2022 Primary Checking: \$12,547.83\n'
        '\u2022 Emergency Fund: \$45,201.00\n'
        '\u2022 12-Month CD: \$25,000.00\n\n'
        'Your total deposits are \$82,748.83.',
    'transaction': 'Here are your 3 most recent transactions:\n\n'
        '1. Whole Foods Market - \$42.99 (today)\n'
        '2. Starbucks Coffee - \$15.50 (yesterday)\n'
        '3. Payroll - Acme Corp - +\$3,500.00 (yesterday)\n\n'
        'Would you like to see more?',
    'transfer': 'I can help you transfer money. You can:\n\n'
        '\u2022 **Internal transfer** between your accounts\n'
        '\u2022 **External transfer** to a beneficiary\n\n'
        'Tap the "Move Money" tab to get started, or tell me the accounts and amount.',
    'bill': 'Your upcoming bills:\n\n'
        '\u2022 Con Edison Electric - \$152.00 (due in 5 days, autopay)\n'
        '\u2022 Verizon Wireless - \$89.99 (due in 12 days)\n\n'
        'Total upcoming: \$241.99',
    'atm': 'I found 2 locations near you:\n\n'
        '1. **Demo CU Main Branch** - 0.5 mi\n'
        '   100 N Main St, Springfield, IL\n'
        '   Open now \u00B7 9AM-5PM\n\n'
        '2. **Demo CU ATM** - 1.2 mi\n'
        '   500 S Grand Ave, Springfield, IL\n'
        '   24 hours',
    'card': 'Your card details:\n\n'
        '\u2022 Debit Card (****4521) - Active\n'
        '  Daily limit: \$5,000\n\n'
        '\u2022 Credit Card (****9832) - Locked\n'
        '  Daily limit: \$10,000\n\n'
        'You can manage limits and lock/unlock cards from the Cards screen.',
    'limit': 'Your current spending limits:\n\n'
        '\u2022 Debit Card: \$5,000/day, \$2,500/transaction\n'
        '\u2022 Credit Card: \$10,000/day, \$5,000/transaction\n\n'
        'Would you like me to adjust these?',
  };

  void _sendMessage([String? text]) {
    final content = text ?? _controller.text.trim();
    if (content.isEmpty) return;

    setState(() {
      _messages.add(_ChatMessage(role: 'user', content: content));
      _isLoading = true;
    });
    _controller.clear();
    _scrollToBottom();

    // Generate AI response
    Future.delayed(const Duration(milliseconds: 800), () {
      if (!mounted) return;
      setState(() {
        _messages.add(_ChatMessage(
          role: 'assistant',
          content: _generateResponse(content),
        ));
        _isLoading = false;
      });
      _scrollToBottom();
    });
  }

  String _generateResponse(String input) {
    final lower = input.toLowerCase();
    for (final entry in _responses.entries) {
      if (lower.contains(entry.key)) {
        return entry.value;
      }
    }
    return 'I can help you with banking tasks like checking balances, '
        'viewing transactions, making transfers, paying bills, and managing cards. '
        'Try asking me about one of these topics!\n\n'
        'In production, this connects to AI services supporting Vertex AI, Anthropic, and OpenAI.';
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
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.smart_toy, size: 22),
            SizedBox(width: 8),
            Text('Banking Assistant'),
          ],
        ),
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Clear Chat'),
                    content: const Text('This will remove all messages. Continue?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel'),
                      ),
                      FilledButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          setState(() => _messages.clear());
                        },
                        child: const Text('Clear'),
                      ),
                    ],
                  ),
                );
              },
              tooltip: 'Clear chat',
            ),
        ],
      ),
      body: Column(
        children: [
          // Messages area
          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState(theme)
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isLoading) {
                        return _buildTypingIndicator(theme);
                      }
                      final msg = _messages[index];
                      return _buildMessageBubble(msg, theme);
                    },
                  ),
          ),

          // Quick suggestions (show when chat is empty or after AI responds)
          if (!_isLoading && (_messages.isEmpty || (_messages.isNotEmpty && _messages.last.role == 'assistant')))
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _suggestions.map((s) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ActionChip(
                      label: Text(s, style: const TextStyle(fontSize: 12)),
                      onPressed: () => _sendMessage(s),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  )).toList(),
                ),
              ),
            ),

          // Input bar
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            decoration: BoxDecoration(
              color: theme.scaffoldBackgroundColor,
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
                        hintText: 'Ask about your accounts...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        isDense: true,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                      enabled: !_isLoading,
                      textInputAction: TextInputAction.send,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Material(
                    shape: const CircleBorder(),
                    color: theme.colorScheme.primary,
                    child: InkWell(
                      onTap: _isLoading ? null : () => _sendMessage(),
                      customBorder: const CircleBorder(),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Icon(
                          Icons.send,
                          size: 20,
                          color: _isLoading ? Colors.grey : Colors.white,
                        ),
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

  Widget _buildEmptyState(ThemeData theme) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withAlpha(20),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.smart_toy_outlined,
                size: 48,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'How can I help you today?',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Ask about your accounts, transactions, bills, or banking services. '
              'I can help you manage your finances.',
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              runSpacing: 8,
              children: [
                _QuickActionChip(
                  icon: Icons.account_balance_wallet,
                  label: 'Balances',
                  onTap: () => _sendMessage('What is my balance?'),
                ),
                _QuickActionChip(
                  icon: Icons.receipt_long,
                  label: 'Transactions',
                  onTap: () => _sendMessage('Show recent transactions'),
                ),
                _QuickActionChip(
                  icon: Icons.send,
                  label: 'Transfer',
                  onTap: () => _sendMessage('Transfer money'),
                ),
                _QuickActionChip(
                  icon: Icons.credit_card,
                  label: 'Cards',
                  onTap: () => _sendMessage('Card spending limits'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(_ChatMessage msg, ThemeData theme) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            CircleAvatar(
              radius: 14,
              backgroundColor: theme.colorScheme.primary.withAlpha(25),
              child: Icon(Icons.smart_toy, size: 16, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? theme.colorScheme.primary : Colors.grey.shade100,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              child: Text(
                msg.content,
                style: TextStyle(
                  fontSize: 14,
                  color: isUser ? Colors.white : Colors.black87,
                  height: 1.4,
                ),
              ),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 14,
              backgroundColor: Colors.grey.shade200,
              child: const Icon(Icons.person, size: 16),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTypingIndicator(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 14,
            backgroundColor: theme.colorScheme.primary.withAlpha(25),
            child: Icon(Icons.smart_toy, size: 16, color: theme.colorScheme.primary),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
                bottomLeft: Radius.circular(4),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _TypingDot(delay: 0),
                const SizedBox(width: 4),
                _TypingDot(delay: 150),
                const SizedBox(width: 4),
                _TypingDot(delay: 300),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChatMessage {
  final String role;
  final String content;

  _ChatMessage({required this.role, required this.content});
}

class _QuickActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ActionChip(
      avatar: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 12)),
      onPressed: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    );
  }
}

/// Animated typing dot for the loading indicator.
class _TypingDot extends StatefulWidget {
  final int delay;

  const _TypingDot({this.delay = 0});

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _animation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.repeat(reverse: true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -4 * _animation.value),
          child: Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: Colors.grey.shade500,
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}
