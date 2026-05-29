import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/google_btn.dart';

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

  Future<void> _handleSocialLogin(String title) async {
    // Just mock or delegate to the identical login logic for simplicity,
    // usually OIDC auth covers both login and registration exactly the same way.
    showGomNotification(context, AppLang.tr("Tính năng đăng nhập/đăng ký một chạm bằng $title đang mở rộng.", "One-touch login/registration using $title is being expanded."), type: GomNotificationType.success);
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
