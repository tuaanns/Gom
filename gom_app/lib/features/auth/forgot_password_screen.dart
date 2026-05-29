import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';

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
        ApiConfig.uri('/api/forgot-password'),
        body: {'email': _email.text.trim()},
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Mã phục hồi đã được gửi về email của bạn.", "Recovery code has been sent to your email."), type: GomNotificationType.success);
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResetPasswordScreen(email: _email.text.trim())));
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
                Text(
                  AppLang.tr('QUÊN MẬT KHẨU', 'FORGOT PASSWORD'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F265C),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppLang.tr('Nhập email của bạn và chúng tôi sẽ gửi mã khôi phục tài khoản.', 'Enter your email and we will send an account recovery code.'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF666666), height: 1.4),
                ),
                const SizedBox(height: 32),
                Text(AppLang.tr('EMAIL', 'EMAIL'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _email,
                    decoration: InputDecoration(
                      hintText: AppLang.tr('Nhập email liên lạc...', 'Enter contact email...'),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                        : Text(AppLang.tr('Gửi Yêu Cầu', 'Send Request'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
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
      showGomNotification(context, AppLang.tr("Vui lòng nhập mã xác nhận và mật khẩu mới", "Please enter recovery code and new password"), type: GomNotificationType.error);
      return;
    }
    setState(() => isLoading = true);
    
    try {
      final res = await http.post(
        ApiConfig.uri('/api/reset-password'),
        body: {
          'email': widget.email,
          'code': _code.text.trim(),
          'password': _pass.text.trim(),
        },
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.", "Password changed successfully! Please log in again."), type: GomNotificationType.success);
        Navigator.pop(context); // Go back to login
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
                Text(
                  AppLang.tr('KHÔI PHỤC MẬT KHẨU', 'RESET PASSWORD'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F265C),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppLang.tr('Mã xác nhận đã được gửi đến ${widget.email}', 'Verification code has been sent to ${widget.email}'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 14, color: Color(0xFF666666), height: 1.4),
                ),
                const SizedBox(height: 32),
                
                Text(AppLang.tr('MÃ XÁC NHẬN (6 SỐ)', 'VERIFICATION CODE (6 DIGITS)'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _code,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      hintText: AppLang.tr('Nhập mã gồm 6 số...', 'Enter 6-digit code...'),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                
                Text(AppLang.tr('MẬT KHẨU MỚI', 'NEW PASSWORD'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF666666), letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: const Color(0xFFF0EFE9), borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _pass,
                    obscureText: true,
                    decoration: InputDecoration(
                      hintText: AppLang.tr('Nhập mật khẩu mới...', 'Enter new password...'),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
                        : Text(AppLang.tr('Xác Nhận Đổi Mật Khẩu', 'Confirm Change Password'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white)),
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
