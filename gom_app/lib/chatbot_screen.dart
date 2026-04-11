import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'auth_state.dart';
import 'main.dart';

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
    _messages.add(ChatMessage(
      text: "Xin chào ${AuthState.user?['name'] ?? 'bạn'}.\nTôi là Trợ lý AI giám định gốm sứ GOM AI. Bạn cần hỗ trợ gì về lịch sử, nguồn gốc hay định giá loại gốm nào?",
      isUser: false,
    ));
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
        Uri.parse('http://127.0.0.1:8000/api/ai/chat'),
        headers: {
          'Authorization': 'Bearer ${AuthState.token}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'question': userText}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: data['answer'] ?? "Rất tiếc, tôi không thể lấy được câu trả lời cho câu hỏi này.",
              isUser: false,
              sources: (data['sources'] as List?)?.join(', '),
              tokensCharged: data['tokens_charged'] != null ? double.tryParse(data['tokens_charged'].toString()) : null,
            ));
          });
        }
      } else if (res.statusCode == 402) {
        // Handle out of tokens
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: "Lỗi: Tài khoản của bạn đã hết lượt hoặc số dư token không đủ để tôi phản hồi. Vui lòng nạp thêm lượt.",
              isUser: false,
            ));
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _messages.add(ChatMessage(
              text: "Lỗi kết nối máy chủ (${res.statusCode}). Vui lòng thử lại sau.",
              isUser: false,
            ));
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages.add(ChatMessage(
            text: "Lỗi nội bộ: Không thể kết nối tới AI Engine. Vui lòng kiểm tra lại mạng.",
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
      backgroundColor: const Color(0xFFF5F6FA),
      appBar: AppBar(
        title: const Text('Trợ lý AI Gốm Sứ', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF1A2344),
        automaticallyImplyLeading: false,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              setState(() {
                _messages.clear();
                _messages.add(ChatMessage(
                  text: "Cuộc trò chuyện đã được làm mới. Tôi có thể giúp gì cho bạn?",
                  isUser: false,
                ));
              });
            },
            tooltip: 'Làm mới',
          ),
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: () => Navigator.pop(context),
            tooltip: 'Đóng',
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
                    width: 32,
                    height: 32,
                    decoration: const BoxDecoration(color: Color(0xFF1A2344), shape: BoxShape.circle),
                    child: const Center(child: Icon(Icons.smart_toy, color: Colors.amber, size: 18)),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1A2344))),
                        SizedBox(width: 10),
                        Text('AI đang suy nghĩ...', style: TextStyle(fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic)),
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
              decoration: const BoxDecoration(
                color: Color(0xFF1A2344),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2))],
              ),
              child: const Center(child: Icon(Icons.smart_toy, color: Colors.amber, size: 20)),
            ),
            const SizedBox(width: 10),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: msg.isUser ? const Color(0xFF1A2344) : Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(msg.isUser ? 16 : 4),
                  bottomRight: Radius.circular(msg.isUser ? 4 : 16),
                ),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    msg.text,
                    style: TextStyle(
                      color: msg.isUser ? Colors.white : const Color(0xFF1B1B2F),
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
                            "Nguồn: ${msg.sources}",
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if (msg.tokensCharged != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      "- ${msg.tokensCharged} token",
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
                color: Colors.grey.shade300,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  AuthState.user?['name']?.toString().isNotEmpty == true ? AuthState.user!['name'][0].toUpperCase() : 'U',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54),
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: !_isLoading,
                maxLines: 3,
                minLines: 1,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _sendMessage(),
                decoration: InputDecoration(
                  hintText: 'Nhập câu hỏi của bạn...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  filled: true,
                  fillColor: const Color(0xFFF5F6FA),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Material(
              color: _controller.text.trim().isEmpty || _isLoading ? Colors.grey.shade300 : const Color(0xFF1A2344),
              shape: const CircleBorder(),
              child: InkWell(
                onTap: _isLoading ? null : _sendMessage,
                customBorder: const CircleBorder(),
                child: const Padding(
                  padding: EdgeInsets.all(14),
                  child: Icon(Icons.send_rounded, color: Colors.white, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
