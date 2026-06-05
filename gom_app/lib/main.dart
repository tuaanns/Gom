import 'dart:convert';
import 'package:flutter/material.dart';
import 'auth_state.dart';
import 'payment_screen.dart';
import 'chatbot_screen.dart';
import 'app_theme.dart';

// Feature screens
import 'package:gom_app/features/auth/login_screen.dart';
import 'package:gom_app/features/debate/debate_screen.dart';
import 'package:gom_app/features/history/history_screen.dart';
import 'package:gom_app/features/profile/profile_screen.dart';
import 'package:gom_app/features/ceramics/ceramic_lines_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MultiAgentGomApp());
}

class MultiAgentGomApp extends StatefulWidget {
  const MultiAgentGomApp({Key? key}) : super(key: key);

  static MultiAgentGomAppState? of(BuildContext context) =>
      context.findAncestorStateOfType<MultiAgentGomAppState>();

  @override
  State<MultiAgentGomApp> createState() => MultiAgentGomAppState();
}

class MultiAgentGomAppState extends State<MultiAgentGomApp> {
  static MultiAgentGomAppState? currentInstance;

  @override
  void initState() {
    super.initState();
    currentInstance = this;
  }

  void refreshApp() {
    if (mounted) {
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: AppTheme.isDark ? Brightness.dark : Brightness.light,
        scaffoldBackgroundColor: AppTheme.scaffoldBg,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppTheme.brandNavy,
          brightness: AppTheme.isDark ? Brightness.dark : Brightness.light,
        ),
        useMaterial3: true,
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          contentTextStyle: const TextStyle(fontFamily: 'Roboto', fontWeight: FontWeight.w600),
        ),
      ),
      home: MainGate(),
    );
  }
}

// --- PROFESSIONAL NOTIFICATION UTILITY ---
enum GomNotificationType { success, error, info }

void showGomNotification(BuildContext context, String message, {GomNotificationType type = GomNotificationType.info}) {
  final Color bgColor;
  final IconData icon;
  final String title;

  switch (type) {
    case GomNotificationType.error:
      bgColor = const Color(0xFFE53935);
      icon = Icons.error_outline;
      title = AppLang.tr('Lỗi hệ thống', 'System Error');
      break;
    case GomNotificationType.success:
      bgColor = const Color(0xFF43A047);
      icon = Icons.check_circle_outline;
      title = AppLang.tr('Thành công', 'Success');
      break;
    case GomNotificationType.info:
      bgColor = const Color(0xFF1A2344);
      icon = Icons.info_outline;
      title = AppLang.tr('Thông báo', 'Notification');
      break;
  }

  ScaffoldMessenger.of(context).clearSnackBars();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      duration: const Duration(seconds: 4),
      content: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: bgColor.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), shape: BoxShape.circle),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5)),
                  const SizedBox(height: 2),
                  Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500, fontSize: 14)),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

// --- HELPER ---
String parseErrorMessage(String body, [int? statusCode]) {
  try {
    final data = jsonDecode(body);
    if (data is Map) {
      // Priority 1: friendly error message from format_ai_error
      if (data['detail'] != null) return data['detail'].toString();
      if (data['message'] != null) return data['message'].toString();
      // Priority 2: nested data.message or data.error
      if (data['data'] is Map) {
        final nested = data['data'] as Map;
        if (nested['message'] != null) return nested['message'].toString();
        if (nested['error'] != null) return nested['error'].toString();
      }
      if (data['error'] != null) return data['error'].toString();
      if (data['errors'] != null) {
        final errors = data['errors'];
        if (errors is Map) {
          return errors.values.expand((v) => v is List ? v : [v]).join('\n');
        }
        if (errors is String) return errors;
      }
    }
  } catch (_) {}
  if (statusCode != null) return AppLang.tr('Lỗi máy chủ ($statusCode)', 'Server error ($statusCode)');
  return body.toString();
}

final GlobalKey<MainGateState> mainGateKey = GlobalKey<MainGateState>();

// --- MAIN GATE (Bottom Nav) ---
class MainGate extends StatefulWidget {
  final String? welcomeMessage;
  MainGate({Key? key, this.welcomeMessage}) : super(key: key);

  static MainGateState? get currentInstance => MainGateState._instance;

  @override
  State<MainGate> createState() => MainGateState();
}

