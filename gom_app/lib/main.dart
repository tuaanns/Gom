import 'dart:convert';
import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'auth_state.dart';
import 'payment_screen.dart';
import 'chatbot_screen.dart';
import 'google_btn.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';

import 'package:flutter/foundation.dart' show kIsWeb;

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kIsWeb) {
    await FacebookAuth.i.webAndDesktopInitialize(
      appId: "34850681257911333",
      cookie: true,
      xfbml: true,
      version: "v18.0",
    );
  }
  runApp(const MultiAgentGomApp());
}

class MultiAgentGomApp extends StatelessWidget {
  const MultiAgentGomApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A2344), brightness: Brightness.light),
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
      title = "Lỗi hệ thống";
      break;
    case GomNotificationType.success:
      bgColor = const Color(0xFF43A047);
      icon = Icons.check_circle_outline;
      title = "Thành công";
      break;
    case GomNotificationType.info:
      bgColor = const Color(0xFF1A2344);
      icon = Icons.info_outline;
      title = "Thông báo";
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
String _parseErrorMessage(String body, [int? statusCode]) {
  try {
    final data = jsonDecode(body);
    if (data is Map) {
      if (data['message'] != null) return data['message'].toString();
      if (data['errors'] != null) {
        final errors = data['errors'] as Map;
        return errors.values.expand((v) => v is List ? v : [v]).join('\n');
      }
    }
  } catch (_) {}
  if (statusCode != null) return "Lỗi máy chủ ($statusCode)";
  return body.toString();
}

final GlobalKey<_MainGateState> mainGateKey = GlobalKey<_MainGateState>();

// --- MAIN GATE (Bottom Nav) ---
class MainGate extends StatefulWidget {
  MainGate({Key? key}) : super(key: key);

  static _MainGateState? get currentInstance => _MainGateState._instance;

  @override
  State<MainGate> createState() => _MainGateState();
}

class _MainGateState extends State<MainGate> {
  static _MainGateState? _instance;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _instance = this;
  }

  @override
  void dispose() {
    if (_instance == this) _instance = null;
    super.dispose();
  }

  final GlobalKey<_DebateScreenState> debateScreenKey = GlobalKey<_DebateScreenState>();
  final GlobalKey<_HistoryScreenState> historyScreenKey = GlobalKey<_HistoryScreenState>();

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

  @override
  Widget build(BuildContext context) {
    if (!AuthState.isLoggedIn) {
      return const LoginScreen();
    }

    final debateScreen = DebateScreen(key: debateScreenKey);
    final screens = [
      debateScreen,
      const CeramicLinesListScreen(), // New Tab 1: Dòng Gốm Trứ Danh
      HistoryScreen(key: historyScreenKey), // Tab 2: Lịch sử
      const PaymentScreen(),          // Tab 3: Nạp lượt
      const ProfileScreen(),          // Tab 4: Cá nhân
    ];

    final screenIndex = _currentIndex; // 1:1 mapped

    return Scaffold(
      body: IndexedStack(index: screenIndex, children: screens),
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
                        color: Colors.white,
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
        backgroundColor: const Color(0xFF8B3A3A),
        elevation: 6,
        child: const Icon(Icons.chat_bubble, color: Colors.white, size: 22),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFF5F0E8),
          border: Border(top: BorderSide(color: Colors.brown.shade100, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: switchTab,
          selectedItemColor: const Color(0xFF1A2344),
          unselectedItemColor: const Color(0xFF8B8B8B),
          showUnselectedLabels: true,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.transparent,
          elevation: 0,
          selectedFontSize: 10,
          unselectedFontSize: 10,
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.5),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, letterSpacing: 0.5),
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.museum_outlined), activeIcon: Icon(Icons.museum), label: 'TRANG CHỦ'),
            BottomNavigationBarItem(icon: Icon(Icons.grid_view), activeIcon: Icon(Icons.grid_view_rounded), label: 'DÒNG GỐM'),
            BottomNavigationBarItem(icon: Icon(Icons.menu_book_outlined), activeIcon: Icon(Icons.menu_book), label: 'LỊCH SỬ'),
            BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: 'NẠP LƯỢT'),
            BottomNavigationBarItem(icon: Icon(Icons.person_outline), activeIcon: Icon(Icons.person), label: 'CÁ NHÂN'),
          ],
        ),
      ),
    );
  }
}

