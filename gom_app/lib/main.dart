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
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A237E), brightness: Brightness.light),
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
      bgColor = const Color(0xFF1A237E);
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
  MainGate({Key? key}) : super(key: mainGateKey);

  @override
  State<MainGate> createState() => _MainGateState();
}

class _MainGateState extends State<MainGate> {
  int _currentIndex = 0;

  void switchTab(int index) {
    if (mounted) {
      setState(() => _currentIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!AuthState.isLoggedIn) {
      return const LoginScreen();
    }

    final screens = [
      const DebateScreen(),
      const HistoryScreen(),
      const PaymentScreen(),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
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
        backgroundColor: const Color(0xFF1A237E),
        elevation: 6,
        child: const Icon(Icons.chat_bubble_outline, color: Colors.white),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        selectedItemColor: const Color(0xFF1A237E),
        unselectedItemColor: Colors.grey.shade500,
        showUnselectedLabels: true,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.psychology), label: 'Phân tích'),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Lịch sử'),
          BottomNavigationBarItem(icon: Icon(Icons.account_balance_wallet_outlined), activeIcon: Icon(Icons.account_balance_wallet), label: 'Nạp lượt'),
        ],
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
        Uri.parse('http://127.0.0.1:8000/api/login'),
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
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF1A237E), Color(0xFF3949AB)]),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: const Color(0xFF1A237E).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))],
                  ),
                  child: const Center(child: Text('🏺', style: TextStyle(fontSize: 36))),
                ),
                const SizedBox(height: 20),
                const Text('GOM AI', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF1A237E), letterSpacing: 2)),
                const SizedBox(height: 6),
                const Text('Hệ thống nhận dạng gốm sứ đa tác vụ', style: TextStyle(color: Colors.grey, fontSize: 13)),
                const SizedBox(height: 40),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: InputDecoration(
                    labelText: 'Email', prefixIcon: const Icon(Icons.email_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _pass, obscureText: _obscurePass,
                  decoration: InputDecoration(
                    labelText: 'Mật khẩu', prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePass ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscurePass = !_obscurePass),
                    ),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onSubmitted: (_) => _login(),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1A237E), foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: isLoading ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Đăng Nhập', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RegisterScreen())),
                  child: const Text('Chưa có tài khoản? Đăng ký ngay'),
                ),
                const SizedBox(height: 32),
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text('Hoặc đăng nhập bằng', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    buildCrossPlatformGoogleButton(
                      onPressed: () => _handleSocialLogin('Google'),
                      customButton: _buildSocialBtn('Google', Colors.red.shade600, 'G'),
                    ),
                    const SizedBox(width: 20),
                    _buildSocialBtn('Facebook', Colors.blue.shade800, 'f'),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSocialBtn(String provider, Color color, String letter) {
    final isGoogle = provider == 'Google';
    final isFacebook = provider == 'Facebook';

    return InkWell(
      onTap: () => _handleSocialLogin(provider),
      borderRadius: BorderRadius.circular(20),
      splashColor: color.withOpacity(0.1),
      highlightColor: color.withOpacity(0.05),
      child: Container(
        width: 130, // Chiều rộng tương tự nút Google "Đăng nhập"
        height: 40, // Chuẩn chiều cao Google Button
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey.shade300, width: 1.0),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(width: 8),
            if (isGoogle)
              Image.network('google_logo.png', width: 18, height: 18)
            else if (isFacebook)
              Icon(Icons.facebook, color: color, size: 20)
            else
              Text(letter, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(width: 14),
            Text(
              "Facebook", // Text rút gọn cho đồng bộ với "Đăng nhập"
              style: TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
                color: Colors.grey.shade800,
                letterSpacing: 0.2,
                fontFamily: 'Roboto',
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
        Uri.parse('http://127.0.0.1:8000/api/login/social'),
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
        Uri.parse('http://127.0.0.1:8000/api/register'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đăng ký tài khoản', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(32),
            child: Column(
              children: [
                TextField(controller: _name, decoration: InputDecoration(labelText: 'Họ tên', prefixIcon: const Icon(Icons.person_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 16),
                TextField(controller: _email, keyboardType: TextInputType.emailAddress, decoration: InputDecoration(labelText: 'Email', prefixIcon: const Icon(Icons.email_outlined), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 16),
                TextField(controller: _pass, obscureText: true, decoration: InputDecoration(labelText: 'Mật khẩu (≥6 ký tự)', prefixIcon: const Icon(Icons.lock_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 16),
                TextField(controller: _passConfirm, obscureText: true, decoration: InputDecoration(labelText: 'Xác nhận mật khẩu', prefixIcon: const Icon(Icons.check_circle_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _register,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1A237E), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: isLoading ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Đăng Ký', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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

// --- DEBATE SCREEN ---
class DebateScreen extends StatefulWidget {
  const DebateScreen({Key? key}) : super(key: key);
  @override
  State<DebateScreen> createState() => _DebateScreenState();
}

class _DebateScreenState extends State<DebateScreen> {
  static const String _baseUrl = 'http://127.0.0.1:8000';
  final ImagePicker _picker = ImagePicker();

  Map<String, dynamic>? debateData;
  bool isAnalyzing = false;
  Uint8List? _previewBytes;
  int freeUsed = 0;
  int freeLimit = 5;
  double tokenBalance = 0;

  @override
  void initState() {
    super.initState();
    _loadQuota();
  }

  Future<void> _loadQuota() async {
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

  Future<void> _pickAndAnalyze() async {
    if (freeUsed >= freeLimit && tokenBalance <= 0) {
      final shouldNavigate = await PaymentGate.checkAndShowGate(context, freeUsed: freeUsed, freeLimit: freeLimit, tokenBalance: tokenBalance);
      if (!shouldNavigate) return;
    }

    final XFile? image = await _picker.pickImage(source: ImageSource.gallery, maxWidth: 1920, maxHeight: 1920, imageQuality: 85);
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
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        title: const Text('🏺 Gom AI', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: const Color(0xFF1A237E),
        actions: [
          PopupMenuButton<String>(
            onSelected: (val) {
              if (val == 'logout') _logout();
              else if (val == 'history') mainGateKey.currentState?.switchTab(1);
              else if (val == 'payment') mainGateKey.currentState?.switchTab(2);
              else if (val == 'profile') Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
            },
            offset: const Offset(0, 50),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(children: [
                CircleAvatar(backgroundColor: Colors.white24, radius: 16, child: Text(AuthState.user?['name']?.toString().isNotEmpty == true ? AuthState.user!['name'][0].toUpperCase() : 'U', style: const TextStyle(color: Colors.white, fontSize: 12))),
                const SizedBox(width: 8),
                Text(AuthState.user?['name'] ?? 'Người dùng', style: const TextStyle(color: Colors.white, fontSize: 14)),
                const Icon(Icons.arrow_drop_down, color: Colors.white),
              ]),
            ),
            itemBuilder: (context) => [
              PopupMenuItem(
                enabled: false,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Xin chào,', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  Text(AuthState.user?['name'] ?? 'Bạn', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black)),
                  const Divider(),
                ]),
              ),
              const PopupMenuItem(value: 'profile', child: Row(children: [Icon(Icons.person_outline, size: 20), SizedBox(width: 10), Text('Hồ sơ của tôi')])),
              const PopupMenuItem(value: 'history', child: Row(children: [Icon(Icons.history, size: 20), SizedBox(width: 10), Text('Lịch sử')])),
              const PopupMenuItem(value: 'payment', child: Row(children: [Icon(Icons.account_balance_wallet, size: 20), SizedBox(width: 10), Text('Nạp lượt')])),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'logout', child: Row(children: [Icon(Icons.logout, size: 20, color: Colors.red), SizedBox(width: 10), Text('Đăng xuất', style: TextStyle(color: Colors.red))])),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            _buildUploadHeader(),
            if (_previewBytes != null) _buildImagePreview(),
            if (isAnalyzing) _buildLoading(),
            if (debateData != null) ...[
              _buildFinalResultCard(),
              _buildSpecialistSection(),
              _buildDebateLogSection(),
            ],
            const SizedBox(height: 50),
          ],
        ),
      ),
    );
  }

  Widget _buildLoading() => const Padding(
    padding: EdgeInsets.all(40.0),
    child: Column(children: [
      CircularProgressIndicator(),
      SizedBox(height: 20),
      Text('Các chuyên gia đang tranh biện... (~20s)', style: TextStyle(fontWeight: FontWeight.w600)),
    ]),
  );

  Widget _buildUploadHeader() => Container(
    width: double.infinity,
    color: const Color(0xFF1A237E),
    padding: const EdgeInsets.only(bottom: 24, left: 16, right: 16),
    child: Column(children: [
      const Text('Hệ thống Multi-Agent AI (GPT, Grok, Gemini)', style: TextStyle(color: Colors.white70)),
      const SizedBox(height: 8),
      Container(
        margin: const EdgeInsets.symmetric(vertical: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
        child: Text(
          freeUsed < freeLimit
            ? 'Lượt miễn phí: ${freeLimit - freeUsed}/$freeLimit còn lại'
            : tokenBalance > 0
              ? 'Số dư: ${tokenBalance.toStringAsFixed(0)} lượt'
              : 'Đã hết lượt! Nạp thêm để tiếp tục.',
          style: TextStyle(color: freeUsed < freeLimit || tokenBalance > 0 ? Colors.amber : Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
        ),
      ),
      const SizedBox(height: 8),
      ElevatedButton.icon(
        onPressed: isAnalyzing ? null : _pickAndAnalyze,
        icon: const Icon(Icons.add_a_photo),
        label: const Text('Tải ảnh gốm sứ lên'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.amber, foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    ]),
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
        height: 280,
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
            return Container(
              width: 280,
              margin: const EdgeInsets.symmetric(horizontal: 6),
              child: Card(
                elevation: 3, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle), child: Icon(Icons.psychology, color: color, size: 20)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(agent['agent_name']?.toString() ?? 'Agent ${i + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: color))),
                    ]),
                    const SizedBox(height: 10),
                    Text(predName.isNotEmpty ? predName : 'Chưa xác định', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 4),
                    if (country.isNotEmpty || era.isNotEmpty)
                      Text('${country.isNotEmpty ? country : "N/A"} - ${era.isNotEmpty ? era : "N/A"}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    if (style.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text('Phong cách: $style', style: TextStyle(color: Colors.grey.shade600, fontSize: 11, fontStyle: FontStyle.italic)),
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

          return IntrinsicHeight(
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Timeline bar
              SizedBox(
                width: 48,
                child: Column(children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [color, color.withOpacity(0.7)]),
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))],
                    ),
                    child: Icon(icon, color: Colors.white, size: 20),
                  ),
                  if (!isLast) Expanded(child: Container(width: 2, color: color.withOpacity(0.15))),
                ]),
              ),
              const SizedBox(width: 12),
              // Card content
              Expanded(
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
            ]),
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

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() => isLoading = true);
    try {
      final res = await http.get(
        Uri.parse('http://127.0.0.1:8000/api/history'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        title: const Text('Lịch sử giám định', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            mainGateKey.currentState?.switchTab(0);
          },
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _fetchHistory,
        child: isLoading
          ? const Center(child: CircularProgressIndicator())
          : history.isEmpty
            ? ListView(children: const [
                SizedBox(height: 200),
                Center(child: Icon(Icons.history_toggle_off, size: 70, color: Colors.grey)),
                Center(child: Padding(padding: EdgeInsets.all(16), child: Text('Chưa có lịch sử giám định nào', style: TextStyle(color: Colors.grey, fontSize: 16)))),
              ])
            : ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: history.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final item = history[i] as Map<String, dynamic>? ?? {};
                  return Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      leading: Container(
                        width: 48, height: 48,
                        decoration: BoxDecoration(color: const Color(0xFF1A237E).withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                        child: const Icon(Icons.analytics, color: Color(0xFF1A237E)),
                      ),
                      title: Text(item['prediction']?.toString() ?? 'Chưa xác định', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text('${item['country'] ?? ''} - ${item['era'] ?? ''}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                      trailing: const Icon(Icons.chevron_right, color: Color(0xFF1A237E)),
                      onTap: () {
                        if (item['data'] != null) {
                          Navigator.push(context, MaterialPageRoute(builder: (_) => HistoryDetailScreen(data: item['data'] as Map<String, dynamic>? ?? {}, imageUrl: item['image_url']?.toString() ?? '')));
                        }
                      },
                    ),
                  );
                },
              ),
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
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        title: const Text('Chi tiết giám định', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (imageUrl.isNotEmpty)
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxHeight: 250),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)]),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Image.network(
                  imageUrl.startsWith('http') ? imageUrl : 'http://127.0.0.1:8000$imageUrl',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Container(
                    height: 150, color: Colors.grey.shade200,
                    child: const Center(child: Icon(Icons.broken_image, size: 50, color: Colors.grey)),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 20),
          Card(
            elevation: 4, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: LinearGradient(colors: [Colors.blue.shade50, Colors.white], begin: Alignment.topCenter)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('🏆 KẾT LUẬN CUỐI CÙNG', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A237E))),
                const Divider(height: 20),
                Text(finalReport['final_prediction']?.toString() ?? 'Chưa xác định', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.blueAccent)),
                const SizedBox(height: 8),
                Text('Quốc gia: ${finalReport['final_country']?.toString() ?? 'N/A'} | Niên đại: ${finalReport['final_era']?.toString() ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Text(finalReport['reasoning']?.toString() ?? '', style: const TextStyle(height: 1.5)),
              ]),
            ),
          ),
          const SizedBox(height: 20),
          if (agents.isNotEmpty) ...[
            const Text('GÓC NHÌN CHUYÊN GIA', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            ...agents.map((agent) {
              final a = agent as Map<String, dynamic>? ?? {};
              final pred = a['prediction'];
              final name = pred is Map ? pred['ceramic_line']?.toString() ?? '' : pred?.toString() ?? '';
              final country = pred is Map ? pred['country']?.toString() ?? '' : a['country']?.toString() ?? '';
              final era = pred is Map ? pred['era']?.toString() ?? '' : a['era']?.toString() ?? '';
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(a['agent_name']?.toString() ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo)),
                    const SizedBox(height: 4),
                    Text('$name | $country | $era', style: const TextStyle(fontSize: 13)),
                    if (a['evidence'] != null) ...[
                      const SizedBox(height: 6),
                      Text(a['evidence'].toString(), style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4)),
                    ],
                  ]),
                ),
              );
            }),
          ],
        ]),
      ),
    );
  }
}

