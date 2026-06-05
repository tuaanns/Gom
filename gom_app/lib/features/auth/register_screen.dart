import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/lang_storage.dart';
import 'package:gom_app/google_btn.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({Key? key}) : super(key: key);
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  static const String _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _pass = TextEditingController();
  final _passConfirm = TextEditingController();
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    _initGoogleSignInListener();
  }

  Future<void> _initGoogleSignInListener() async {
    try {
      final canUseGoogleSignIn = await _initializeGoogleSignIn();
      if (!canUseGoogleSignIn) return;
      GoogleSignIn.instance.authenticationEvents.listen((event) async {
        if (event is GoogleSignInAuthenticationEventSignIn) {
          final account = event.user;
          final auth = account.authentication;
          _sendSocialTokenToBackend('Google', auth.idToken ?? '');
        }
      });
    } catch (_) {}
  }

  bool get _needsGoogleServerClientId {
    return !kIsWeb && defaultTargetPlatform == TargetPlatform.android;
  }

  String get _trimmedGoogleServerClientId {
    final val = _googleServerClientId.trim();
    if (val.isNotEmpty) return val;
    return '208231172368-34f26e0l7771ngcqa89j9ufj01gm6mtt.apps.googleusercontent.com';
  }

  Future<bool> _initializeGoogleSignIn() async {
    final serverClientId = _trimmedGoogleServerClientId;
    if (_needsGoogleServerClientId && serverClientId.isEmpty) {
      return false;
    }

    await GoogleSignIn.instance.initialize(
      serverClientId: serverClientId.isEmpty ? null : serverClientId,
    );
    return true;
  }

  Future<void> _register() async {
    if (_name.text.trim().isEmpty || _email.text.trim().isEmpty || _pass.text.isEmpty) {
      showGomNotification(context, AppLang.tr("Vui lòng nhập đầy đủ thông tin", "Please fill in all information"), type: GomNotificationType.error);
      return;
    }
    if (_pass.text.length < 6) {
      showGomNotification(context, AppLang.tr('Mật khẩu phải có ít nhất 6 ký tự', 'Password must be at least 6 characters'), type: GomNotificationType.error);
      return;
    }
    if (_pass.text != _passConfirm.text) {
      showGomNotification(context, AppLang.tr("Mật khẩu xác nhận không khớp", "Confirm password does not match"), type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        ApiConfig.uri('/api/register'),
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
        showGomNotification(context, AppLang.tr("Đăng ký thành công! Chào mừng ${data['user']?['name'] ?? 'bạn'}!", "Registration successful! Welcome ${data['user']?['name'] ?? 'user'}!"), type: GomNotificationType.success);
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => MainGate()),
          (route) => false,
        );
      } else {
        if (!mounted) return;
        showGomNotification(context, parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, AppLang.tr('Lỗi kết nối máy chủ', 'Server connection error'), type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
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
                  Text(
                    AppLang.tr('Tạo tài khoản mới', 'Create new account'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Serif',
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF222222),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    AppLang.tr('Bắt đầu hành trình lưu trữ của bạn', 'Start your archiving journey'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 14, color: Color(0xFF666666)),
                  ),
                  const SizedBox(height: 48),

                  // Name Field
                  Text(AppLang.tr('HỌ VÀ TÊN', 'FULL NAME'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
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
                  Text(AppLang.tr('EMAIL', 'EMAIL'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
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
                  Text(AppLang.tr('MẬT KHẨU', 'PASSWORD'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _pass,
                      obscureText: true,
                      decoration: const InputDecoration(
                        hintText: '????????',
                        hintStyle: TextStyle(color: Color(0xFFAAAAAA), fontSize: 14, letterSpacing: 2),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Confirm Password Field
                  Text(AppLang.tr('XÁC NHẬN MẬT KHẨU', 'CONFIRM PASSWORD'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF888888), letterSpacing: 0.5)),
                  const SizedBox(height: 8),
                  Container(
                    decoration: BoxDecoration(color: const Color(0xFFF5F3EC), borderRadius: BorderRadius.circular(8)),
                    child: TextField(
                      controller: _passConfirm,
                      obscureText: true,
                      decoration: const InputDecoration(
                        hintText: '????????',
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
                        backgroundColor: const Color(0xFF003882),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: isLoading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : Text(AppLang.tr('Đăng ký ngay', 'Register now'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Divider
                  Row(
                    children: [
                      const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(AppLang.tr('HOẶC TIẾP TỤC VỚI', 'OR CONTINUE WITH'), style: const TextStyle(color: Color(0xFFAAAAAA), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                      ),
                      const Expanded(child: Divider(color: Color(0xFFE5E5E5))),
                    ],
                  ),
                  const SizedBox(height: 24),

                  buildCrossPlatformGoogleButton(
                    onPressed: _handleGoogleLogin,
                    customButton: InkWell(
                      onTap: _handleGoogleLogin,
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        height: 52,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFDADCE0), width: 1.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Image.network(
                              'https://www.gstatic.com/images/branding/product/2x/googleg_32dp.png',
                              width: 24,
                              height: 24,
                            ),
                            const SizedBox(width: 12),
                            Text(
                              AppLang.tr('Tiếp tục với Google', 'Continue with Google'),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontFamily: 'Roboto',
                                fontSize: 15,
                                color: Color(0xFF3C4043),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Footer Login Link
                  Center(
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      child: Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: RichText(
                          text: TextSpan(
                            style: const TextStyle(fontSize: 13, color: Color(0xFF666666)),
                            children: [
                              TextSpan(text: AppLang.tr('Đã có tài khoản? ', 'Already have an account? ')),
                              TextSpan(text: AppLang.tr('Đăng nhập', 'Sign in'), style: const TextStyle(color: Color(0xFF003882), fontWeight: FontWeight.bold)),
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

  Future<void> _handleGoogleLogin() async {
    setState(() => isLoading = true);
    try {
      final canUseGoogleSignIn = await _initializeGoogleSignIn();
      if (!canUseGoogleSignIn) {
        if (!mounted) return;
        setState(() => isLoading = false);
        showGomNotification(
          context,
          AppLang.tr(
            'Thiếu GOOGLE_SERVER_CLIENT_ID cho Google Sign-In Android.',
            'Missing GOOGLE_SERVER_CLIENT_ID for Android Google Sign-In.',
          ),
          type: GomNotificationType.error,
        );
        return;
      }

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
        showGomNotification(context, AppLang.tr("Lỗi Google Sign In: $e", "Google Sign In error: $e"), type: GomNotificationType.error);
        return;
      }

      final auth = account.authentication;
      _sendSocialTokenToBackend('Google', auth.idToken ?? '');
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      showGomNotification(context, AppLang.tr("Cấu hình Google chưa hoàn thiện hoặc bị hủy ($e).", "Google configuration is incomplete or cancelled ($e)."), type: GomNotificationType.error);
    }
  }

  Future<void> _sendSocialTokenToBackend(String provider, String token) async {
    try {
      final res = await http.post(
        ApiConfig.uri('/api/login/social'),
        body: {
          'provider': provider.toLowerCase(),
          'token': token,
        },
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        final userLang = data['user']?['language']?.toString();
        if (userLang == 'vi' || userLang == 'en') {
          AppLang.current = userLang as String;
          saveLocale(userLang);
        }
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Chào mừng ${data['user']?['name'] ?? 'bạn'} đã đăng ký qua $provider!", "Welcome, ${data['user']?['name'] ?? 'user'} registered via $provider!"), type: GomNotificationType.success);
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => MainGate()),
          (route) => false,
        );
      } else {
        if (!mounted) return;
        final actualEMsg = parseErrorMessage(res.body, res.statusCode);
        showGomNotification(context, actualEMsg, type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, AppLang.tr("Không thể xác thực token $provider với máy chủ backend.", "Cannot authenticate $provider token with the backend server."), type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }
}