// --- LOGIN SCREEN ---
class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool isLoading = false;
  bool _obscurePass = true;

  @override
  void initState() {
    super.initState();
    _initGoogleSignInListener();
  }

  void _initGoogleSignInListener() {
    try {
      GoogleSignIn.instance.initialize();
      GoogleSignIn.instance.authenticationEvents.listen((event) async {
        if (event is GoogleSignInAuthenticationEventSignIn) {
          final account = event.user;
          final auth = account.authentication;
          _sendSocialTokenToBackend('Google', auth.idToken ?? '');
        }
      });
    } catch (_) {}
  }

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _pass.text.trim().isEmpty) {
      showGomNotification(context, "Vui lòng nhập đầy đủ email và mật khẩu", type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/login'),
        body: {'email': _email.text.trim(), 'password': _pass.text},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, "Chào mừng ${data['user']?['name'] ?? 'bạn'} quay trở lại!", type: GomNotificationType.success);
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MainGate()));
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Không thể kết nối đến máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E), // Nền tối như viền trình duyệt
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF9F4), // Màu kem nhạt cho thẻ form
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 30, offset: const Offset(0, 10)),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo
                Image.asset('assets/logo.png', height: 100),
                const SizedBox(height: 32),
                
                // Welcome Text
                const Text(
                  'Chào mừng trở lại',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF222222),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Đăng nhập để sử dụng hệ thống.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF666666),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 40),

                // Email Field
                const Text(
                  'EMAIL',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0EFE9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      hintText: 'email@example.com',
                      hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Password Field
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'MẬT KHẨU',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5),
                    ),
                    InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                      child: Text(
                        'Quên mật khẩu?',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.red.shade700),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0EFE9),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: TextField(
                    controller: _pass,
                    obscureText: _obscurePass,
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      hintStyle: const TextStyle(color: Color(0xFFAAAAAA), fontSize: 14, letterSpacing: 2),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility, color: Colors.grey.shade600, size: 20),
                        onPressed: () => setState(() => _obscurePass = !_obscurePass),
                      ),
                    ),
                    onSubmitted: (_) => _login(),
                  ),
                ),
                const SizedBox(height: 32),

                // Login Button
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F265C), // Dark blue
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isLoading 
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)) 
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Tiếp tục', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              SizedBox(width: 8),
                              Icon(Icons.arrow_forward, size: 18),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 16),

                // Register Link
                Center(
                  child: InkWell(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: RichText(
                        text: const TextSpan(
                          style: TextStyle(fontSize: 13, color: Color(0xFF666666)),
                          children: [
                            TextSpan(text: 'Chưa có tài khoản? '),
                            TextSpan(text: 'Đăng ký ngay', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Divider
                Row(
                  children: [
                    const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text('HOẶC KẾT NỐI QUA', style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                    ),
                    const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                  ],
                ),
                const SizedBox(height: 24),

                // Social Buttons side by side
                Row(
                  mainAxisAlignment: MainAxisAlignment.center, // Center items compactly
                  children: [
                    buildCrossPlatformGoogleButton(
                      onPressed: () => _handleSocialLogin('Google'),
                      customButton: _buildSocialBtn('Google', 'google_logo.png'),
                    ),
                    const SizedBox(width: 16),
                    _buildSocialBtn('Facebook', null, icon: Icons.facebook, iconColor: Colors.blue.shade700),
                  ],
                ),
                const SizedBox(height: 48),

                // Footer
                RichText(
                  textAlign: TextAlign.center,
                  text: const TextSpan(
                    style: TextStyle(fontSize: 10, color: Color(0xFF888888), height: 1.5),
                    children: [
                      TextSpan(text: 'Bằng việc tiếp tục, bạn đồng ý với '),
                      TextSpan(text: 'Điều khoản Dịch vụ', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      TextSpan(text: ' và\n'),
                      TextSpan(text: 'Chính sách Bảo mật', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      TextSpan(text: ' của chúng tôi.'),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSocialBtn(String title, String? imagePath, {IconData? icon, Color? iconColor}) {
    return InkWell(
      onTap: () => _handleSocialLogin(title),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 40, // Match Google button height
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFDADCE0), width: 1.0), // Standard Google outline
          borderRadius: BorderRadius.circular(4), // Match GSI rectangular radius
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min, // Wrap content compactly
          children: [
            if (imagePath != null)
              Image.network(imagePath, width: 18, height: 18)
            else if (icon != null)
              Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w500, // Match Google font weight
                fontFamily: 'Roboto',
                fontSize: 14,
                color: Color(0xFF3C4043),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleSocialLogin(String provider) async {
    setState(() => isLoading = true);
    try {
      if (provider == 'Google') {
        // Google Sign-In trên Web sử dụng renderButton (đã xử lý qua listener)
        // Trên mobile, dùng authenticate()
        try {
          await GoogleSignIn.instance.initialize();
        } catch (_) {}

        late final GoogleSignInAccount account;
        try {
          final acc = await GoogleSignIn.instance.authenticate();
          if (acc == null) {
            setState(() => isLoading = false);
            return;
          }
          account = acc;
        } catch (e) {
          setState(() => isLoading = false);
          print("GOOGLE LOGIN ERROR: $e");
          showGomNotification(context, "Lỗi Google Sign In: $e", type: GomNotificationType.error);
          return;
        }

        final auth = account.authentication;
        _sendSocialTokenToBackend(provider, auth.idToken ?? '');

      } else if (provider == 'Facebook') {
        final LoginResult result = await FacebookAuth.instance.login(permissions: ['email', 'public_profile']);
        if (result.status == LoginStatus.success) {
          final AccessToken accessToken = result.accessToken!;
          _sendSocialTokenToBackend(provider, accessToken.token);
        } else if (result.status == LoginStatus.cancelled) {
          setState(() => isLoading = false);
        } else {
          showGomNotification(context, "Lỗi đăng nhập Facebook: ${result.message}", type: GomNotificationType.error);
          setState(() => isLoading = false);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      showGomNotification(context, "Cấu hình $provider chưa hoàn thiện hoặc bị hủy ($e).", type: GomNotificationType.error);
    }
  }

  Future<void> _sendSocialTokenToBackend(String provider, String token) async {
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/login/social'),
        body: {
          'provider': provider.toLowerCase(),
          'token': token,
        },
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, "Chào mừng ${data['user']?['name'] ?? 'bạn'} quay trở lại qua $provider!", type: GomNotificationType.success);
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MainGate()));
      } else {
        if (!mounted) return;
        final actualEMsg = _parseErrorMessage(res.body, res.statusCode);
        showGomNotification(context, actualEMsg, type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Không thể xác thực token $provider với máy chủ backend.", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }
}

// --- FORGOT PASSWORD SCREEN ---
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({Key? key}) : super(key: key);
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  bool isLoading = false;

  Future<void> _reset() async {
    if (_email.text.trim().isEmpty) return;
    setState(() => isLoading = true);
    
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/forgot-password'),
        body: {'email': _email.text.trim()},
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, "Mã phục hồi đã được gửi về email của bạn.", type: GomNotificationType.success);
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetPasswordScreen(email: _email.text.trim())));
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF9F4),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 30, offset: const Offset(0, 10)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'QUÊN MẬT KHẨU',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F265C),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Nhập email của bạn và chúng tôi sẽ gửi mã khôi phục tài khoản.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Color(0xFF666666), height: 1.4),
                ),
                const SizedBox(height: 32),
                const Text('EMAIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _email,
                    decoration: const InputDecoration(
                      hintText: 'Nhập email liên lạc...',
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _reset,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F265C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isLoading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('Gửi Yêu Cầu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- RESET PASSWORD SCREEN ---
class ResetPasswordScreen extends StatefulWidget {
  final String email;
  const ResetPasswordScreen({Key? key, required this.email}) : super(key: key);
  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _code = TextEditingController();
  final _pass = TextEditingController();
  bool isLoading = false;

  Future<void> _submitReset() async {
    if (_code.text.trim().isEmpty || _pass.text.trim().isEmpty) {
      showGomNotification(context, "Vui lòng nhập mã xác nhận và mật khẩu mới", type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/reset-password'),
        body: {
          'email': widget.email,
          'code': _code.text.trim(),
          'password': _pass.text.trim(),
        },
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", type: GomNotificationType.success);
        Navigator.pop(context); // Go back to login
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
            decoration: BoxDecoration(
              color: const Color(0xFFFAF9F4),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 30, offset: const Offset(0, 10)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'KHÔI PHỤC MẬT KHẨU',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F265C),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Mã xác nhận đã được gửi đến ${widget.email}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF666666), height: 1.4),
                ),
                const SizedBox(height: 32),
                
                const Text('MÃ XÁC NHẬN (6 SỐ)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      hintText: 'Nhập mã gồm 6 chữ số...',
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                const Text('MẬT KHẨU MỚI', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _pass,
                    obscureText: true,
                    decoration: const InputDecoration(
                      hintText: 'Nhập mật khẩu mới...',
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _submitReset,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F265C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isLoading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('Xác Nhận Đổi Mật Khẩu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- REGISTER SCREEN ---
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _passConfirm = TextEditingController();
  bool isLoading = false;

  Future<void> _register() async {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _pass.text.isEmpty) {
      showGomNotification(context, "Vui lòng nhập đầy đủ thông tin", type: GomNotificationType.error);
      return;
    }
    if (_pass.text.length < 6) {
      showGomNotification(context, "Mật khẩu phải có ít nhất 6 ký tự", type: GomNotificationType.error);
      return;
    }
    if (_pass.text != _passConfirm.text) {
      showGomNotification(context, "Mật khẩu xác nhận không khớp", type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/register'),
        body: {
          'name': _name.text.trim(),
          'email': _email.text.trim(),
          'password': _pass.text,
          'password_confirmation': _passConfirm.text,
        },
      );
      if (res.statusCode == 201 || res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, "Đăng ký thành công! Chào mừng ${data['user']?['name'] ?? 'bạn'}!", type: GomNotificationType.success);
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => MainGate()),
          (route) => false,
        );
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  Future<void> _handleSocialLogin(String title) async {
    // Just mock or delegate to the identical login logic for simplicity,
    // usually OIDC auth covers both login and registration exactly the same way.
    showGomNotification(context, "Tính năng đăng nhập/đăng ký một chạm bằng $title đang mở rộng.", type: GomNotificationType.success);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4), // Màu kem nhạt cho nền ứng dụng
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F265C)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'The Archivist',
          style: TextStyle(
            fontFamily: 'Serif',
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: Color(0xFF0F265C),
          ),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.only(top: 24), // Margin before the rounded card
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 48),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(32),
                  topRight: Radius.circular(32),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                boxShadow: [
                  BoxShadow(color: Color(0x0A000000), blurRadius: 40, offset: Offset(0, -10)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title
                  const Text(
                    'Tạo tài khoản mới',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Serif',
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF222222),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Bắt đầu hành trình lưu trữ của bạn',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Color(0xFF666666)),
                  ),
                  const SizedBox(height: 48),

                  // Name Field
                  const Text('HỌ VÀ TÊN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        hintText: 'Nguyễn Văn A',
                        hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Email Field
                  const Text('EMAIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        hintText: 'example@archivist.com',
                        hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Password Field
                  const Text('MẬT KHẨU', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _pass,
                      obscureText: true,
                      decoration: const InputDecoration(
                        hintText: '••••••••',
                        hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14, letterSpacing: 2),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Confirm Password Field
                  const Text('XÁC NHẬN MẬT KHẨU', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _passConfirm,
                      obscureText: true,
                      decoration: const InputDecoration(
                        hintText: '••••••••',
                        hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14, letterSpacing: 2),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Register Button
                  SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: isLoading ? null : _register,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF003882), // Đậm chuẩn thiết kế
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: isLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : const Text('Đăng ký ngay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Divider
                  Row(
                    children: [
                      const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text('HOẶC TIẾP TỤC VỚI', style: TextStyle(color: Color(0xFFAAAAAA), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                      ),
                      const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Social Buttons
                  Row(
                    children: [
                      Expanded(
                        child: buildCrossPlatformGoogleButton(
                          onPressed: () => _handleSocialLogin('Google'),
                          customButton: _buildSocialBtn('Google', 'google_logo.png'),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildSocialBtn('Facebook', null, icon: Icons.facebook, iconColor: Colors.blue.shade700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 48),

                  // Footer Login Link
                  Center(
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 13, color: Color(0xFF666666)),
                            children: [
                              TextSpan(text: 'Đã có tài khoản? '),
                              TextSpan(text: 'Đăng nhập', style: TextStyle(color: Color(0xFF003882), fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSocialBtn(String title, String? imagePath, {IconData? icon, Color? iconColor}) {
    return InkWell(
      onTap: () => _handleSocialLogin(title),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 40, // Match Google button
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFDADCE0), width: 1.0),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (imagePath != null)
              Image.network(imagePath, width: 18, height: 18)
            else if (icon != null)
              Icon(icon, color: iconColor, size: 20),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontFamily: 'Roboto',
                fontSize: 14,
                color: Color(0xFF3C4043),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- DEBATE SCREEN ---
class DebateScreen extends StatefulWidget {
  const DebateScreen({Key? key}) : super(key: key);
  @override
  State<DebateScreen> createState() => _DebateScreenState();
}

class _DebateScreenState extends State<DebateScreen> {
  static const String _baseUrl = 'http://localhost:8000';
  final ImagePicker _picker = ImagePicker();

  Map<String, dynamic>? debateData;
  bool isAnalyzing = false;
  Uint8List? _previewBytes;
  int freeUsed = 0;
  int freeLimit = 5;
  double tokenBalance = 0;
  List<dynamic> _ceramicLines = [];
  bool _loadingCeramics = true;

  @override
  void initState() {
    super.initState();
    loadQuota();
    _loadCeramicLines();
  }

  Future<void> _loadCeramicLines() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/ceramic-lines?featured=1'));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() {
          _ceramicLines = body['data'] ?? [];
          _loadingCeramics = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingCeramics = false);
    }
  }

  Future<void> loadQuota() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/payment/status'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) setState(() {
          freeUsed = (data['free_predictions_used'] ?? 0) as int;
          freeLimit = (data['free_limit'] ?? 5) as int;
          tokenBalance = (data['token_balance'] ?? 0).toDouble();
        });
      }
    } catch (_) {}
  }

  void _logout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Xác nhận đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () {
              AuthState.clear();
              Navigator.of(ctx).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => MainGate()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Chọn nguồn ảnh', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.blue),
              title: const Text('Chụp ảnh từ Camera'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndAnalyze(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.purple),
              title: const Text('Chọn ảnh từ Thư viện'),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndAnalyze(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndAnalyze(ImageSource source) async {
    if (freeUsed >= freeLimit && tokenBalance <= 0) {
      final shouldNavigate = await PaymentGate.checkAndShowGate(context, freeUsed: freeUsed, freeLimit: freeLimit, tokenBalance: tokenBalance);
      if (!shouldNavigate) return;
    }

    final XFile? image = await _picker.pickImage(source: source, maxWidth: 1920, maxHeight: 1920, imageQuality: 85);
    if (image == null) return;

    final bytes = await image.readAsBytes();
    setState(() { _previewBytes = bytes; isAnalyzing = true; debateData = null; });

    try {
      final request = http.MultipartRequest('POST', Uri.parse('$_baseUrl/api/ai/debate'));
      request.headers['Authorization'] = 'Bearer ${AuthState.token}';
      request.files.add(http.MultipartFile.fromBytes('image', bytes, filename: image.name, contentType: MediaType.parse('image/jpeg')));

      final streamedRes = await request.send();
      final response = await http.Response.fromStream(streamedRes);

      if (!mounted) return;

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        setState(() => debateData = body['data']);
        if (body['quota'] != null) {
          setState(() {
            freeUsed = (body['quota']['free_used'] ?? freeUsed) as int;
            tokenBalance = (body['quota']['token_balance'] ?? tokenBalance).toDouble();
          });
        }
        
        // Cập nhật lại lịch sử đồng thời ngầm bên dưới
        _MainGateState._instance?.historyScreenKey.currentState?.fetchHistory();
        
        showGomNotification(context, "Giám định hoàn tất!", type: GomNotificationType.success);
      } else if (response.statusCode == 402) {
        final body = jsonDecode(response.body);
        setState(() {
          freeUsed = (body['free_used'] ?? freeUsed) as int;
          tokenBalance = (body['token_balance'] ?? 0).toDouble();
        });
        if (mounted) {
          PaymentGate.checkAndShowGate(context, freeUsed: freeUsed, freeLimit: freeLimit, tokenBalance: tokenBalance);
        }
      } else {
        showGomNotification(context, "Hệ thống AI gặp lỗi (${response.statusCode})", type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Mất liên lạc với hội đồng giám định", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isAnalyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0E8),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Custom Top Bar ---
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Center(
                  child: Image.asset('assets/logo.png', height: 100),
                ),
              ),

              // --- Hero Text ---
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    const Text(
                      'Nhận dạng\ndòng gốm sứ.',
                      style: TextStyle(
                        fontFamily: 'Serif',
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1A2344),
                        height: 1.2,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // --- Khung Tìm Kiếm Đã Ẩn Tạm Thời ---
                  ],
                ),
              ),

              // --- Upload Card ---
              if (debateData == null && !isAnalyzing) _buildUploadCard(),

              // --- Dòng Gốm Trứ Danh ---
              if (debateData == null && !isAnalyzing) _buildCeramicLinesSection(),

              // --- Preview & Results ---
              if (_previewBytes != null) _buildImagePreview(),
              if (isAnalyzing) _buildLoading(),
              if (debateData != null) ...[
                _buildFinalResultCard(),
                _buildSpecialistSection(),
                _buildDebateLogSection(),

                // --- Nút Nhận Dạng Tiếp ---
                Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        _showImageSourceDialog();
                      },
                      icon: const Icon(Icons.add_a_photo, color: Colors.white, size: 20),
                      label: const Text(
                        'CHỌN ẢNH KHÁC ĐỂ NHẬN DẠNG',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1A2344),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoading() => Padding(
    padding: const EdgeInsets.all(40.0),
    child: Center(
      child: Column(children: [
        const CircularProgressIndicator(color: Color(0xFF1A2344)),
        const SizedBox(height: 20),
        const Text('Các chuyên gia đang tranh biện... (~20s)', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF1A2344))),
      ]),
    ),
  );

  Widget _buildUploadCard() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 24),
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Camera icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF1A2344),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.camera_alt, color: Colors.white, size: 30),
          ),
          const SizedBox(height: 20),
          const Text(
            'Tải ảnh lên để định danh',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Color(0xFF1A2344),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'Chụp ảnh hoặc kéo thả hình ảnh hiện vật\nđể hệ thống AI phân tích niên đại\nvà dòng gốm.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade600,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),

          // Quota info
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: freeUsed < freeLimit || tokenBalance > 0
                  ? const Color(0xFFF0EDE5)
                  : Colors.red.shade50,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              freeUsed < freeLimit
                ? 'Lượt miễn phí: ${freeLimit - freeUsed}/$freeLimit còn lại'
                : tokenBalance > 0
                  ? 'Số dư: ${tokenBalance.toStringAsFixed(0)} lượt'
                  : 'Đã hết lượt! Nạp thêm để tiếp tục.',
              style: TextStyle(
                color: freeUsed < freeLimit || tokenBalance > 0
                    ? const Color(0xFF1A2344)
                    : Colors.redAccent,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          // CTA Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: isAnalyzing ? null : _showImageSourceDialog,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1A2344),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'BẮT ĐẦU NGAY',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
  Widget _buildCeramicLinesSection() => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Dòng Gốm Trứ Danh',
                style: TextStyle(
                  fontFamily: 'Serif',
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF1A2344),
                ),
              ),
              GestureDetector(
                onTap: () {
                  MainGate.currentInstance?.switchTab(1);
                },
                child: Row(
                  children: [
                    Text(
                      'XEM TẤT CẢ',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF1A2344).withOpacity(0.6),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios, size: 12, color: const Color(0xFF1A2344).withOpacity(0.6)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Cards
        if (_loadingCeramics)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator(color: Color(0xFF1A2344), strokeWidth: 2)),
          )
        else if (_ceramicLines.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Center(child: Text('Chưa có dữ liệu dòng gốm', style: TextStyle(color: Colors.grey.shade500))),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: _ceramicLines.take(2).toList().asMap().entries.map((entry) {
                final i = entry.key;
                final c = entry.value;
                final imgUrl = c['image_url'] as String?;
                final name = c['name'] ?? '';
                final era = c['era'] ?? '';
                final desc = c['description'] ?? '';
                final style = c['style'] as String?;
                final tags = style != null ? style.split(',').map((s) => s.trim()).take(2).toList() : <String>[];
                final isEven = i % 2 == 0;

                final imageWidget = ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: imgUrl != null && imgUrl.isNotEmpty
                    ? Image.network(imgUrl, width: 120, height: 110, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 120, height: 110,
                          decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
                          child: const Icon(Icons.image_outlined, color: Colors.grey, size: 36),
                        ),
                      )
                    : Container(
                        width: 120, height: 110,
                        decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.image_outlined, color: Colors.grey, size: 36),
                      ),
                );

                final textWidget = Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(era.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0F265C), letterSpacing: 0.8)),
                      const SizedBox(height: 4),
                      Text(name, style: const TextStyle(fontFamily: 'Serif', fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                      const SizedBox(height: 6),
                      Text(desc, style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.4), maxLines: 3, overflow: TextOverflow.ellipsis),
                      if (tags.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6, runSpacing: 4,
                          children: tags.map((t) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              border: Border.all(color: const Color(0xFF0F265C).withOpacity(0.3)),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(t, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: Color(0xFF0F265C))),
                          )).toList(),
                        ),
                      ],
                    ],
                  ),
                );

                return GestureDetector(
                  onTap: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                      builder: (ctx) => _buildCeramicDetailSheet(c),
                    );
                  },
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 12, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: isEven
                      ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [textWidget, const SizedBox(width: 12), imageWidget])
                      : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [imageWidget, const SizedBox(width: 12), textWidget]),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    ),
  );

  Widget _buildCeramicDetailSheet(dynamic c) => DraggableScrollableSheet(
    initialChildSize: 0.6,
    maxChildSize: 0.85,
    minChildSize: 0.4,
    expand: false,
    builder: (context, scrollController) => SingleChildScrollView(
      controller: scrollController,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 24),
            if (c['image_url'] != null && c['image_url'].toString().isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  c['image_url'].toString().startsWith('http') ? c['image_url'] : 'http://localhost:8000${c['image_url']}',
                  width: double.infinity,
                  height: 220,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
              const SizedBox(height: 20),
            ],
            Text(
              c['name'] ?? '',
              style: const TextStyle(fontFamily: 'Serif', fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF1A2344)),
            ),
            const SizedBox(height: 6),
            Text(
              '${c['origin'] ?? ''}, ${c['country'] ?? ''}',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
            ),
            if (c['era'] != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFF1A2344).withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                child: Text(c['era'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF1A2344))),
              ),
            ],
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            if (c['style'] != null) ...[
              const Text('PHONG CÁCH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: (c['style'] as String).split(',').map((s) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFFF5F0E8), borderRadius: BorderRadius.circular(20)),
                  child: Text(s.trim(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1A2344))),
                )).toList(),
              ),
              const SizedBox(height: 20),
            ],
            if (c['description'] != null) ...[
              const Text('MÔ TẢ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
              const SizedBox(height: 8),
              Text(
                c['description'],
                style: const TextStyle(fontSize: 15, height: 1.6, color: Color(0xFF333333)),
              ),
            ],
          ],
        ),
      ),
    ),
  );

  Widget _buildImagePreview() => Container(
    margin: const EdgeInsets.all(16),
    width: double.infinity,
    constraints: const BoxConstraints(maxHeight: 250),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)]),
    child: ClipRRect(borderRadius: BorderRadius.circular(20), child: Image.memory(_previewBytes!, fit: BoxFit.contain)),
  );

  Widget _buildFinalResultCard() {
    final finalApp = debateData?['final_report'];
    if (finalApp == null) return const SizedBox();
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Card(
        elevation: 4, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: LinearGradient(colors: [Colors.blue.shade50, Colors.white], begin: Alignment.topCenter)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('🏆 KẾT LUẬN CUỐI CÙNG', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A237E))),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Colors.green, borderRadius: BorderRadius.circular(10)),
                child: Text('Độ tin cậy: ${finalApp['certainty']?.toString() ?? finalApp['confidence']?.toString() ?? 'N/A'}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ]),
            const Divider(height: 30),
            Text(finalApp['final_prediction']?.toString() ?? 'Chưa xác định', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.blueAccent)),
            const SizedBox(height: 10),
            Text('Quốc gia: ${finalApp['final_country']?.toString() ?? 'N/A'} | Niên đại: ${finalApp['final_era']?.toString() ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 20),
            const Text('Lập luận tóm tắt:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(finalApp['reasoning']?.toString() ?? '', style: const TextStyle(height: 1.5)),
          ]),
        ),
      ),
    );
  }

  // Helper: format confidence (float 0-1 → percentage, int → as-is)
  String _formatConfidence(dynamic value) {
    if (value == null) return 'N/A';
    if (value is num) {
      if (value <= 1) return '${(value * 100).toStringAsFixed(0)}%';
      return '${value.toStringAsFixed(0)}%';
    }
    return value.toString();
  }

  // Helper: trích xuất giá trị String từ field có thể là Map hoặc String
  String _extractField(dynamic value, [String? mapKey]) {
    if (value == null) return '';
    if (value is String) return value;
    if (value is Map) {
      if (mapKey != null && value.containsKey(mapKey)) return value[mapKey]?.toString() ?? '';
      // Nếu không có key cụ thể, lấy giá trị đầu tiên hoặc toString
      return value.values.first?.toString() ?? '';
    }
    return value.toString();
  }

  // Trích xuất prediction name từ agent data
  String _getAgentPrediction(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is String) return pred;
    if (pred is Map) return pred['ceramic_line']?.toString() ?? pred.values.first?.toString() ?? '';
    return agent['ceramic_line']?.toString() ?? '';
  }

  String _getAgentCountry(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['country'] != null) return pred['country'].toString();
    return agent['country']?.toString() ?? '';
  }

  String _getAgentEra(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['era'] != null) return pred['era'].toString();
    return agent['era']?.toString() ?? '';
  }

  String _getAgentStyle(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['style'] != null) return pred['style'].toString();
    return agent['style']?.toString() ?? '';
  }

  Widget _buildSpecialistSection() {
    final List<dynamic> agents = debateData?['agent_predictions'] ?? [];
    if (agents.isEmpty) return const SizedBox();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: Text('GÓC NHÌN CHUYÊN GIA', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
      SizedBox(
        height: 290,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: agents.length,
          itemBuilder: (context, i) {
            final agent = agents[i] as Map<String, dynamic>? ?? {};
            final colors = [Colors.indigo, Colors.teal, Colors.deepPurple, Colors.orange];
            final color = colors[i % colors.length];
            final predName = _getAgentPrediction(agent);
            final country = _getAgentCountry(agent);
            final era = _getAgentEra(agent);
            final style = _getAgentStyle(agent);
            
            // Lấy 75% chiều rộng màn hình cho mỗi card chuyên gia trên mobile
            double cardWidth = MediaQuery.of(context).size.width * 0.75;
            if (cardWidth > 320) cardWidth = 320;

            return Container(
              width: cardWidth,
              margin: const EdgeInsets.symmetric(horizontal: 6),
              child: Card(
                elevation: 3, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle), child: Icon(Icons.psychology, color: color, size: 20)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(agent['agent_name']?.toString() ?? 'Agent ${i + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: color), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ]),
                    const SizedBox(height: 10),
                    Text(predName.isNotEmpty ? predName : 'Chưa xác định', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    if (country.isNotEmpty || era.isNotEmpty)
                      Text('${country.isNotEmpty ? country : "N/A"} - ${era.isNotEmpty ? era : "N/A"}', style: const TextStyle(color: Colors.grey, fontSize: 12), maxLines: 2, overflow: TextOverflow.ellipsis),
                    if (style.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('Phong cách: $style', style: TextStyle(color: Colors.grey.shade600, fontSize: 11, fontStyle: FontStyle.italic), maxLines: 2, overflow: TextOverflow.ellipsis),
                    ],
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text('Tin cậy: ${_formatConfidence(agent['certainty'] ?? agent['confidence'])}', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ]),
                ),
              ),
            );
          },
        ),
      ),
    ]);
  }

  Widget _buildDebateLogSection() {
    final List<dynamic> agents = debateData?['agent_predictions'] ?? [];
    final hasDebate = agents.any((a) => a is Map && a['debate_details'] != null);
    if (!hasDebate) return const SizedBox();

    final agentColorMap = {
      'GPT': const Color(0xFF3F51B5),
      'Grok': const Color(0xFF009688),
      'Gemini': const Color(0xFF7B1FA2),
    };
    Color _getColor(String name) => agentColorMap.entries
        .firstWhere((e) => name.toLowerCase().contains(e.key.toLowerCase()), orElse: () => const MapEntry('', Color(0xFF607D8B)))
        .value;

    final agentIcons = {
      'GPT': Icons.auto_stories,
      'Grok': Icons.biotech,
      'Gemini': Icons.public,
    };
    IconData _getIcon(String name) => agentIcons.entries
        .firstWhere((e) => name.toLowerCase().contains(e.key.toLowerCase()), orElse: () => const MapEntry('', Icons.psychology))
        .value;

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF1A237E), Color(0xFF283593)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: const Color(0xFF1A237E).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
          ),
          child: Row(children: [
            Container(
              width: 50, height: 50,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.forum_rounded, color: Colors.white, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Phòng Tranh Luận', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white, letterSpacing: 0.5)),
              Text('${agents.where((a) => a is Map && a['debate_details'] != null).length} chuyên gia AI đang trao đổi', style: const TextStyle(fontSize: 12, color: Colors.white70)),
            ])),
            // Avatars overlap
            SizedBox(
              width: 80, height: 36,
              child: Stack(
                children: List.generate(agents.length.clamp(0, 3), (i) {
                  final name = (agents[i] as Map?)?['agent_name']?.toString() ?? '';
                  return Positioned(
                    left: i * 22.0,
                    child: Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(name), border: Border.all(color: Colors.white, width: 2)),
                      child: Icon(_getIcon(name), color: Colors.white, size: 16),
                    ),
                  );
                }),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 20),

        // Debate timeline
        ...agents.asMap().entries.map((entry) {
          final i = entry.key;
          final agentData = entry.value;
          if (agentData is! Map) return const SizedBox();
          final agent = agentData as Map<String, dynamic>;
          final agentName = agent['agent_name']?.toString() ?? 'Agent';
          final debateDetails = agent['debate_details'];
          if (debateDetails == null || debateDetails is! Map) return const SizedBox();

          final debate = debateDetails as Map<String, dynamic>;
          final argument = debate['argument']?.toString() ?? '';
          final defense = debate['defense']?.toString() ?? '';
          final attacks = (debate['attacks'] is List) ? (debate['attacks'] as List) : [];
          final confAdj = debate['confidence_adjustment']?.toString() ?? '';
          final color = _getColor(agentName);
          final icon = _getIcon(agentName);
          final isLast = i == agents.length - 1;

          return Stack(
            children: [
              // Timeline line
              if (!isLast)
                Positioned(
                  top: 40,
                  bottom: 0,
                  left: 19, // Center of the 40x40 circle
                  child: Container(width: 2, color: color.withOpacity(0.15)),
                ),
              // The dot/icon
              Positioned(
                top: 0,
                left: 0,
                child: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [color, color.withOpacity(0.7)]),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))],
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
              ),
              // Card content
              Padding(
                padding: const EdgeInsets.only(left: 60),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Agent name header
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [color.withOpacity(0.08), color.withOpacity(0.02)]),
                        borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
                      ),
                      child: Row(children: [
                        Text(agentName, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 15)),
                        const Spacer(),
                        if (confAdj.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 ? Colors.green.shade50 : Colors.red.shade50,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 ? Icons.trending_up : Icons.trending_down, size: 14, color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 ? Colors.green : Colors.red),
                              const SizedBox(width: 4),
                              Text(confAdj, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 ? Colors.green : Colors.red)),
                            ]),
                          ),
                      ]),
                    ),

                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        // Argument
                        if (argument.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.lightbulb_outline, size: 16, color: color),
                            const SizedBox(width: 6),
                            Text('Lập luận chính', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
                          ]),
                          const SizedBox(height: 6),
                          Text(argument, style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF37474F))),
                          const SizedBox(height: 14),
                        ],

                        // Attacks
                        if (attacks.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.gavel, size: 16, color: Colors.red.shade400),
                            const SizedBox(width: 6),
                            Text('Phản bác đối thủ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.red.shade400)),
                          ]),
                          const SizedBox(height: 6),
                          ...attacks.map((atk) => Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.red.shade100),
                            ),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Container(width: 6, height: 6, margin: const EdgeInsets.only(top: 5), decoration: BoxDecoration(color: Colors.red.shade300, shape: BoxShape.circle)),
                              const SizedBox(width: 10),
                              Expanded(child: Text(atk.toString(), style: const TextStyle(fontSize: 12, height: 1.4))),
                            ]),
                          )),
                          const SizedBox(height: 14),
                        ],

                        // Defense
                        if (defense.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.shield_outlined, size: 16, color: Colors.green.shade600),
                            const SizedBox(width: 6),
                            Text('Bảo vệ quan điểm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green.shade600)),
                          ]),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.green.shade50,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.green.shade100),
                            ),
                            child: Text(defense, style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF2E7D32))),
                          ),
                        ],
                      ]),
                    ),
                  ]),
                ),
              ),
            ],
          );
        }),
      ]),
    );
  }
}

