import 'chatbot_screen.dart';

/// Singleton that holds the chat message history in memory
/// so it survives dialog close/reopen within the same app session.
class ChatHistoryManager {
  static final ChatHistoryManager _instance = ChatHistoryManager._();
  factory ChatHistoryManager() => _instance;
  ChatHistoryManager._();

  /// Persistent message list — shared across ChatbotScreen instances
  final List<ChatMessage> messages = [];

  /// Whether the greeting has already been added
  bool greetingAdded = false;

  /// Clear all history (e.g. on logout)
  void clear() {
    messages.clear();
    greetingAdded = false;
  }
}