// --- PROFILE SCREEN (Read-Only Info + Menu) ---
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);


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
    final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220,
            pinned: true,
            backgroundColor: const Color(0xFF1A237E),
            iconTheme: const IconThemeData(color: Colors.white),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF0D1442), Color(0xFF1A237E), Color(0xFF3949AB)], begin: Alignment.topCenter, end: Alignment.bottomCenter),
                ),
                child: SafeArea(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const SizedBox(height: 30),
                    Container(
                      width: 88, height: 88,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(colors: [Color(0xFF3949AB), Color(0xFF5C6BC0)]),
                        border: Border.all(color: Colors.white.withOpacity(0.5), width: 3),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
                      ),
                      child: Center(child: Text(initial, style: const TextStyle(color: Colors.white, fontSize: 38, fontWeight: FontWeight.bold))),
                    ),
                    const SizedBox(height: 14),
                    Text(userName, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 0.3)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                      child: Text(userEmail, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 13)),
                    ),
                  ]),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
              child: Column(children: [
                // Stats row
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, 5))],
                  ),
                  child: Row(children: [
                    _statItem(Icons.analytics_outlined, 'Đã giám định', '${AuthState.user?['free_predictions_used'] ?? 0}', const Color(0xFF1A237E)),
                    _divider(),
                    _statItem(Icons.account_balance_wallet_outlined, 'Số dư lượt', '${AuthState.user?['token_balance'] ?? 0}', Colors.green),
                    _divider(),
                    _statItem(Icons.calendar_today_outlined, 'Tham gia', _fmtDate(AuthState.user?['created_at']?.toString()), Colors.orange),
                  ]),
                ),
                const SizedBox(height: 24),

                // Menu section
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, 5))],
                  ),
                  child: Column(children: [
                    _menuItem(
                      icon: Icons.edit_outlined,
                      color: const Color(0xFF1A237E),
                      title: 'Cập nhật thông tin',
                      subtitle: 'Thay đổi tên, email',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                    ),
                    _menuDivider(),
                    _menuItem(
                      icon: Icons.vpn_key_outlined,
                      color: Colors.orange.shade700,
                      title: 'Đổi mật khẩu',
                      subtitle: 'Thay đổi mật khẩu bảo mật',
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen())),
                    ),
                    _menuDivider(),
                    _menuItem(
                      icon: Icons.add_shopping_cart_outlined,
                      color: Colors.green.shade700,
                      title: 'Nạp lượt phân tích',
                      subtitle: 'Mua thêm lượt giám định AI',
                      onTap: () {
                        Navigator.pop(context);
                        mainGateKey.currentState?.switchTab(2);
                      },
                    ),
                  ]),
                ),
                const SizedBox(height: 24),

                // Logout
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, 5))],
                  ),
                  child: _menuItem(
                    icon: Icons.logout,
                    color: Colors.red,
                    title: 'Đăng xuất',
                    subtitle: 'Thoát khỏi tài khoản',
                    onTap: () => _logout(context),
                    isDestructive: true,
                  ),
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statItem(IconData icon, String label, String value, Color color) {
    return Expanded(
      child: Column(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(height: 8),
        Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: color)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ]),
    );
  }

  Widget _divider() => Container(width: 1, height: 44, color: Colors.grey.shade200);

  Widget _menuItem({required IconData icon, required Color color, required String title, required String subtitle, required VoidCallback onTap, bool isDestructive = false}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Row(children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: isDestructive ? Colors.red : Colors.black87)),
              const SizedBox(height: 2),
              Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            ])),
            Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 22),
          ]),
        ),
      ),
    );
  }

  Widget _menuDivider() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 18),
    child: Divider(height: 1, color: Colors.grey.shade100),
  );

  String _fmtDate(String? s) {
    if (s == null || s.isEmpty) return 'N/A';
    try { final d = DateTime.parse(s); return '${d.day}/${d.month}/${d.year}'; } catch (_) { return s.length >= 10 ? s.substring(0, 10) : s; }
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
  bool isUpdating = false;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: AuthState.user?['name'] ?? '');
    _emailCtrl = TextEditingController(text: AuthState.user?['email'] ?? '');
  }

  Future<void> _updateProfile() async {
    setState(() => isUpdating = true);
    try {
      final res = await http.post(
        Uri.parse('http://127.0.0.1:8000/api/profile/update'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
        body: {'name': _nameCtrl.text.trim(), 'email': _emailCtrl.text.trim()},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, "Cập nhật hồ sơ thành công!", type: GomNotificationType.success);
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        showGomNotification(context, _parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, "Lỗi kết nối máy chủ", type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        title: const Text('Cập nhật thông tin', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, 5))],
            ),
            child: Column(children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF1A237E).withOpacity(0.04),
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                ),
                child: Row(children: [
                  Icon(Icons.person_outline, color: const Color(0xFF1A237E).withOpacity(0.7)),
                  const SizedBox(width: 10),
                  const Text('Chỉnh sửa hồ sơ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1A237E))),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      labelText: 'Họ tên', prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      filled: true, fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'Email', prefixIcon: const Icon(Icons.email_outlined),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                      filled: true, fillColor: Colors.grey.shade50,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: ElevatedButton.icon(
                      onPressed: isUpdating ? null : _updateProfile,
                      icon: isUpdating ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.save_outlined),
                      label: Text(isUpdating ? 'Đang lưu...' : 'Lưu thay đổi', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1A237E), foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 2,
                      ),
                    ),
                  ),
                ]),
              ),
            ]),
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
        Uri.parse('http://127.0.0.1:8000/api/profile/password'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      appBar: AppBar(
        title: const Text('Đổi mật khẩu', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 14, offset: const Offset(0, 5))],
            ),
            child: Column(children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.orange.shade50,
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
                ),
                child: Row(children: [
                  Icon(Icons.lock_outline, color: Colors.orange.shade700),
                  const SizedBox(width: 10),
                  Text('Thay đổi mật khẩu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.orange.shade800)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  Container(
                    padding: const EdgeInsets.all(14),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.amber.shade200)),
                    child: const Row(children: [
                      Icon(Icons.info_outline, color: Colors.amber, size: 20),
                      SizedBox(width: 10),
                      Expanded(child: Text('Mật khẩu mới phải có ít nhất 6 ký tự và khác mật khẩu cũ.', style: TextStyle(fontSize: 12, color: Colors.black87))),
                    ]),
                  ),
                  TextField(
                    controller: _oldPassCtrl, obscureText: true,
                    decoration: InputDecoration(labelText: 'Mật khẩu hiện tại', prefixIcon: const Icon(Icons.lock_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)), filled: true, fillColor: Colors.grey.shade50),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _newPassCtrl, obscureText: true,
                    decoration: InputDecoration(labelText: 'Mật khẩu mới (≥6 ký tự)', prefixIcon: const Icon(Icons.lock_open_outlined), border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)), filled: true, fillColor: Colors.grey.shade50),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _confirmPassCtrl, obscureText: true,
                    decoration: InputDecoration(labelText: 'Xác nhận mật khẩu mới', prefixIcon: const Icon(Icons.check_circle_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)), filled: true, fillColor: Colors.grey.shade50),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: ElevatedButton.icon(
                      onPressed: isChangingPass ? null : _changePassword,
                      icon: isChangingPass ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.vpn_key_outlined),
                      label: Text(isChangingPass ? 'Đang xử lý...' : 'Đổi mật khẩu', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange.shade700, foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 2,
                      ),
                    ),
                  ),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}