// --- HISTORY SCREEN ---
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({Key? key}) : super(key: key);
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> history = [];
  bool isLoading = true;
  String searchQuery = '';

  List<dynamic> get filteredHistory {
    if (searchQuery.isEmpty) return history;
    return history.where((item) {
      final str = '${item['prediction']} ${item['country']} ${item['era']}'.toLowerCase();
      return str.contains(searchQuery.toLowerCase());
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    fetchHistory();
  }

  Future<void> fetchHistory() async {
    setState(() => isLoading = true);
    try {
      final res = await http.get(
        Uri.parse('http://localhost:8000/api/history'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() => history = body['data'] ?? []);
      }
    } catch (e) {
      debugPrint('History fetch error: $e');
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '';
    try {
      final d = DateTime.parse(raw);
      return '${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Image.asset('assets/logo.png', height: 32),
      ),
      body: RefreshIndicator(
        onRefresh: fetchHistory,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Nhật ký Giám Định', style: TextStyle(fontFamily: 'Serif', fontSize: 30, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                    const SizedBox(height: 8),
                    Text('Xem lại các hiện vật đã được AI phân tích và nhận dạng.', style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5)),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: TextField(
                        onChanged: (val) => setState(() => searchQuery = val),
                        decoration: InputDecoration(
                          hintText: 'Tìm kiếm tên, quốc gia, niên đại...',
                          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                          border: InputBorder.none,
                          icon: Icon(Icons.search, color: Colors.grey.shade500),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
            if (isLoading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: Color(0xFF0F265C))))
            else if (filteredHistory.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.search_off, size: 70, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    Text(searchQuery.isNotEmpty ? 'Không tìm thấy kết quả' : 'Chưa có lịch sử giám định nào', style: TextStyle(color: Colors.grey.shade500, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(searchQuery.isNotEmpty ? 'Thử tìm với từ khóa khác' : 'Hãy chụp ảnh hiện vật để bắt đầu!', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                  ]),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildHistoryCard(filteredHistory[i] as Map<String, dynamic>? ?? {}),
                    childCount: filteredHistory.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final prediction = item['prediction']?.toString() ?? 'Chưa xác định';
    final country = item['country']?.toString() ?? '';
    final era = item['era']?.toString() ?? '';
    final date = _fmtDate(item['created_at']?.toString());
    String imgUrl = item['image_url']?.toString() ?? '';
    if (imgUrl.isNotEmpty && !imgUrl.startsWith('http')) imgUrl = 'http://localhost:8000$imgUrl';
    final data = item['data'] as Map<String, dynamic>?;
    final finalReport = data?['final_report'] as Map<String, dynamic>?;
    final confidence = finalReport?['confidence']?.toString() ?? finalReport?['final_confidence']?.toString();

    return GestureDetector(
      onTap: () {
        if (data != null) Navigator.push(context, MaterialPageRoute(builder: (_) => HistoryDetailScreen(data: data, imageUrl: imgUrl)));
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 15, offset: const Offset(0, 6))]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: imgUrl.isNotEmpty
                ? Image.network(imgUrl, width: double.infinity, height: 200, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(height: 200, width: double.infinity, decoration: const BoxDecoration(color: Color(0xFF1A2344), borderRadius: BorderRadius.vertical(top: Radius.circular(20))), child: const Center(child: Icon(Icons.image_outlined, color: Colors.white38, size: 60))))
                : Container(height: 200, width: double.infinity, decoration: const BoxDecoration(color: Color(0xFF1A2344), borderRadius: BorderRadius.vertical(top: Radius.circular(20))), child: const Center(child: Icon(Icons.image_outlined, color: Colors.white38, size: 60))),
            ),
            if (era.isNotEmpty) Positioned(top: 12, right: 12, child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6), decoration: BoxDecoration(color: Colors.black.withOpacity(0.6), borderRadius: BorderRadius.circular(8)), child: Text(era.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)))),
          ]),
          Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (confidence != null)
              Row(children: [
                Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5), decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.verified, size: 14, color: Colors.green), const SizedBox(width: 4), Text('CHÍNH XÁC $confidence%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green))])),
                const Spacer(),
                Text(date, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ])
            else
              Align(alignment: Alignment.centerRight, child: Text(date, style: TextStyle(fontSize: 11, color: Colors.grey.shade500))),
            const SizedBox(height: 12),
            Text(prediction, style: const TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
            if (country.isNotEmpty) ...[const SizedBox(height: 8), Text('Phát hiện các đặc điểm đặc trưng thuộc dòng gốm $prediction, $country.', style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.5), maxLines: 3, overflow: TextOverflow.ellipsis)],
          ])),
        ]),
      ),
    );
  }
}