class MainGateState extends State<MainGate> {
  static MainGateState? _instance;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _instance = this;
    if (widget.welcomeMessage != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        showGomNotification(context, widget.welcomeMessage!, type: GomNotificationType.success);
      });
    }
  }

  @override
  void dispose() {
    if (_instance == this) _instance = null;
    super.dispose();
  }

  final GlobalKey<DebateScreenState> debateScreenKey = GlobalKey<DebateScreenState>();
  final GlobalKey<HistoryScreenState> historyScreenKey = GlobalKey<HistoryScreenState>();

  void switchTab(int index) {
    if (mounted) {
      setState(() => _currentIndex = index);
      if (index == 0) {
        debateScreenKey.currentState?.loadQuota();
      }
      if (index == 2) {
        historyScreenKey.currentState?.fetchHistory();
      }
    }
  }

  void refreshHistoryTab() {
    historyScreenKey.currentState?.fetchHistory();
  }

  void refreshApp() {
    if (mounted) {
      setState(() {});
    }
    MultiAgentGomAppState.currentInstance?.refreshApp();
  }

  @override
  Widget build(BuildContext context) {
    if (!AuthState.isLoggedIn) {
      return const LoginScreen();
    }

    final debateScreen = DebateScreen(key: debateScreenKey);
    final screens = [
      debateScreen,
      CeramicLinesListScreen(), // New Tab 1: Dòng Gốm Trứ Danh
      HistoryScreen(key: historyScreenKey), // Tab 2: Lịch sử
      PaymentScreen(),          // Tab 3: Nạp lượt
      ProfileScreen(),          // Tab 4: Cá nhân
    ];

    final screenIndex = _currentIndex.clamp(0, screens.length - 1).toInt();

    return Scaffold(
      body: IndexedStack(key: ValueKey(AppLang.current), index: screenIndex, children: screens),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          showGeneralDialog(
            context: context,
            barrierDismissible: true,
            barrierLabel: "Chatbot",
            barrierColor: Colors.black.withOpacity(0.05),
            transitionDuration: const Duration(milliseconds: 250),
            pageBuilder: (context, anim1, anim2) {
              return Align(
                alignment: Alignment.bottomRight,
                child: Padding(
                  padding: EdgeInsets.only(
                    right: 24.0,
                    bottom: MediaQuery.of(context).viewInsets.bottom > 0 ? MediaQuery.of(context).viewInsets.bottom + 10 : 90.0
                  ),
                  child: Material(
                    type: MaterialType.transparency,
                    child: Container(
                      width: 400,
                      height: 600,
                      constraints: BoxConstraints(
                        maxHeight: MediaQuery.of(context).size.height * 0.8,
                        maxWidth: MediaQuery.of(context).size.width * 0.9,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 20, offset: const Offset(0, 10))
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(24),
                        child: const ChatbotScreen(),
                      ),
                    ),
                  ),
                ),
              );
            },
            transitionBuilder: (context, anim1, anim2, child) {
              return SlideTransition(
                position: Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero).animate(CurvedAnimation(parent: anim1, curve: Curves.easeOutCubic)),
                child: FadeTransition(opacity: anim1, child: child),
              );
            },
          );
        },
        backgroundColor: AppTheme.brandNavy,
        elevation: 6,
        child: const Icon(Icons.chat_bubble, color: Colors.white, size: 22),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppTheme.bottomNavBg,
          border: Border(top: BorderSide(color: AppTheme.dividerColor, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: switchTab,
          selectedItemColor: AppTheme.textPrimary,
          unselectedItemColor: AppTheme.textMuted,
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedFontSize: 10,
          unselectedFontSize: 10,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, letterSpacing: 0.5),
          items: [
            BottomNavigationBarItem(icon: const Icon(Icons.museum_outlined), activeIcon: const Icon(Icons.museum), label: AppLang.tr('TRANG CHỦ', 'HOME')),
            BottomNavigationBarItem(icon: const Icon(Icons.grid_view), activeIcon: const Icon(Icons.grid_view_rounded), label: AppLang.tr('DÒNG GỐM', 'CERAMICS')),
            BottomNavigationBarItem(icon: const Icon(Icons.menu_book_outlined), activeIcon: const Icon(Icons.menu_book), label: AppLang.tr('LỊCH SỬ', 'HISTORY')),
            BottomNavigationBarItem(icon: const Icon(Icons.account_balance_wallet_outlined), activeIcon: const Icon(Icons.account_balance_wallet), label: AppLang.tr('NẠP LƯỢT', 'TOP UP')),
            BottomNavigationBarItem(icon: const Icon(Icons.person_outline), activeIcon: const Icon(Icons.person), label: AppLang.tr('CÁ NHÂN', 'PROFILE')),
          ],
        ),
      ),
    );
  }


}
