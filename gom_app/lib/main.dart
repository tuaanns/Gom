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

void main() {
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
    return InkWell(
      onTap: () => _handleSocialLogin(provider),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 140,
        height: 50,
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(letter, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold, fontFamily: letter == 'f' ? 'serif' : 'sans-serif')),
            const SizedBox(width: 10),
            Text(provider, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
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
          account = await GoogleSignIn.instance.authenticate();
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
      setState(() => isLoading = false);
      showGomNotification(context, "Cấu hình $provider chưa hoàn thiện hoặc bị hủy ($e). Cần bổ sung App ID/Client ID trên hệ thống.", type: GomNotificationType.error);
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
        showGomNotification(context, "Bạn cần tạo tài khoản App/Cấu hình Backend cho API $provider trước. Lỗi: ${res.statusCode}", type: GomNotificationType.info);
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
                child: Text('Độ tin cậy: ${finalApp['certainty'] ?? 'N/A'}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
              ),
            ]),
            const Divider(height: 30),
            Text(finalApp['final_prediction'] ?? 'Chưa xác định', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.blueAccent)),
            const SizedBox(height: 10),
            Text('Quốc gia: ${finalApp['final_country'] ?? 'N/A'} | Niên đại: ${finalApp['final_era'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 20),
            const Text('Lập luận tóm tắt:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Text(finalApp['reasoning'] ?? '', style: const TextStyle(height: 1.5)),
          ]),
        ),
      ),
    );
  }

  Widget _buildSpecialistSection() {
    final List<dynamic> agents = debateData?['agent_predictions'] ?? [];
    if (agents.isEmpty) return const SizedBox();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: Text('GÓC NHÌN CHUYÊN GIA', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey))),
      SizedBox(
        height: 240,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: agents.length,
          itemBuilder: (context, i) {
            final agent = agents[i] as Map<String, dynamic>? ?? {};
            final colors = [Colors.indigo, Colors.teal, Colors.deepPurple, Colors.orange];
            final color = colors[i % colors.length];
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
                      Expanded(child: Text(agent['agent_name'] ?? 'Agent ${i + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: color))),
                    ]),
                    const SizedBox(height: 10),
                    Text(agent['prediction'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text('${agent['country'] ?? ''} - ${agent['era'] ?? ''}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text('Tin cậy: ${agent['certainty'] ?? 'N/A'}', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
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
    final List<dynamic> debateLog = debateData?['debate_log'] ?? [];
    if (debateLog.isEmpty) return const SizedBox();
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('📋 TRANH BIỆN CHI TIẾT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
        const SizedBox(height: 8),
        ...debateLog.map((round) {
          final details = round as Map<String, dynamic>? ?? {};
          final attacks = (details['attacks'] as List?) ?? [];
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10)),
              child: Text('🎙️ ${details['agent'] ?? 'Agent'} - Lập luận: ${details['argument'] ?? ''}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
            ...attacks.map((atk) => Container(
              margin: const EdgeInsets.only(left: 12, top: 8), padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text('⚔️ $atk', style: const TextStyle(fontSize: 12)),
            )),
            Container(
              margin: const EdgeInsets.only(left: 12, top: 8, bottom: 16), padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text('🛡️ Phản biện: ${details['defense'] ?? "Tôi tin vào dữ liệu của mình"}', style: const TextStyle(fontSize: 12)),
            ),
          ]);
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
        automaticallyImplyLeading: false,
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
          // Final result
          Card(
            elevation: 4, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: LinearGradient(colors: [Colors.blue.shade50, Colors.white], begin: Alignment.topCenter)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('🏆 KẾT LUẬN CUỐI CÙNG', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1A237E))),
                const Divider(height: 20),
                Text(finalReport['final_prediction'] ?? 'Chưa xác định', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.blueAccent)),
                const SizedBox(height: 8),
                Text('Quốc gia: ${finalReport['final_country'] ?? 'N/A'} | Niên đại: ${finalReport['final_era'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                Text(finalReport['reasoning'] ?? '', style: const TextStyle(height: 1.5)),
              ]),
            ),
          ),
          const SizedBox(height: 20),
          // Agents
          if (agents.isNotEmpty) ...[
            const Text('GÓC NHÌN CHUYÊN GIA', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            ...agents.map((agent) {
              final a = agent as Map<String, dynamic>? ?? {};
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(a['agent_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo)),
                    const SizedBox(height: 4),
                    Text('${a['prediction'] ?? ''} | ${a['country'] ?? ''} | ${a['era'] ?? ''}', style: const TextStyle(fontSize: 13)),
                    if (a['reasoning'] != null) ...[
                      const SizedBox(height: 6),
                      Text(a['reasoning'], style: const TextStyle(fontSize: 12, color: Colors.grey, height: 1.4)),
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

// --- PROFILE SCREEN ---
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  final _oldPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();
  bool isUpdating = false;
  bool isChangingPass = false;

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
        _oldPassCtrl.clear(); _newPassCtrl.clear(); _confirmPassCtrl.clear();
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
        title: const Text('Hồ sơ cá nhân', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1A237E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(children: [
          // Avatar
          CircleAvatar(
            radius: 40,
            backgroundColor: const Color(0xFF1A237E),
            child: Text(
              AuthState.user?['name']?.toString().isNotEmpty == true ? AuthState.user!['name'][0].toUpperCase() : 'U',
              style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 24),
          // Profile info
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Thông tin cá nhân', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1A237E))),
                const SizedBox(height: 16),
                TextField(controller: _nameCtrl, decoration: InputDecoration(labelText: 'Họ tên', prefixIcon: const Icon(Icons.person_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                TextField(controller: _emailCtrl, decoration: InputDecoration(labelText: 'Email', prefixIcon: const Icon(Icons.email_outlined), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 45,
                  child: ElevatedButton(
                    onPressed: isUpdating ? null : _updateProfile,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1A237E), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: isUpdating ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Lưu thay đổi', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 16),
          // Change password
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Đổi mật khẩu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1A237E))),
                const SizedBox(height: 16),
                TextField(controller: _oldPassCtrl, obscureText: true, decoration: InputDecoration(labelText: 'Mật khẩu cũ', prefixIcon: const Icon(Icons.lock_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                TextField(controller: _newPassCtrl, obscureText: true, decoration: InputDecoration(labelText: 'Mật khẩu mới', prefixIcon: const Icon(Icons.lock_open), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 12),
                TextField(controller: _confirmPassCtrl, obscureText: true, decoration: InputDecoration(labelText: 'Xác nhận mật khẩu mới', prefixIcon: const Icon(Icons.check_circle_outline), border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)))),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity, height: 45,
                  child: ElevatedButton(
                    onPressed: isChangingPass ? null : _changePassword,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orange.shade700, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    child: isChangingPass ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Đổi mật khẩu', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}