// --- HISTORY DETAIL SCREEN ---
class HistoryDetailScreen extends StatelessWidget {
  final Map<String, dynamic> data;
  final String imageUrl;
  const HistoryDetailScreen({Key? key, required this.data, required this.imageUrl}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final finalReport = data['final_report'] as Map<String, dynamic>? ?? {};
    final agents = (data['agent_predictions'] as List?) ?? [];
    final prediction = finalReport['final_prediction']?.toString() ?? 'Chưa xác định';
    final country = finalReport['final_country']?.toString() ?? 'N/A';
    final era = finalReport['final_era']?.toString() ?? 'N/A';
    final reasoning = finalReport['reasoning']?.toString() ?? '';
    final confidence = finalReport['confidence']?.toString() ?? finalReport['final_confidence']?.toString();

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 300,
            pinned: true,
            backgroundColor: const Color(0xFF0F265C),
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(fit: StackFit.expand, children: [
                if (imageUrl.isNotEmpty)
                  Image.network(imageUrl, fit: BoxFit.cover, errorBuilder: (_, __, ___) => Container(color: const Color(0xFF1A2344)))
                else
                  Container(color: const Color(0xFF1A2344)),
                Container(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Colors.black.withOpacity(0.6)]))),
                if (era != 'N/A')
                  Positioned(top: 100, right: 16, child: Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7), decoration: BoxDecoration(color: Colors.black.withOpacity(0.5), borderRadius: BorderRadius.circular(8)), child: Text(era.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)))),
              ]),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (confidence != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.verified, size: 16, color: Colors.green), const SizedBox(width: 6), Text('CHÍNH XÁC $confidence%', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.green))]),
                  ),
                const SizedBox(height: 16),
                Text(prediction, style: const TextStyle(fontFamily: 'Serif', fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                const SizedBox(height: 8),
                Text('$country • $era', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
                const SizedBox(height: 20),
                if (reasoning.isNotEmpty) ...[
                  Container(
                    width: double.infinity, padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)]),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('PHÂN TÍCH CHI TIẾT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F265C), letterSpacing: 1)),
                      const SizedBox(height: 12),
                      Text(reasoning, style: const TextStyle(fontSize: 14, height: 1.7, color: Color(0xFF333333))),
                    ]),
                  ),
                  const SizedBox(height: 24),
                ],
                if (agents.isNotEmpty) ...[
                  const Text('GÓC NHÌN CHUYÊN GIA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F265C), letterSpacing: 1)),
                  const SizedBox(height: 12),
                  ...agents.map((agent) {
                    final a = agent as Map<String, dynamic>? ?? {};
                    final pred = a['prediction'];
                    final name = pred is Map ? pred['ceramic_line']?.toString() ?? '' : pred?.toString() ?? '';
                    final agentCountry = pred is Map ? pred['country']?.toString() ?? '' : a['country']?.toString() ?? '';
                    final agentEra = pred is Map ? pred['era']?.toString() ?? '' : a['era']?.toString() ?? '';
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: const Color(0xFFF0EEDB), borderRadius: BorderRadius.circular(16)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(a['agent_name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F265C))),
                        const SizedBox(height: 6),
                        Text('$name • $agentCountry • $agentEra', style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
                        if (a['evidence'] != null) ...[const SizedBox(height: 8), Text(a['evidence'].toString(), style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.5))],
                      ]),
                    );
                  }),
                ],
                const SizedBox(height: 40),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

