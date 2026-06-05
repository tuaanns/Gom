import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_facebook_auth/flutter_facebook_auth.dart';
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/lang_storage.dart';
import 'package:gom_app/google_btn.dart';
import 'package:gom_app/features/auth/forgot_password_screen.dart';
import 'package:gom_app/features/auth/register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  static const String _googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');

  final _email = TextEditingController();
  final _pass = TextEditingController();
  bool isLoading = false;
  bool _obscurePass = true;

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

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _pass.text.trim().isEmpty) {
      showGomNotification(context, AppLang.tr("Vui lòng nhập đầy đủ email và mật khẩu", "Please enter your email and password"), type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    try {
      final res = await http.post(
        ApiConfig.uri('/api/login'),
        body: {'email': _email.text.trim(), 'password': _pass.text},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        final userLang = data['user']?['language']?.toString();
        if (userLang == 'vi' || userLang == 'en') {
          AppLang.current = userLang as String;
          saveLocale(userLang);
        }
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Chào mừng ${data['user']?['name'] ?? 'bạn'} quay trở lại!", "Welcome back, ${data['user']?['name'] ?? 'user'}!"), type: GomNotificationType.success);
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MainGate()));
      } else {
        if (!mounted) return;
        showGomNotification(context, parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, AppLang.tr('Không thể kết nối đến máy chủ', 'Cannot connect to server'), type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1E1E1E),
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
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Language Selection Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    InkWell(
                      onTap: () {
                        final newLang = AppLang.current == 'vi' ? 'en' : 'vi';
                        saveLocale(newLang);
                        setState(() {
                          AppLang.current = newLang;
                        });
                      },
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFD5D4CD), width: 1.2),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                           children: [
                            const Icon(
                              Icons.language,
                              size: 18,
                              color: Color(0xFF0F265C),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              AppLang.current == 'vi' ? 'VI' : 'EN',
                              style: const TextStyle(
                                color: Color(0xFF0F265C),
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Logo
                Image.asset('assets/logo.png', height: 100),
                const SizedBox(height: 32),
                
                // Welcome Text
                Text(
                  AppLang.tr('Chào mừng trở lại', 'Welcome back'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF222222),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  AppLang.tr('Đăng nhập để sử dụng hệ thống.', 'Sign in to use the system.'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF666666),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 40),

                // Email Field
                Text(
                  AppLang.tr('EMAIL', 'EMAIL'),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5),
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
                    Text(
                      AppLang.tr('MAT KHAU', 'PASSWORD'),
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5),
                    ),
                    InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                      child: Text(
                        AppLang.tr('Quên mật khẩu?', 'Forgot password?'),
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFFD32F2F)),
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
                      hintText: '********',
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
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(AppLang.tr('Tiếp tục', 'Continue'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward, size: 18),
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
                        text: TextSpan(
                          style: const TextStyle(fontSize: 13, color: Color(0xFF666666)),
                          children: [
                            TextSpan(text: AppLang.tr('Chưa có tài khoản? ', "Don't have an account? ")),
                            TextSpan(text: AppLang.tr('Đăng ký ngay', 'Register now'), style: const TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
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
                      child: Text(AppLang.tr('HOẶC KẾT NỐI QUA', 'OR CONNECT VIA'), style: const TextStyle(color: Color(0xFFAAAAAA), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
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
                  text: TextSpan(
                    style: const TextStyle(fontSize: 10, color: Color(0xFF888888), height: 1.5),
                    children: [
                      TextSpan(text: AppLang.tr('Bằng việc tiếp tục, bạn đồng ý với ', 'By continuing, you agree to our ')),
                      TextSpan(text: AppLang.tr('Điều khoản Dịch vụ', 'Terms of Service'), style: const TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      TextSpan(text: AppLang.tr(' và\n', ' and\n')),
                      TextSpan(text: AppLang.tr('Chính sách Bảo mật', 'Privacy Policy'), style: const TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      TextSpan(text: AppLang.tr(' của chúng tôi.', ' of ours.')),
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
        // Google Sign-In on Web is handled by the rendered button listener.
        // Tr锚n mobile, d霉ng authenticate()
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
        _sendSocialTokenToBackend(provider, auth.idToken ?? '');

      } else if (provider == 'Facebook') {
        final LoginResult result = await FacebookAuth.instance.login(permissions: ['email', 'public_profile']);
        if (result.status == LoginStatus.success) {
          final AccessToken accessToken = result.accessToken!;
          _sendSocialTokenToBackend(provider, accessToken.token);
        } else if (result.status == LoginStatus.cancelled) {
          setState(() => isLoading = false);
        } else {
          showGomNotification(context, AppLang.tr("Lỗi đăng nhập Facebook: ${result.message}", "Facebook login error: ${result.message}"), type: GomNotificationType.error);
          setState(() => isLoading = false);
        }
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => isLoading = false);
      showGomNotification(context, AppLang.tr("Cấu hình $provider chưa hoàn thiện hoặc bị hủy ($e).", "$provider configuration is incomplete or cancelled ($e)."), type: GomNotificationType.error);
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
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.token = data['token'];
        AuthState.user = data['user'];
        final userLang = data['user']?['language']?.toString();
        if (userLang == 'vi' || userLang == 'en') {
          AppLang.current = userLang as String;
          saveLocale(userLang);
        }
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Chào mừng ${data['user']?['name'] ?? 'bạn'} quay trở lại qua $provider!", "Welcome back, ${data['user']?['name'] ?? 'user'} via $provider!"), type: GomNotificationType.success);
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => MainGate()));
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
