import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/lang_storage.dart';
import 'package:gom_app/app_theme.dart';
import 'package:gom_app/chat_history_manager.dart';
import 'package:gom_app/features/auth/forgot_password_screen.dart';
import 'package:gom_app/features/profile/transaction_history_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    _fetchUserProfile();
  }

  Future<void> _fetchUserProfile() async {
    try {
      final res = await http.get(
        ApiConfig.uri('/api/user'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['user'] != null) {
          AuthState.user = data['user'];
          final userLangRaw = data['user']?['language']?.toString();
          if (userLangRaw == 'vi' || userLangRaw == 'en') {
            final String userLang = userLangRaw as String;
            if (AppLang.current != userLang) {
              AppLang.current = userLang;
              saveLocale(userLang);
              MainGate.currentInstance?.refreshApp();
            }
          }
          if (mounted) {
            setState(() {});
          }
        }
      }
    } catch (_) {}
  }

  void _logout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(AppLang.tr('Xác nhận đăng xuất', 'Confirm Logout')),
        content: Text(AppLang.tr('Bạn có chắc chắn muốn đăng xuất?', 'Are you sure you want to log out?')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(AppLang.tr('Hủy', 'Cancel')),
          ),
          ElevatedButton(
            onPressed: () {
              AuthState.clear();
              ChatHistoryManager().clear();
              Navigator.of(ctx).pop();
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => MainGate()),
                (route) => false,
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: Text(AppLang.tr('Đăng xuất', 'Logout')),
          ),
        ],
      ),
    );
  }

  void _deleteAccount(BuildContext context) {
    String? wantToDelete = '';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) {
          final isYes = wantToDelete == 'yes';

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Text(AppLang.tr('Xác nhận xóa tài khoản', 'Confirm Account Deletion')),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AppLang.tr(
                    'Hành động này không thể hoàn tác. Toàn bộ tài khoản, dữ liệu hình ảnh, lịch sử giám định và số dư lượt phân tích của bạn sẽ bị xóa vĩnh viễn khỏi hệ thống.',
                    'This action cannot be undone. Your entire account, image data, prediction history, and credit balance will be permanently deleted from the system.'
                  ), style: const TextStyle(fontSize: 13, height: 1.4)),
                  const SizedBox(height: 20),
                  Text(
                    AppLang.tr('Bạn có muốn xóa tài khoản không?', 'Do you want to delete your account?'),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: wantToDelete,
                        isExpanded: true,
                        items: [
                          DropdownMenuItem(
                            value: '',
                            child: Text(AppLang.tr('Vui lòng chọn...', 'Please select...'), style: const TextStyle(fontSize: 13)),
                          ),
                          DropdownMenuItem(
                            value: 'yes',
                            child: Text(AppLang.tr('Có, tôi muốn xóa tài khoản', 'Yes, I want to delete my account'), style: const TextStyle(fontSize: 13, color: Colors.red)),
                          ),
                          DropdownMenuItem(
                            value: 'no',
                            child: Text(AppLang.tr('Không, tôi muốn giữ lại', 'No, I want to keep it'), style: const TextStyle(fontSize: 13, color: Colors.green)),
                          ),
                        ],
                        onChanged: (val) {
                          setState(() {
                            wantToDelete = val;
                          });
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(AppLang.tr('Hủy', 'Cancel')),
              ),
              ElevatedButton(
                onPressed: !isYes
                    ? null
                    : () async {
                        Navigator.pop(ctx); // close dialog
                        
                        // Show a loading dialog
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (loadingCtx) => const Center(
                            child: CircularProgressIndicator(),
                          ),
                        );

                        try {
                          final response = await http.delete(
                            ApiConfig.uri('/api/profile/delete'),
                            headers: {
                              'Authorization': 'Bearer ${AuthState.token}',
                              'Accept': 'application/json',
                            },
                          );

                          if (!context.mounted) return;
                          Navigator.pop(context); // Pop loading indicator

                          if (response.statusCode == 200) {
                            AuthState.clear();
                            ChatHistoryManager().clear();
                            
                            // Show success dialog
                            showDialog(
                              context: context,
                              builder: (successCtx) => AlertDialog(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                title: Text(AppLang.tr('Đã xóa tài khoản', 'Account Deleted')),
                                content: Text(AppLang.tr(
                                  'Tài khoản của bạn đã được xóa thành công.',
                                  'Your account has been successfully deleted.'
                                )),
                                actions: [
                                  ElevatedButton(
                                    onPressed: () {
                                      Navigator.pop(successCtx);
                                      Navigator.of(context).pushAndRemoveUntil(
                                        MaterialPageRoute(builder: (_) => MainGate()),
                                        (route) => false,
                                      );
                                    },
                                    child: const Text('OK'),
                                  )
                                ],
                              ),
                            );
                          } else {
                            // Show error notification
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                              content: Text(AppLang.tr('Lỗi xóa tài khoản', 'Error deleting account')),
                              backgroundColor: Colors.red,
                            ));
                          }
                        } catch (e) {
                          if (!context.mounted) return;
                          Navigator.pop(context); // Pop loading indicator
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text(AppLang.tr('Lỗi kết nối máy chủ', 'Server connection error')),
                            backgroundColor: Colors.red,
                          ));
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isYes ? Colors.red : Colors.grey.shade300,
                  foregroundColor: isYes ? Colors.white : Colors.grey.shade600,
                  elevation: 0,
                ),
                child: Text(AppLang.tr('Xóa vĩnh viễn', 'Permanently Delete')),
              ),
            ],
          );
        },
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    final userName = AuthState.user?['name']?.toString() ?? 'Người dùng';
    final userEmail = AuthState.user?['email']?.toString() ?? '';
    final tokenBalance = AuthState.user?['token_balance'] ?? 0;
    String? avatarUrl = AuthState.user?['avatar']?.toString();
    if (avatarUrl != null && avatarUrl.isNotEmpty) {
      if (!avatarUrl.startsWith('http')) {
        avatarUrl = ApiConfig.absoluteUrl(avatarUrl);
      } else if (kIsWeb) {
        avatarUrl = ApiConfig.absoluteUrl(avatarUrl);
      }
    }
    final initial = userName.isNotEmpty ? userName[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
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
                color: AppTheme.cardBg,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 15, offset: const Offset(0, 8))],
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
                          child: (avatarUrl == null || avatarUrl.isEmpty) ? Text(initial, style: TextStyle(fontSize: 24, color: AppTheme.textPrimary)) : null,
                        ),
                      ),
                      Positioned(
                        bottom: 0, right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(1),
                          decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          child: Icon(Icons.check_circle, color: AppTheme.textPrimary, size: 22),
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
                        Text(userName, style: TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Container(width: 8, height: 8, decoration: const BoxDecoration(color: Color(0xFFDCC8A9), shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Expanded(child: Text('Email: $userEmail', style: TextStyle(color: AppTheme.textMuted, fontSize: 13), overflow: TextOverflow.ellipsis)),
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
                      Text(AppLang.tr('SỐ DƯ HIỆN TẠI', 'CURRENT BALANCE'), style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
                      Icon(Icons.inventory_2_outlined, color: Colors.white.withOpacity(0.1), size: 40),
                    ],
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${double.tryParse(tokenBalance.toString())?.toInt() ?? 0}', style: const TextStyle(fontFamily: 'Serif', color: Colors.white, fontSize: 44, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(AppLang.tr('lượt', 'credits'), style: const TextStyle(color: Colors.white70, fontSize: 16)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 48,
                    child: ElevatedButton.icon(
                      onPressed: () => MainGate.currentInstance?.switchTab(3),
                      icon: const Icon(Icons.add_circle_outline, color: Color(0xFF0F265C), size: 18),
                      label: Text(AppLang.tr('Nạp lượt phân tích', 'Top up credits'), style: const TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                    ),
                  )
                ],
              ),
            ),
            const SizedBox(height: 36),

            Text(AppLang.tr('Quản lý tài khoản', 'Account Management'), style: TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            const SizedBox(height: 16),

            _buildMenuItem(Icons.language, AppLang.tr('Ngôn ngữ', 'Language'), AppLang.tr('Đang dùng: Tiếng Việt', 'Current: English'), () {
              showModalBottomSheet(
                context: context,
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                builder: (BuildContext ctx) {
                  return Container(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(AppLang.tr('Chọn ngôn ngữ', 'Select Language'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 20),
                        ListTile(
                          leading: const Text('🇻🇳', style: TextStyle(fontSize: 24)),
                          title: const Text('Tiếng Việt', style: TextStyle(fontWeight: FontWeight.w600)),
                          trailing: AppLang.current == 'vi' ? const Icon(Icons.check_circle, color: Colors.green) : null,
                          onTap: () {
                            saveLocale('vi');
                            if (AuthState.token != null) {
                              http.post(
                                ApiConfig.uri('/api/profile/update'),
                                headers: {
                                  'Authorization': 'Bearer ${AuthState.token}',
                                  'Accept': 'application/json',
                                },
                                body: {'language': 'vi'},
                              ).catchError((_) => http.Response('', 500));
                            }
                            AppLang.current = 'vi';
                            Navigator.pop(ctx);
                            MainGate.currentInstance?.refreshApp();
                          },
                        ),
                        const Divider(),
                        ListTile(
                          leading: const Text('🇬🇧', style: TextStyle(fontSize: 24)),
                          title: const Text('English', style: TextStyle(fontWeight: FontWeight.w600)),
                          trailing: AppLang.current == 'en' ? const Icon(Icons.check_circle, color: Colors.green) : null,
                          onTap: () {
                            saveLocale('en');
                            if (AuthState.token != null) {
                              http.post(
                                ApiConfig.uri('/api/profile/update'),
                                headers: {
                                  'Authorization': 'Bearer ${AuthState.token}',
                                  'Accept': 'application/json',
                                },
                                body: {'language': 'en'},
                              ).catchError((_) => http.Response('', 500));
                            }
                            AppLang.current = 'en';
                            Navigator.pop(ctx);
                            MainGate.currentInstance?.refreshApp();
                          },
                        ),
                      ],
                    ),
                  );
                }
              );
            }),
            _buildMenuItem(Icons.brightness_6_outlined, AppLang.tr('Giao diện', 'Appearance'), AppTheme.isDark ? AppLang.tr('Đang dùng: Tối', 'Current: Dark') : AppLang.tr('Đang dùng: Sáng', 'Current: Light'), () {
              showModalBottomSheet(
                context: context,
                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                backgroundColor: AppTheme.cardBg,
                builder: (BuildContext ctx) {
                  return Container(
                    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(AppLang.tr('Chọn Giao Diện', 'Select Theme'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                        const SizedBox(height: 20),
                        ListTile(
                          leading: Icon(Icons.wb_sunny_outlined, color: Colors.orange.shade600, size: 28),
                          title: Text(AppLang.tr('Sáng', 'Light'), style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                          trailing: !AppTheme.isDark ? const Icon(Icons.check_circle, color: Colors.green) : null,
                          onTap: () {
                            AppTheme.saveTheme('light');
                            Navigator.pop(ctx);
                            MainGate.currentInstance?.refreshApp();
                          },
                        ),
                        Divider(color: AppTheme.dividerColor),
                        ListTile(
                          leading: Icon(Icons.dark_mode_outlined, color: Colors.indigo.shade400, size: 28),
                          title: Text(AppLang.tr('Tối', 'Dark'), style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                          trailing: AppTheme.isDark ? const Icon(Icons.check_circle, color: Colors.green) : null,
                          onTap: () {
                            AppTheme.saveTheme('dark');
                            Navigator.pop(ctx);
                            MainGate.currentInstance?.refreshApp();
                          },
                        ),
                      ],
                    ),
                  );
                }
              );
            }),
            _buildMenuItem(Icons.edit_outlined, AppLang.tr('Cập nhật thông tin', 'Update Profile'), AppLang.tr('Thay đổi thông tin liên lạc và tiểu sử', 'Change contact info and bio'), () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const EditProfileScreen()));
              if (mounted) setState(() {});
            }),
            _buildMenuItem(Icons.lock_outline, AppLang.tr('Đổi mật khẩu', 'Change Password'), AppLang.tr('Bảo mật tài khoản của bạn', 'Secure your account'), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen()))),
            _buildMenuItem(Icons.receipt_long_outlined, AppLang.tr('Lịch sử giao dịch', 'Transaction History'), AppLang.tr('Xem lại các lượt đã nạp và sử dụng', 'Review top-ups and usage'), () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TransactionHistoryScreen()))),
            _buildMenuItem(Icons.logout, AppLang.tr('Đăng xuất', 'Logout'), AppLang.tr('Thoát khỏi tài khoản hiện tại', 'Sign out of current account'), () => _logout(context), isDestructive: true),
            _buildMenuItem(Icons.delete_forever_outlined, AppLang.tr('Xóa tài khoản', 'Delete Account'), AppLang.tr('Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu của bạn', 'Permanently delete your account and all data'), () => _deleteAccount(context), isDestructive: true),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle, VoidCallback onTap, {bool isDestructive = false}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: AppTheme.menuBg, borderRadius: BorderRadius.circular(16)),
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
                  decoration: BoxDecoration(color: AppTheme.cardBg, borderRadius: BorderRadius.circular(10), boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 4, offset: const Offset(0, 2))]),
                  child: Icon(icon, color: isDestructive ? Colors.red : AppTheme.textPrimary, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: isDestructive ? Colors.red : AppTheme.textPrimary)),
                      const SizedBox(height: 2),
                      Text(subtitle, style: TextStyle(fontSize: 11, color: isDestructive ? Colors.red.shade300 : AppTheme.textMuted)),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

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
  Uint8List? _avatarBytes;
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
      final bytes = await pickedFile.readAsBytes();
      setState(() {
        _avatarFile = pickedFile;
        _avatarBytes = bytes;
      });
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
      String? avatarUrl;

      if (_avatarFile != null && _avatarBytes != null) {
        final uploadUri = ApiConfig.uri('/api/v1/storage/azure-blob/upload/single');
        final uploadRequest = http.MultipartRequest('POST', uploadUri);
        uploadRequest.headers['Authorization'] = 'Bearer ${AuthState.token}';
        
        String originalName = _avatarFile!.name;
        if (!originalName.toLowerCase().endsWith('.jpg') && 
            !originalName.toLowerCase().endsWith('.png') && 
            !originalName.toLowerCase().endsWith('.jpeg')) {
          originalName += '.jpg';
        }
        
        uploadRequest.fields['folderName'] = 'avatars';
        uploadRequest.files.add(http.MultipartFile.fromBytes(
          'file', 
          _avatarBytes!, 
          filename: originalName,
          contentType: MediaType('image', 'jpeg')
        ));

        final streamedUploadRes = await uploadRequest.send();
        final uploadRes = await http.Response.fromStream(streamedUploadRes);

        if (uploadRes.statusCode == 200) {
          final uploadData = jsonDecode(uploadRes.body);
          avatarUrl = uploadData['data']?['fileUrl']?.toString();
        } else {
          if (!mounted) return;
          showGomNotification(
            context, 
            AppLang.tr("Tải ảnh đại diện thất bại: ", "Avatar upload failed: ") + parseErrorMessage(uploadRes.body, uploadRes.statusCode), 
            type: GomNotificationType.error
          );
          return;
        }
      }

      final updateUri = ApiConfig.uri('/api/profile/update');
      final Map<String, String> fields = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
      };
      if (avatarUrl != null) {
        fields['avatar'] = avatarUrl;
      }

      final res = await http.post(
        updateUri,
        headers: {
          'Authorization': 'Bearer ${AuthState.token}',
        },
        body: fields,
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        AuthState.user = data['user'];
        if (!mounted) return;
        showGomNotification(context, AppLang.tr("Cập nhật hồ sơ thành công!", "Profile updated successfully!"), type: GomNotificationType.success);
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        showGomNotification(context, parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      print("Lỗi update: $e");
      if (!mounted) return;
      showGomNotification(context, AppLang.tr("Lỗi kết nối máy chủ: ", "Server connection error: ") + e.toString().split(':').first, type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isUpdating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    String? currentAvatarUrl = AuthState.user?['avatar'] as String?;
    if (currentAvatarUrl != null && currentAvatarUrl.isNotEmpty) {
      if (!currentAvatarUrl.startsWith('http')) {
        currentAvatarUrl = ApiConfig.absoluteUrl(currentAvatarUrl);
      } else if (kIsWeb) {
        currentAvatarUrl = ApiConfig.absoluteUrl(currentAvatarUrl);
        currentAvatarUrl = ApiConfig.absoluteUrl(currentAvatarUrl);
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          AppLang.tr('Cập nhật thông tin cá nhân', 'Update Profile Information'),
          style: TextStyle(fontFamily: 'Serif', color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 14,
              backgroundColor: AppTheme.dividerColor,
              backgroundImage: _avatarBytes != null 
                  ? MemoryImage(_avatarBytes!)
                  : (currentAvatarUrl != null && currentAvatarUrl.isNotEmpty ? NetworkImage(currentAvatarUrl) : null) as ImageProvider?,
              child: (_avatarBytes == null && (currentAvatarUrl == null || currentAvatarUrl.isEmpty)) ? Icon(Icons.person, size: 18, color: AppTheme.textMuted) : null,
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
                            border: Border.all(color: AppTheme.cardBg, width: 4),
                            boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 10, offset: const Offset(0, 4))],
                            image: DecorationImage(
                              image: _avatarBytes != null 
                                  ? MemoryImage(_avatarBytes!)
                                  : (currentAvatarUrl != null && currentAvatarUrl.isNotEmpty
                                      ? NetworkImage(currentAvatarUrl) 
                                      : const NetworkImage('https://via.placeholder.com/150')) as ImageProvider,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0, right: 0,
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: AppTheme.navyButton,
                            child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
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
                    child: Text(AppLang.tr('THAY ĐỔI ẢNH ĐẠI DIỆN', 'CHANGE PROFILE PICTURE'), style: TextStyle(color: AppTheme.textPrimary, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                  ),
                ),
                const SizedBox(height: 32),

                Text('FULL NAME', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.inputBg, borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _nameCtrl,
                    style: TextStyle(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.person_outline, color: AppTheme.textMuted),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                Text('EMAIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.isDark ? const Color(0xFF0D1424) : Colors.grey.shade200, borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _emailCtrl,
                    readOnly: true,
                    style: TextStyle(color: AppTheme.textMuted),
                    decoration: InputDecoration(
                      border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.lock_outline, color: AppTheme.textMuted, size: 20),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                Text('PHONE NUMBER', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.5)),
                const SizedBox(height: 8),
                Container(
                  decoration: BoxDecoration(color: AppTheme.inputBg, borderRadius: BorderRadius.circular(8)),
                  child: TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    style: TextStyle(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      suffixIcon: Icon(Icons.phone_outlined, color: AppTheme.textMuted),
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppTheme.cardBg, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.security, color: AppTheme.navyButton, size: 20),
                            const SizedBox(height: 8),
                            Text(AppLang.tr('Bảo mật', 'Security'), style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                            const SizedBox(height: 4),
                            Text(AppLang.tr('Thông tin của bạn được mã hóa an toàn.', 'Your information is securely encrypted.'), style: TextStyle(fontSize: 10, color: AppTheme.textMuted, height: 1.3)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: AppTheme.cardBg, borderRadius: BorderRadius.circular(16)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.history, color: Color(0xFF8B3A3A), size: 20),
                            const SizedBox(height: 8),
                            Text(AppLang.tr('Lịch sử', 'History'), style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                            const SizedBox(height: 4),
                            Text(AppLang.tr('Cập nhật lần cuối vào\n${_formatUpdatedAt(AuthState.user?['updated_at']?.toString())}', 'Last updated on\n${_formatUpdatedAt(AuthState.user?['updated_at']?.toString())}'), style: TextStyle(fontSize: 10, color: AppTheme.textMuted, height: 1.3)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),

                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isUpdating ? null : _updateProfile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.navyButton,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: isUpdating
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : Text(AppLang.tr('Lưu Thay Đổi', 'Save Changes'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
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
      showGomNotification(context, AppLang.tr('Mật khẩu mới phải có ít nhất 6 ký tự', 'New password must be at least 6 characters'), type: GomNotificationType.error);
      return;
    }
    if (_newPassCtrl.text != _confirmPassCtrl.text) {
      showGomNotification(context, AppLang.tr('Mật khẩu xác nhận không khớp', 'Confirm password does not match'), type: GomNotificationType.error);
      return;
    }
    setState(() => isChangingPass = true);
    try {
      final res = await http.post(
        ApiConfig.uri('/api/profile/password'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
        body: {
          'old_password': _oldPassCtrl.text,
          'password': _newPassCtrl.text,
          'password_confirmation': _confirmPassCtrl.text,
        },
      );
      if (res.statusCode == 200) {
        if (!mounted) return;
        showGomNotification(context, AppLang.tr('Đổi mật khẩu thành công!', 'Password changed successfully!'), type: GomNotificationType.success);
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        showGomNotification(context, parseErrorMessage(res.body, res.statusCode), type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, AppLang.tr('Lỗi kết nối máy chủ', 'Server connection error'), type: GomNotificationType.error);
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
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
            color: AppTheme.textMuted,
          ),
        ),
        const SizedBox(height: 10),
        Container(
          height: 56,
          decoration: BoxDecoration(
            color: AppTheme.inputBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: TextField(
            controller: controller,
            obscureText: obscure,
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 15),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 15),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
              suffixIcon: GestureDetector(
                onTap: onIconTap,
                child: Icon(icon, color: AppTheme.textMuted, size: 20),
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
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          AppLang.tr('Đổi mật khẩu', 'Change Password'),
          style: TextStyle(fontFamily: 'Serif', color: AppTheme.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
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
                Text(
                  AppLang.tr('An toàn & Bảo mật', 'Safety & Security'),
                  style: TextStyle(
                    fontFamily: 'Serif',
                    fontSize: 38,
                    height: 1.15,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  AppLang.tr('Cập nhật mật khẩu thường xuyên để bảo vệ tài khoản của bạn.', 'Update your password regularly to protect your account.'),
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textMuted,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 48),
                
                _buildTextField(
                  AppLang.tr('Mật khẩu hiện tại', 'Current Password'), 
                  '********', 
                  _oldPassCtrl, 
                  _obscureOldPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  obscure: _obscureOldPass,
                  onIconTap: () => setState(() => _obscureOldPass = !_obscureOldPass),
                ),
                const SizedBox(height: 24),
                
                _buildTextField(AppLang.tr('Mật khẩu mới', 'New Password'), AppLang.tr('Tối thiểu 8 ký tự', 'At least 8 characters'), _newPassCtrl, Icons.lock_outline),
                const SizedBox(height: 12),
                
                Row(
                  children: [
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 1 ? AppTheme.navyButton : AppTheme.dividerColor, borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 2 ? AppTheme.navyButton : AppTheme.dividerColor, borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 3 ? AppTheme.navyButton : AppTheme.dividerColor, borderRadius: BorderRadius.circular(2)))),
                    const SizedBox(width: 4),
                    Expanded(child: Container(height: 4, decoration: BoxDecoration(color: strength >= 4 ? AppTheme.navyButton : AppTheme.dividerColor, borderRadius: BorderRadius.circular(2)))),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(strength >= 3 ? Icons.check_circle : Icons.info_outline, color: strength >= 3 ? AppTheme.navyButton : AppTheme.textMuted, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      strength < 2 ? AppLang.tr('MẬT KHẨU YẾU', 'WEAK PASSWORD') : (strength < 3 ? AppLang.tr('MẬT KHẨU TRUNG BÌNH', 'MEDIUM PASSWORD') : AppLang.tr('MẬT KHẨU MẠNH', 'STRONG PASSWORD')), 
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: strength >= 3 ? AppTheme.navyButton : AppTheme.textMuted, letterSpacing: 0.5)
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                
                _buildTextField(AppLang.tr('Xác nhận mật khẩu mới', 'Confirm New Password'), AppLang.tr('Nhập lại mật khẩu mới', 'Re-enter new password'), _confirmPassCtrl, Icons.verified_user_outlined),
                const SizedBox(height: 48),
                
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.inputBg,
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
                        child: Icon(Icons.lightbulb_outline, color: AppTheme.textSecondary, size: 22),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(AppLang.tr('Gợi ý bảo mật', 'Security Tips'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary)),
                            const SizedBox(height: 6),
                            Text(AppLang.tr('Sử dụng tổ hợp chữ hoa, chữ thường, số và ký hiệu đặc biệt để tăng tính bảo mật cho tài khoản của bạn.', 'Use a combination of uppercase, lowercase letters, numbers, and special symbols to increase the security of your account.'), style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.5)),
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
                      backgroundColor: AppTheme.navyButton,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: isChangingPass 
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(AppLang.tr('Cập nhật mật khẩu', 'Update Password'), style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward, color: Colors.white, size: 18),
                            ],
                          )
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ForgotPasswordScreen())),
                    child: RichText(
                      text: TextSpan(
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 13),
                        children: [
                          TextSpan(text: AppLang.tr('Bạn quên mật khẩu hiện tại? ', 'Forgot your current password? ')),
                          TextSpan(text: AppLang.tr('Nhấn vào đây', 'Click here'), style: TextStyle(color: AppTheme.navyButton, fontWeight: FontWeight.bold)),
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