// --- PROFILE SCREEN (Read-Only Info + Menu) ---
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {

  void _logout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Xác nhận đăng xuất'),
        content: const Text('Bạn có chắc chắn muốn đăng xuất?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () {
              AuthState.clear();
              Navigator.of(ctx).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => MainGate()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final userName = AuthState.user?['name']?.toString() ?? 'Người dùng';
    final userEmail = AuthState.user?['email']?.toString() ?? '';
    final tokenBalance = AuthState.user?['token_balance'] ?? 0;
    String? avatarUrl = AuthState.user?['avatar']?.toString();
    if (kIsWeb && avatarUrl != null) {
      avatarUrl = avatarUrl.replaceAll('http://localhost/', 'http://localhost:8000/');
    }
    final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Image.asset('assets/logo.png', height: 32),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // TOP BOX - User Profile
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 8))],
              ),
              child: Row(
                children: [
                  // Avatar with check badge
                  Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 8, offset: const Offset(0, 4))],
                        ),
                        child: CircleAvatar(
                          radius: 34,
                          backgroundColor: Colors.grey.shade200,
                          backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
                          child: (avatarUrl == null || avatarUrl.isEmpty) ? Text(initial, style: const TextStyle(fontSize: 24, color: Color(0xFF0F265C))) : null,
                        ),
                      ),
                      Positioned(
                        bottom: 0, right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(1),
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: const Icon(Icons.check_circle, color: Color(0xFF0F265C), size: 22),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(width: 20),
                  // Name and Email
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(userName, style: const TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFDCC8A9), shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Expanded(child: Text('Email: $userEmail', style: TextStyle(color: Colors.grey.shade600, fontSize: 13), overflow: TextOverflow.ellipsis)),
                          ],
                        ),
                      ],
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            // SỐ DƯ HIỆN TẠI (navy blue box)
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(color: const Color(0xFF0F265C), borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: const Color(0xFF0F265C).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))]),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('SỐ DƯ HIỆN TẠI', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      Icon(Icons.inventory_2_outlined, color: Colors.white.withOpacity(0.1), size: 40),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${double.tryParse(tokenBalance.toString())?.toInt() ?? 0}', style: const TextStyle(fontFamily: 'Serif', color: Colors.white, fontSize: 44, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      const Padding(
                        padding: EdgeInsets.only(bottom: 10),
                        child: Text('lượt', style: TextStyle(color: Colors.white70, fontSize: 16)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () => MainGate.currentInstance?.switchTab(3),
                      icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0F265C), size: 18),
                      label: const Text('Nạp lượt phân tích', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 36),

            const Text('Quản lý tài khoản', style: TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
            const SizedBox(height: 16),

            _buildMenuItem(Icons.edit_outlined, 'Cập nhật thông tin', 'Thay đổi thông tin liên lạc và tiểu sử', () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen()));
              if (mounted) setState(() {});
            }),
            _buildMenuItem(Icons.lock_outline, 'Đổi mật khẩu', 'Bảo mật tài khoản của bạn', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen()))),
            _buildMenuItem(Icons.receipt_long_outlined, 'Lịch sử giao dịch', 'Xem lại các lượt đã nạp và sử dụng', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TransactionHistoryScreen()))),
            _buildMenuItem(Icons.logout, 'Đăng xuất', 'Thoát khỏi tài khoản hiện tại', () => _logout(context), isDestructive: true),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle, VoidCallback onTap, {bool isDestructive = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: const Color(0xFFF0EEDB), borderRadius: BorderRadius.circular(16)),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))]),
                  child: Icon(icon, color: isDestructive ? Colors.red : const Color(0xFF0F265C), size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDestructive ? Colors.red : const Color(0xFF0F265C))),
                      const SizedBox(height: 2),
                      Text(subtitle, style: TextStyle(fontSize: 11, color: isDestructive ? Colors.red.shade300 : Colors.grey.shade600)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- EDIT PROFILE SCREEN ---
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({Key? key}) : super(key: key);
  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  XFile? _avatarFile;
  bool isUpdating = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: AuthState.user?['name'] ?? '');
    _emailCtrl = TextEditingController(text: AuthState.user?['email'] ?? '');
    _phoneCtrl = TextEditingController(text: AuthState.user?['phone'] ?? '');
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() => _avatarFile = pickedFile);
    }
  }

  String _formatUpdatedAt(String? raw) {
    if (raw == null || raw.isEmpty) return 'Hôm nay.';
    try {
      final d = DateTime.parse(raw).toLocal();
      return '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year} ${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return 'Hôm nay.';
    }
  }

  Future<void> _updateProfile() async {
    setState(() => isUpdating = true);
    try {
      final uri = Uri.parse('http://localhost:8000/api/profile/update');
      final request = http.MultipartRequest('POST', uri);
      request.headers['Authorization'] = 'Bearer ${AuthState.token}';
      request.fields['name'] = _nameCtrl.text.trim();
      request.fields['email'] = _emailCtrl.text.trim();
      request.fields['phone'] = _phoneCtrl.text.trim();

      if (_avatarFile != null) {
        final bytes = await _avatarFile!.readAsBytes();
        String originalName = _avatarFile!.name;
        if (!originalName.toLowerCase().endsWith('.jpg') && 
            !originalName.toLowerCase().endsWith('.png') && 
            !originalName.toLowerCase().endsWith('.jpeg')) {
          originalName += '.jpg'; // Fallback so Laravel passes mime validation
        }
        request.files.add(http.MultipartFile.fromBytes(
          'avatar', 
          bytes, 
          filename: originalName,
          contentType: MediaType('image', 'jpeg')
        ));
      }

      final streamedResponse = await request.send();
      final res = await http.Response.fromStream(streamedResponse);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, "Cập nhật hồ sơ thành công!", type: GomNotificationType.success);
        Navigator.pop(context); // Trở về trang trước đó (ProfileScreen)
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      print("Lỗi upload: $e");
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ: ${e.toString().split(':').first}", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    String? currentAvatarUrl = AuthState.user?['avatar'] as String?;
    if (kIsWeb && currentAvatarUrl != null) {
      currentAvatarUrl = currentAvatarUrl.replaceAll('http://localhost/', 'http://localhost:8000/');
      currentAvatarUrl = currentAvatarUrl.replaceAll('http://localhost:8000/', 'http://localhost:8000/');
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F265C)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Cập nhật thông tin cá nhân',
          style: TextStyle(fontFamily: 'Serif', color: Color(0xFF0F265C), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 14,
              backgroundColor: Colors.grey.shade300,
              backgroundImage: currentAvatarUrl != null ? NetworkImage(currentAvatarUrl) : null,
              child: currentAvatarUrl == null ? const Icon(Icons.person, size: 18, color: Colors.white) : null,
            ),
          )
        ],
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Avatar Section
                Center(
                  child: GestureDetector(
                    onTap: _pickAvatar,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 100, height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))],
                            image: DecorationImage(
                              image: _avatarFile != null 
                                  ? MemoryImage(isUpdating ? Uint8List(0) : Uint8List(0)) /* MOCK for quick hack, better to load bytes natively or use NetworkImage */
                                  : (currentAvatarUrl != null ? NetworkImage(currentAvatarUrl) : const NetworkImage('https://via.placeholder.com/150')) as ImageProvider,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const Positioned(
                          bottom: 0, right: 0,
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: Color(0xFF003882),
                            child: Icon(Icons.camera_alt, color: Colors.white, size: 16),
                          ),
                        )
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: InkWell(
                    onTap: _pickAvatar,
                    child: const Text('THAY ĐỔI ẢNH ĐẠI DIỆN', style: TextStyle(color: Color(0xFF003882), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  ),
                ),
                const SizedBox(height: 32),

                // Full Name
                const Text('FULL NAME', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _nameCtrl,
                    decoration: const InputDecoration(
                      border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.person_outline, color: Color(0xFFCCCCCC)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Email
                const Text('EMAIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.email_outlined, color: Color(0xFFCCCCCC)),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Phone Number
                const Text('PHONE NUMBER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      border: InputBorder.none, contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.phone_outlined, color: Color(0xFFCCCCCC)),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Visual Cards (Bảo mật, Lịch sử)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.security, color: Color(0xFF003882), size: 20),
                            const SizedBox(height: 8),
                            const Text('Bảo mật', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E1E1E))),
                            const SizedBox(height: 4),
                            Text('Thông tin của bạn được mã hóa an toàn.', style: TextStyle(fontSize: 10, color: Colors.grey.shade600, height: 1.3)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.history, color: Color(0xFF8B3A3A), size: 20),
                            const SizedBox(height: 8),
                            const Text('Lịch sử', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E1E1E))),
                            const SizedBox(height: 4),
                            Text('Cập nhật lần cuối vào\n${_formatUpdatedAt(AuthState.user?['updated_at']?.toString())}', style: TextStyle(fontSize: 10, color: Colors.grey.shade600, height: 1.3)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                // Save Button
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isUpdating ? null : _updateProfile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF003882),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isUpdating
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('Lưu Thay Đổi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- CHANGE PASSWORD SCREEN ---
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({Key? key}) : super(key: key);
  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _oldPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool isChangingPass = false;
  bool _obscureOldPass = true;

  @override
  void initState() {
    super.initState();
    _newPassCtrl.addListener(() {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _oldPassCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }

  int get _passwordStrength {
    final p = _newPassCtrl.text;
    if (p.isEmpty) return 0;
    if (p.length < 6) return 1;
    int score = 1;
    if (p.length >= 8) score++;
    if (p.contains(RegExp(r'[A-Za-z]')) && p.contains(RegExp(r'[0-9]'))) score++;
    if (p.contains(RegExp(r'[!@#\$%^&*(),.?":{}|<>]'))) score++;
    return score.clamp(1, 4);
  }

  Future<void> _changePassword() async {
    if (_newPassCtrl.text.length < 6) {
      showGomNotification(context, "Mật khẩu mới phải có ít nhất 6 ký tự", type: GomNotificationType.error);
      return;
    }
    if (_newPassCtrl.text != _confirmPassCtrl.text) {
      showGomNotification(context, "Mật khẩu xác nhận không khớp", type: GomNotificationType.error);
      return;
    }
    setState(() => isChangingPass = true);
    try {
      final res = await http.post(
        Uri.parse('http://localhost:8000/api/profile/password'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
        body: {
          'old_password': _oldPassCtrl.text,
          'password': _newPassCtrl.text,
          'password_confirmation': _confirmPassCtrl.text,
        },
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, "Đổi mật khẩu thành công!", type: GomNotificationType.success);
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isChangingPass = false);
    }
  }

  Widget _buildTextField(String label, String hint, TextEditingController controller, IconData icon, {bool obscure = true, VoidCallback? onIconTap}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: Color(0xFF5A6682),
          ),
        ),
        const SizedBox(height: 10),
        Container(
          height: 56,
          decoration: BoxDecoration(
            color: const Color(0xFFF3F0E6),
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: const TextStyle(color: Color(0xFF0F265C), fontSize: 15),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: const TextStyle(color: Color(0xFFB0B7C6), fontSize: 15),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
              suffixIcon: GestureDetector(
                onTap: onIconTap,
                child: Icon(icon, color: const Color(0xFFB0B7C6), size: 20),
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final strength = _passwordStrength;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F265C)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Đổi mật khẩu',
          style: TextStyle(fontFamily: 'Serif', color: Color(0xFF0F265C), fontWeight: FontWeight.bold, fontSize: 18),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 10),
                const Text(
                  'An toàn & Bảo\nmật',
                  style: TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 38,
                    height: 1.15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0F265C),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Cập nhật mật khẩu thường xuyên để bảo vệ\ntài khoản của bạn.',
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFF5A6682),
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 48),
                
                _buildTextField(
                  'Mật khẩu hiện tại', 
                  '••••••••', 
                  _oldPassCtrl, 
                  _obscureOldPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  obscure: _obscureOldPass,
                  onIconTap: () => setState(() => _obscureOldPass = !_obscureOldPass),
                ),
                const SizedBox(height: 24),
                
                _buildTextField('Mật khẩu mới', 'Tối thiểu 8 ký tự', _newPassCtrl, Icons.lock_outline),
                const SizedBox(height: 12),
                
                // Password strength indicator
                Row(
                  children: [
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 1 ? const Color(0xFF0F265C) : const Color(0xFFDFDBCF), borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 2 ? const Color(0xFF0F265C) : const Color(0xFFDFDBCF), borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 3 ? const Color(0xFF0F265C) : const Color(0xFFDFDBCF), borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 4 ? const Color(0xFF0F265C) : const Color(0xFFDFDBCF), borderRadius: BorderRadius.circular(2)))),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(strength >= 3 ? Icons.check_circle : Icons.info_outline, color: strength >= 3 ? const Color(0xFF0F265C) : Colors.grey, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      strength < 2 ? 'MẬT KHẨU YẾU' : (strength < 3 ? 'MẬT KHẨU TRUNG BÌNH' : 'MẬT KHẨU MẠNH'), 
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: strength >= 3 ? const Color(0xFF0F265C) : Colors.grey, letterSpacing: 0.5)
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                _buildTextField('Xác nhận mật khẩu mới', 'Nhập lại mật khẩu mới', _confirmPassCtrl, Icons.verified_user_outlined),
                const SizedBox(height: 48),
                
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E4D5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFC0A57C),
                          shape: BoxShape.rectangle,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.lightbulb_outline, color: Color(0xFF514C3D), size: 22),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Gợi ý bảo mật', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF514C3D))),
                            SizedBox(height: 6),
                            Text('Sử dụng tổ hợp chữ hoa, chữ thường, số và ký hiệu đặc biệt để tăng tính bảo mật cho tài khoản của bạn.', style: TextStyle(fontSize: 11, color: Color(0xFF514C3D), height: 1.5)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 42),
                
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: isChangingPass ? null : _changePassword,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F265C),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: isChangingPass 
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Cập nhật mật khẩu', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                              SizedBox(width: 8),
                              Icon(Icons.arrow_forward, color: Colors.white, size: 18),
                            ],
                          )
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                    child: RichText(
                      text: const TextSpan(
                        style: TextStyle(color: Color(0xFF8B8B8B), fontSize: 13),
                        children: [
                          TextSpan(text: 'Bạn quên mật khẩu hiện tại? '),
                          TextSpan(text: 'Nhấn vào đây', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 60),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- CERAMIC LINES LIST SCREEN (Full list) ---
class CeramicLinesListScreen extends StatefulWidget {
  const CeramicLinesListScreen({Key? key}) : super(key: key);
  @override
  State<CeramicLinesListScreen> createState() => _CeramicLinesListScreenState();
}

class _CeramicLinesListScreenState extends State<CeramicLinesListScreen> {
  static const String _baseUrl = 'http://localhost:8000';
  List<dynamic> _allLines = [];
  List<dynamic> _filteredLines = [];
  bool _isLoading = true;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/ceramic-lines'));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() {
          _allLines = body['data'] ?? [];
          _filteredLines = _allLines;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onSearch(String query) {
    if (query.isEmpty) {
      setState(() => _filteredLines = _allLines);
      return;
    }
    final q = query.toLowerCase();
    setState(() {
      _filteredLines = _allLines.where((c) {
        return (c['name'] ?? '').toString().toLowerCase().contains(q) ||
               (c['origin'] ?? '').toString().toLowerCase().contains(q) ||
               (c['country'] ?? '').toString().toLowerCase().contains(q) ||
               (c['style'] ?? '').toString().toLowerCase().contains(q);
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Image.asset('assets/logo.png', height: 32),
      ),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF0F265C)))
        : CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Các Dòng Gốm Trứ Danh',
                          style: TextStyle(fontFamily: 'Serif', fontSize: 30, fontWeight: FontWeight.bold, color: Color(0xFF0F265C)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Một thư viện kỹ thuật số lưu giữ những kiệt tác gốm sứ qua các triều đại lừng lẫy.',
                          style: TextStyle(fontSize: 14, color: Colors.grey.shade600, height: 1.5),
                        ),
                        const SizedBox(height: 20),
                        // Search
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF0EEDB),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.search, color: Colors.grey.shade500, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: TextField(
                                  controller: _searchCtrl,
                                  onChanged: _onSearch,
                                  decoration: InputDecoration(
                                    hintText: 'Tìm kiếm triều đại hoặc phong cách...',
                                    hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
              // Cards
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final c = _filteredLines[i];
                      final isEven = i % 2 == 0;
                      return _buildCeramicCard(c, isEven);
                    },
                    childCount: _filteredLines.length,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
    );
  }

  Widget _buildCeramicCard(dynamic c, bool imageOnRight) {
    final imgUrl = c['image_url'] as String?;
    final name = c['name'] ?? '';
    final era = c['era'] ?? '';
    final desc = c['description'] ?? '';
    final style = c['style'] as String?;
    final tags = style != null ? style.split(',').map((s) => s.trim()).take(3).toList() : <String>[];

    final imageWidget = ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: imgUrl != null && imgUrl.isNotEmpty
        ? Image.network(imgUrl, width: 130, height: 120, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: 130, height: 120,
              decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.image_outlined, color: Colors.grey, size: 40),
            ),
          )
        : Container(
            width: 130, height: 120,
            decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.image_outlined, color: Colors.grey, size: 40),
          ),
    );

    final textWidget = Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(era.toUpperCase(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0F265C), letterSpacing: 0.8)),
          const SizedBox(height: 6),
          Text(name, style: const TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
          const SizedBox(height: 8),
          Text(desc, style: TextStyle(fontSize: 12, color: Colors.grey.shade600, height: 1.4), maxLines: 4, overflow: TextOverflow.ellipsis),
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6, runSpacing: 4,
              children: tags.map((t) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF0F265C).withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(t, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF0F265C))),
              )).toList(),
            ),
          ],
        ],
      ),
    );

    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          builder: (ctx) => _buildDetailSheet(c),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 6))],
        ),
        child: imageOnRight
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [textWidget, const SizedBox(width: 14), imageWidget])
          : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [imageWidget, const SizedBox(width: 14), textWidget]),
      ),
    );
  }

  Widget _buildDetailSheet(dynamic c) {
    final imgUrl = c['image_url'] as String?;
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (context, sc) => SingleChildScrollView(
        controller: sc,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 24),
              if (imgUrl != null && imgUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(imgUrl, width: double.infinity, height: 200, fit: BoxFit.cover),
                ),
              if (imgUrl != null && imgUrl.isNotEmpty) const SizedBox(height: 20),
              Text(c['name'] ?? '', style: const TextStyle(fontFamily: 'Serif', fontSize: 26, fontWeight: FontWeight.w900, color: Color(0xFF0F265C))),
              const SizedBox(height: 6),
              Text('${c['origin'] ?? ''}, ${c['country'] ?? ''}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.grey.shade600)),
              if (c['era'] != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: const Color(0xFF0F265C).withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                  child: Text(c['era'], style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0F265C))),
                ),
              ],
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              if (c['style'] != null) ...[
                const Text('PHONG CÁCH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8, runSpacing: 6,
                  children: (c['style'] as String).split(',').map((s) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFFF0EEDB), borderRadius: BorderRadius.circular(20)),
                    child: Text(s.trim(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F265C))),
                  )).toList(),
                ),
                const SizedBox(height: 20),
              ],
              if (c['description'] != null) ...[
                const Text('MÔ TẢ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
                const SizedBox(height: 8),
                Text(c['description'], style: const TextStyle(fontSize: 15, height: 1.6, color: Color(0xFF333333))),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// --- TRANSACTION HISTORY SCREEN ---
class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({Key? key}) : super(key: key);
  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  static const String _baseUrl = 'http://localhost:8000';
  bool _isLoading = true;
  List<dynamic> _transactions = [];

  @override
  void initState() {
    super.initState();
    _fetchTransactions();
  }

  Future<void> _fetchTransactions() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/payment/history'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _transactions = body['data'] ?? [];
            _isLoading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '';
    try {
      final d = DateTime.parse(raw);
      return '${d.day}/${d.month}/${d.year} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF0F265C)),
        title: const Text('Lịch sử giao dịch', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold, fontFamily: 'Serif', fontSize: 18)),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _transactions.isEmpty
          ? const Center(child: Text('Chưa có giao dịch nào', style: TextStyle(color: Colors.grey)))
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              itemCount: _transactions.length,
              itemBuilder: (ctx, i) {
                final tx = _transactions[i];
                final isAdd = tx['type'] == 'in';
                final amount = tx['amount'] ?? 0;
                final desc = tx['description'] ?? 'Giao dịch';
                final date = _fmtDate(tx['created_at']);
                
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: isAdd ? Colors.green.withOpacity(0.1) : Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                        child: Icon(isAdd ? Icons.arrow_downward : Icons.arrow_upward, color: isAdd ? Colors.green : Colors.orange, size: 20),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(desc, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F265C)), maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text(date, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${isAdd ? '+' : '-'}${double.tryParse(amount.toString())?.toInt() ?? amount}',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: isAdd ? Colors.green : Colors.orange),
                      ),
                      const SizedBox(width: 4),
                      Text('lượt', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    ],
                  ),
                );
              },
            ),
    );
  }
}