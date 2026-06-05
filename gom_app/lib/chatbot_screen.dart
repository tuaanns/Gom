import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:gom_app/lang_storage.dart';
import 'auth_state.dart';
import 'app_theme.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final String? sources;
  final double? tokensCharged;

  ChatMessage({required this.text, required this.isUser, this.sources, this.tokensCharged});
}

class ChatbotScreen extends StatefulWidget {
  const ChatbotScreen({Key? key}) : super(key: key);

  @override
  State<ChatbotScreen> createState() => _ChatbotScreenState();
}

class _ChatbotScreenState extends State<ChatbotScreen> {
  final TextEditingController _controller = TextEditingController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // Add initial greeting message
    final name = AuthState.user?['name'] ?? AppLang.tr('bạn', 'you');
    final greeting = AppLang.tr(
      "Xin chào $name! 👋\nTôi là Trợ lý AI của The Archivist, chuyên về gốm sứ cổ. Hãy hỏi tôi bất cứ điều gì!",
      "Hello $name! 👋\nI am the AI assistant of The Archivist, specialized in ancient ceramics. Ask me anything!",
    );
    _messages.add(ChatMessage(
      text: greeting,
      isUser: false,
    ));
    _fetchLatestUserData();
  }

  Future<void> _fetchLatestUserData() async {
    try {
      final res = await http.get(
        ApiConfig.uri('/api/user'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            AuthState.user = data['user'] ?? data;
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _sendMessage() async {
    if (_controller.text.trim().isEmpty) return;

    final userText = _controller.text.trim();
    setState(() {
      _messages.add(ChatMessage(text: userText, isUser: true));
      _isLoading = true;
      _controller.clear();
    });

    _scrollToBottom();

    try {
      final res = await http.post(
        ApiConfig.uri('/api/ai/chat'),
        headers: {
          'Authorization': 'Bearer ${AuthState.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'question': userText,
          'lang': AppLang.current,
        }),
      );

      if (res.statusCode == 200) {
        final resData = jsonDecode(res.body);
        final data = resData['data'] ?? resData;
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: data['answer'] ?? AppLang.tr(
                "Rất tiếc, tôi không thể lấy câu trả lời cho câu hỏi này.",
                "Sorry, I could not retrieve the answer for this question.",
              ),
              isUser: false,
              sources: (data['sources'] as List?)?.join(', '),
              tokensCharged: data['tokens_charged'] != null ? double.tryParse(data['tokens_charged'].toString()) : null,
            ));
          });
          _fetchLatestUserData();
        }
      } else if (res.statusCode == 402) {
        // Handle out of tokens
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: AppLang.tr(
                "Lỗi: Tài khoản của bạn đã hết lượt hoặc số dư token không đủ để tôi phản hồi. Vui lòng nạp thêm lượt.",
                "Error: Your account has run out of credits or has insufficient token balance to get a response. Please top up.",
              ),
              isUser: false,
            ));
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: AppLang.tr(
                "Lỗi kết nối máy chủ (${res.statusCode}). Vui lòng thử lại sau.",
                "Server connection error (${res.statusCode}). Please try again later.",
              ),
              isUser: false,
            ));
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            text: AppLang.tr(
              "Lỗi nội bộ: Không thể kết nối tới AI Engine. Vui lòng kiểm tra lại mạng.",
              "Internal error: Cannot connect to the AI Engine. Please check your network connection.",
            ),
            isUser: false,
          ));
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
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
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4), // Light background to match web chat
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F265C), // Dark blue matching web
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Icon(Icons.auto_awesome, color: Colors.white, size: 20),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'The Archivist AI',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Color(0xFF4CAF50), // Green dot
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        AppLang.tr('Trực tuyến • 0.1 token/câu hỏi', 'Online • 0.1 token/question'),
                        style: const TextStyle(color: Colors.white70, fontSize: 10.5),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Token balance badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.shade300, width: 1),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.monetization_on, color: Colors.amber, size: 14),
                const SizedBox(width: 4),
                Text(
                  '${double.tryParse(AuthState.user?['token_balance']?.toString() ?? '0')?.toStringAsFixed(1) ?? '0.0'}',
                  style: const TextStyle(
                    color: Colors.amber,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white, size: 20),
            onPressed: () => Navigator.pop(context),
            tooltip: AppLang.tr('Đóng', 'Close'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessageBubble(msg);
              },
            ),
          ),
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.grey.shade200, width: 1),
                    ),
                    child: const Center(child: Icon(Icons.auto_awesome, color: Color(0xFF0F265C), size: 18)),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0F265C))),
                        const SizedBox(width: 10),
                        Text(AppLang.tr('AI đang suy nghĩ...', 'AI is thinking...'), style: TextStyle(fontSize: 13, color: Colors.grey.shade500, fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!msg.isUser) ...[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.grey.shade200, width: 1),
              ),
              child: const Center(child: Icon(Icons.auto_awesome, color: Color(0xFF0F265C), size: 18)),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: msg.isUser ? const Color(0xFF0F265C) : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(msg.isUser ? 16 : 4),
                  bottomRight: Radius.circular(msg.isUser ? 4 : 16),
                ),
                border: msg.isUser ? null : Border.all(color: Colors.grey.shade200, width: 1),
                boxShadow: msg.isUser
                    ? [BoxShadow(color: const Color(0xFF0F265C).withOpacity(0.15), blurRadius: 6, offset: const Offset(0, 2))]
                    : [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    msg.text,
                    style: TextStyle(
                      color: msg.isUser ? Colors.white : const Color(0xFF212529),
                      fontSize: 14.5,
                      height: 1.4,
                    ),
                  ),
                  if (msg.sources != null && msg.sources!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    const Divider(height: 1),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.menu_book, size: 12, color: Colors.grey),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            AppLang.tr("Nguồn: ${msg.sources}", "Sources: ${msg.sources}"),
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (msg.tokensCharged != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      "- ${msg.tokensCharged} ${AppLang.tr('lượt', 'tokens')}",
                      style: const TextStyle(fontSize: 10, color: Colors.orange, fontWeight: FontWeight.bold),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (msg.isUser) ...[
            const SizedBox(width: 10),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.grey.shade200,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.grey.shade300, width: 1),
              ),
              child: Center(
                child: Text(
                  AuthState.user?['name']?.toString().isNotEmpty == true ? AuthState.user!['name'][0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F265C)),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200, width: 1)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    enabled: !_isLoading,
                    maxLines: 3,
                    minLines: 1,
                    style: const TextStyle(color: Color(0xFF212529), fontSize: 14.5),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                    decoration: InputDecoration(
                      hintText: AppLang.tr('Hỏi về gốm sứ...', 'Ask about ceramics...'),
                      hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      filled: true,
                      fillColor: const Color(0xFFF8F9FA),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey.shade300, width: 1),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey.shade200, width: 1),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide(color: Colors.grey.shade300, width: 1.2),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Material(
                  color: _controller.text.trim().isEmpty || _isLoading
                      ? Colors.grey.shade200
                      : const Color(0xFF0F265C),
                  shape: const CircleBorder(),
                  child: InkWell(
                    onTap: _isLoading ? null : _sendMessage,
                    customBorder: const CircleBorder(),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Icon(
                        Icons.send,
                        color: _controller.text.trim().isEmpty || _isLoading
                            ? Colors.grey.shade400
                            : Colors.white,
                        size: 18,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.monetization_on, color: Colors.orange, size: 13),
                const SizedBox(width: 4),
                Text(
                  AppLang.tr('Mỗi câu hỏi trừ 0.1 token', 'Each question charges 0.1 token'),
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
