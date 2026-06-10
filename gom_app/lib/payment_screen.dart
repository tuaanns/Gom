import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:gom_app/api_config.dart';
import 'auth_state.dart';
import 'main.dart';
import 'app_theme.dart';

String get _baseUrl => ApiConfig.baseUrl;

// ===== API HELPERS =====
Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}

Map<String, dynamic> _unwrapApiData(dynamic decoded) {
  final body = _asMap(decoded);
  final nested = _asMap(body['data']);
  return nested.isNotEmpty ? nested : body;
}

double _readDouble(dynamic value, double fallback) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

Future<Map<String, dynamic>> fetchPaymentStatus() async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/status'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
  return _unwrapApiData(jsonDecode(res.body));
}

Future<Map<String, dynamic>> createPayment(int packageId) async {
  final res = await http.post(
    Uri.parse('$_baseUrl/api/payment/create'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
    body: {
      'package_id': packageId.toString(),
      'via': 'app',
    },
  );
  return _unwrapApiData(jsonDecode(res.body));
}

Future<Map<String, dynamic>> checkPaymentStatus(int paymentId) async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/check/$paymentId'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
  return _unwrapApiData(jsonDecode(res.body));
}

Future<void> simulateTestPayment(int paymentId) async {
  await http.post(
    Uri.parse('$_baseUrl/api/payment/test-complete/$paymentId'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
}

// ===== PAYMENT SCREEN =====
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({Key? key}) : super(key: key);
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  double tokenBalance = 0;
  bool isLoadingStatus = true;
  String activePaymentMethod = 'sepay';

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    setState(() => isLoadingStatus = true);
    try {
      final data = await fetchPaymentStatus();
      String method = 'sepay';
      try {
        final res = await http.get(
          Uri.parse('$_baseUrl/api/payment/active-method'),
          headers: {'Authorization': 'Bearer ${AuthState.token}'},
        );
        final methodData = jsonDecode(res.body);
        final unwrapped = methodData['data'] ?? methodData;
        if (unwrapped != null && unwrapped['payment_method'] != null) {
          method = unwrapped['payment_method'].toString();
        }
      } catch (e) {
        debugPrint('Failed to load active method: $e');
      }

      if (mounted) {
        setState(() {
          tokenBalance = _readDouble(data['token_balance'], tokenBalance);
          activePaymentMethod = method;
          isLoadingStatus = false;
        });
      }
    } catch (_) {
      setState(() => isLoadingStatus = false);
    }
  }

  void _showPaymentMethodSelection(int id, String name, int credits, int price) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20))),
      backgroundColor: AppTheme.cardBg,
      isScrollControlled: true,
      builder: (BuildContext ctx) {
        final maxHeight = MediaQuery.of(ctx).size.height * 0.82;
        return SafeArea(
          top: false,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: maxHeight),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(AppLang.tr('Chọn phương thức thanh toán', 'Select payment method'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.textPrimary)),
              const SizedBox(height: 20),
              _buildPaymentMethodTile(
                icon: Icons.qr_code_2,
                title: AppLang.tr('Chuyển khoản (VietQR)', 'Bank Transfer (VietQR)'),
                subtitle: AppLang.tr('Hỗ trợ quét bằng mọi app ngân hàng', 'Supports scanning with any banking app'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('VietQR', id, name, credits, price, const Color(0xFF0F265C));
                },
              ),
              const Divider(height: 1),
              _buildPaymentMethodTile(
                icon: Icons.account_balance_wallet,
                title: AppLang.tr('Ví MoMo', 'MoMo Wallet'),
                subtitle: AppLang.tr('Quét mã VietQR bằng app MoMo', 'Scan VietQR code using MoMo app'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('MoMo', id, name, credits, price, const Color(0xFFA50064));
                },
              ),
              const Divider(height: 1),
              _buildPaymentMethodTile(
                icon: Icons.account_balance_wallet_outlined,
                title: AppLang.tr('Ví ZaloPay', 'ZaloPay Wallet'),
                subtitle: AppLang.tr('Quét mã VietQR bằng app ZaloPay', 'Scan VietQR code using ZaloPay app'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('ZaloPay', id, name, credits, price, const Color(0xFF005AFE));
                },
              ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildPaymentMethodTile({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppTheme.isDark ? Colors.grey.shade800 : Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.blue.shade700),
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary)),
      subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
      trailing: Icon(Icons.chevron_right, color: AppTheme.textMuted),
      contentPadding: const EdgeInsets.symmetric(vertical: 8),
    );
  }

  void _showPaymentDialog(String method, int packageId, String name, int credits, int price, Color themeColor) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => PaymentDialog(
        method: method,
        packageId: packageId,
        packageName: name,
        credits: credits,
        price: price,
        color: themeColor,
        onCompleted: _loadStatus,
      ),
    );
  }

  Widget _buildPackageUI(
    int id, 
    String name, 
    String subtitle, 
    String title, 
    String pricePerCredit, 
    String totalPrice, 
    IconData icon, 
    int credits, 
    int price,
    {String? badgeText, Key? widgetKey}
  ) {
    final isRecommended = id == 2;
    
    final cardBorder = isRecommended
        ? Border.all(color: AppTheme.isDark ? const Color(0xFFC5A85A) : const Color(0xFF0F265C), width: 2.0)
        : Border.all(color: AppTheme.isDark ? Colors.white.withOpacity(0.08) : Colors.grey.shade200, width: 1.0);
        
    final cardShadows = [
      isRecommended
          ? BoxShadow(
              color: (AppTheme.isDark ? const Color(0xFFC5A85A) : const Color(0xFF0F265C)).withOpacity(AppTheme.isDark ? 0.15 : 0.05),
              blurRadius: 24,
              offset: const Offset(0, 8),
            )
          : BoxShadow(
              color: AppTheme.shadowColor,
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
    ];

    final badgeBg = isRecommended
        ? (AppTheme.isDark ? const Color(0xFFC5A85A) : const Color(0xFF0F265C))
        : (AppTheme.isDark ? Colors.grey.shade800 : Colors.grey.shade200);

    final badgeTextColor = isRecommended
        ? (AppTheme.isDark ? Colors.black : Colors.white)
        : AppTheme.textSecondary;

    final iconColor = isRecommended
        ? (AppTheme.isDark ? const Color(0xFFC5A85A) : const Color(0xFF0F265C))
        : (AppTheme.isDark ? Colors.grey.shade600 : Colors.grey.shade300);

    final buttonBg = isRecommended
        ? (AppTheme.isDark ? const Color(0xFFC5A85A) : const Color(0xFF0F265C))
        : (AppTheme.isDark ? Colors.white.withOpacity(0.08) : AppTheme.menuBg);

    final buttonTextColor = isRecommended
        ? (AppTheme.isDark ? Colors.black : Colors.white)
        : AppTheme.textPrimary;

    final buttonFontWeight = isRecommended ? FontWeight.w800 : FontWeight.bold;

    return Container(
      key: widgetKey,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(20),
        border: cardBorder,
        boxShadow: cardShadows,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(subtitle, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 1)),
                      if (badgeText != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(6)),
                          child: Text(
                            badgeText, 
                            style: TextStyle(
                              fontSize: 9, 
                              fontWeight: FontWeight.bold, 
                              color: badgeTextColor,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(title, style: TextStyle(fontFamily: 'Serif', fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 4),
                  Text(pricePerCredit, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
              Icon(
                isRecommended ? Icons.star : icon, 
                color: iconColor, 
                size: 40,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Text(totalPrice, style: TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: () {
                if (activePaymentMethod == 'vnpay') {
                  _showPaymentDialog('VNPay', id, name, credits, price, const Color(0xFF0070F3));
                } else {
                  _showPaymentMethodSelection(id, name, credits, price);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: buttonBg, 
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), 
                elevation: 0,
              ),
              child: Text(
                AppLang.tr('Chọn gói', 'Select Pack'), 
                style: TextStyle(
                  color: buttonTextColor, 
                  fontWeight: buttonFontWeight, 
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  final GlobalKey _recommendedPackageKey = GlobalKey();

  void _scrollToRecommended() {
    if (_recommendedPackageKey.currentContext != null) {
      Scrollable.ensureVisible(
        _recommendedPackageKey.currentContext!,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        title: Image.asset(
          'assets/logo.png',
          height: 48,
          color: AppTheme.isDark ? Colors.white : null,
          colorBlendMode: AppTheme.isDark ? BlendMode.srcIn : null,
        ),
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AppLang.tr('Nạp Tín Dụng', 'Top Up Credits'), style: TextStyle(fontFamily: 'Serif', fontSize: 34, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                  const SizedBox(height: 12),
                  Text(
                    AppLang.tr('Mở khóa sức mạnh phân tích cổ vật bằng AI. Mỗi lần giám định chỉ tốn một đơn vị tín dụng.', 'Unlock the power of AI artifact analysis. Each appraisal costs only one credit.'),
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 32),
                  
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(AppLang.tr('CHỌN GÓI TÍN DỤNG', 'SELECT CREDIT PACKAGE'), style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 1)),
                      InkWell(
                        onTap: _scrollToRecommended,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppTheme.menuBg, borderRadius: BorderRadius.circular(12)),
                          child: Text(AppLang.tr('KHUYÊN DÙNG', 'RECOMMENDED'), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.5)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  _buildPackageUI(1, AppLang.tr('Gói Cơ Bản', 'Basic Pack'), AppLang.tr('CƠ BẢN', 'BASIC'), AppLang.tr('10 Tín dụng', '10 Credits'), AppLang.tr('15,000đ / tín dụng', '15,000đ / credit'), '150.000đ', Icons.inventory_2_outlined, 10, 150000),
                  _buildPackageUI(2, AppLang.tr('Gói Phổ Biến', 'Popular Pack'), AppLang.tr('PHỔ BIẾN', 'POPULAR'), AppLang.tr('50 Tín dụng', '50 Credits'), AppLang.tr('12,000đ / tín dụng', '12,000đ / credit'), '600.000đ', Icons.star_border, 50, 600000, badgeText: AppLang.tr('TIẾT KIỆM 20%', 'SAVE 20%'), widgetKey: _recommendedPackageKey),
                  _buildPackageUI(3, AppLang.tr('Gói Chuyên Gia', 'Expert Pack'), AppLang.tr('CHUYÊN GIA', 'EXPERT'), AppLang.tr('200 Tín dụng', '200 Credits'), AppLang.tr('10,000đ / tín dụng', '10,000đ / credit'), '2.000.000đ', Icons.account_balance_outlined, 200, 2000000, badgeText: '-33% Off'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ===== PAYMENT DIALOG (QR + Polling) =====
class PaymentDialog extends StatefulWidget {
  final String method;
  final int packageId, credits, price;
  final String packageName;
  final Color color;
  final VoidCallback onCompleted;
  const PaymentDialog({Key? key, required this.method, required this.packageId, required this.packageName, required this.credits, required this.price, required this.color, required this.onCompleted}) : super(key: key);
  @override
  State<PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<PaymentDialog> {
  bool isCreating = true;
  bool isPolling = false;
  bool isCompleted = false;
  Map<String, dynamic>? paymentData;
  Timer? _pollTimer;
  int _pollCount = 0;
  String statusMsg = AppLang.tr('Khởi tạo thanh toán...', 'Initializing payment...');

  @override
  void initState() {
    super.initState();
    _createPayment();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _createPayment() async {
    try {
      final data = await createPayment(widget.packageId);
      if (mounted) setState(() { paymentData = data; isCreating = false; isPolling = true; statusMsg = AppLang.tr('Đang chờ thanh toán...', 'Waiting for payment...'); });
      _startPolling(data['payment_id']);
    } catch (e) {
      if (mounted) setState(() { isCreating = false; statusMsg = AppLang.tr('Lỗi tạo hóa đơn', 'Error creating invoice'); });
    }
  }

  void _startPolling(int paymentId) {
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!mounted) { timer.cancel(); return; }
      _pollCount++;
      if (_pollCount > 72) { timer.cancel(); setState(() { isPolling = false; statusMsg = AppLang.tr('Hết giờ. Vui lòng thử lại.', 'Timeout. Please try again.'); }); return; }
      try {
        final res = await checkPaymentStatus(paymentId);
        if (res['status'] == 'completed') {
          timer.cancel();
          if (mounted) setState(() { isCompleted = true; isPolling = false; statusMsg = AppLang.tr('Thanh toán thành công! Đã nạp ${res["credit_amount"]} tín dụng.', 'Payment successful! Added ${res["credit_amount"]} credits.'); });
          widget.onCompleted();
        } else if (res['status'] == 'failed') {
          timer.cancel();
          if (mounted) setState(() { isPolling = false; statusMsg = AppLang.tr('Hóa đơn đã hết hạn hoặc bị lỗi.', 'Invoice expired or error occurred.'); });
        }
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppTheme.cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 800),
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(children: [
                   Icon(Icons.payment, color: widget.color),
                   const SizedBox(width: 8),
                   Text(AppLang.tr('Thanh toán qua ${widget.method}', 'Pay via ${widget.method}'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: widget.color)),
                ]),
                IconButton(onPressed: () => Navigator.pop(context), icon: Icon(Icons.close, color: AppTheme.textMuted)),
              ]),
              const Divider(height: 30),
              if (isCreating) ...[
                const SizedBox(height: 40),
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                Text(AppLang.tr('Đang tạo mã QR...', 'Generating QR code...'), style: TextStyle(color: AppTheme.textMuted)),
                const SizedBox(height: 40),
              ] else if (isCompleted) ...[
                const SizedBox(height: 40),
                const Icon(Icons.check_circle, color: Colors.green, size: 80),
                const SizedBox(height: 16),
                Text(statusMsg, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 18), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                SizedBox(
                  width: 200,
                  height: 45,
                  child: ElevatedButton(
                    onPressed: () { 
                      Navigator.pop(context); // Close dialog
                    }, 
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), 
                    child: Text(AppLang.tr('Hoàn Thành', 'Done'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))
                  ),
                ),
                const SizedBox(height: 20),
              ] else if (paymentData != null) ...[
                _buildPaymentLayout(),
              ] else ...[
                const SizedBox(height: 40),
                Text(statusMsg, style: const TextStyle(color: Colors.red, fontSize: 16)),
                const SizedBox(height: 20),
                TextButton(onPressed: () => Navigator.pop(context), child: Text(AppLang.tr('Đóng', 'Close'), style: const TextStyle(fontSize: 16))),
              ],
            ]),
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentLayout() {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth > 600) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 5, child: _buildQRSection()),
              const SizedBox(width: 32),
              Expanded(flex: 7, child: _buildInfoSection()),
            ],
          );
        }
        return Column(
          children: [
             _buildQRSection(),
             const SizedBox(height: 24),
             _buildInfoSection(),
          ],
        );
      },
    );
  }

  Widget _buildQRSection() {
    final method = paymentData!['payment_method'] ?? 'sepay';
    
    if (method == 'vnpay') {
      final vnpayUrl = paymentData!['vnpay_url'] ?? paymentData!['qr_url'] ?? '';
      return Container(
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 20, offset: const Offset(0, 10))],
          border: Border.all(color: AppTheme.dividerColor),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.payment_outlined, size: 64, color: Colors.blue.shade700),
            ),
            const SizedBox(height: 20),
            Text(
              AppLang.tr('Thanh toán VNPay', 'VNPay Gateway'),
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 10),
            Text(
              AppLang.tr(
                'Nhấp vào nút bên dưới để thực hiện thanh toán an toàn qua cổng VNPay trên trình duyệt của bạn.',
                'Click the button below to pay securely via VNPay gateway in your browser.',
              ),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.4),
            ),
            const SizedBox(height: 24),
            Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final uri = Uri.parse(vnpayUrl);
                      try {
                        bool launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
                        if (!launched) {
                          launched = await launchUrl(uri, mode: LaunchMode.platformDefault);
                        }
                        if (!launched && mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(AppLang.tr('Không thể mở liên kết trực tiếp.', 'Cannot launch link directly.'))),
                          );
                        }
                      } catch (e) {
                        try {
                          await launchUrl(uri);
                        } catch (err) {
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(AppLang.tr('Lỗi mở trình duyệt: $err', 'Browser launch error: $err'))),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.open_in_browser, color: Colors.white),
                    label: Text(
                      AppLang.tr('Mở VNPay', 'Open VNPay'),
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue.shade700,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      await Clipboard.setData(ClipboardData(text: vnpayUrl));
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(AppLang.tr('Đã copy link thanh toán!', 'Copied payment link!'))),
                      );
                    },
                    icon: Icon(Icons.copy, color: Colors.blue.shade700, size: 20),
                    label: Text(
                      AppLang.tr('Copy Link', 'Copy Link'),
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue.shade700, fontSize: 14),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.blue.shade700, width: 1.5),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    final transferContent = paymentData!['transfer_content'] ?? '';
    final bankCode = paymentData!['bank_name'] ?? 'ACB';
    final acc = paymentData!['account_number'] ?? '28569967';
    final name = paymentData!['account_name'] ?? 'MA GIA TUAN';
    final price = widget.price;
    final qrUrl = paymentData!['qr_url'] ?? 'https://img.vietqr.io/image/$bankCode-$acc-compact2.png?amount=$price&addInfo=$transferContent&accountName=$name';

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 20, offset: const Offset(0, 10))],
        border: Border.all(color: AppTheme.dividerColor),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.network(qrUrl, height: 260, fit: BoxFit.contain, loadingBuilder: (ctx, child, progress) {
              if (progress == null) return child;
              return const SizedBox(height: 260, child: Center(child: CircularProgressIndicator()));
            }),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: widget.color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.qr_code_scanner, color: widget.color, size: 20),
                const SizedBox(width: 10),
                Text(
                  widget.method == 'VietQR' ? AppLang.tr('Quét mã để thanh toán', 'Scan code to pay') : AppLang.tr('Mở App ${widget.method} để quét mã', 'Open ${widget.method} App to scan'),
                  style: TextStyle(fontSize: 13, color: widget.color, fontWeight: FontWeight.bold)
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildInfoSection() {
    final method = paymentData!['payment_method'] ?? 'sepay';
    
    if (method == 'vnpay') {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(AppLang.tr('Trạng thái giao dịch', 'Transaction Status'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 20),
          _buildDetailCard(Icons.info_outline, AppLang.tr('Phương thức', 'Method'), 'VNPay Gateway'),
          _buildDetailCard(Icons.sync, AppLang.tr('Trạng thái', 'Status'), AppLang.tr('Đang chờ thanh toán...', 'Waiting for payment...'), valueColor: Colors.orange),
          _buildDetailCard(Icons.payments_outlined, AppLang.tr('Số tiền', 'Amount'), '${(widget.price / 1000).toStringAsFixed(0)}.000 VNĐ', valueColor: widget.color, isBold: true),
          
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.isDark ? const Color(0xFF1E293B) : Colors.blue.shade50,
              borderRadius: BorderRadius.circular(16), 
              border: Border.all(color: AppTheme.isDark ? Colors.blue.shade700 : Colors.blue.shade200)
            ),
            child: Text(
              AppLang.tr(
                'Sau khi hoàn tất thanh toán trên cổng VNPay, ứng dụng sẽ tự động nhận diện kết quả và cộng tín dụng cho bạn trong vài giây.',
                'Once payment is completed on VNPay portal, the app will automatically recognize the result and credit you in seconds.',
              ),
              style: TextStyle(fontSize: 13, color: AppTheme.textSecondary, height: 1.5),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      );
    }

    final transferContent = paymentData!['transfer_content'] ?? '';
    final bank = paymentData!['bank_name'] ?? 'ACB Bank';
    final acc = paymentData!['account_number'] ?? '28569967';
    final name = paymentData!['account_name'] ?? 'Mã Gia Tuấn';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(AppLang.tr('Thông tin thanh toán', 'Payment Information'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
        const SizedBox(height: 20),
        _buildDetailCard(Icons.account_balance_outlined, AppLang.tr('Ngân hàng', 'Bank'), bank),
        _buildDetailCard(Icons.credit_card_outlined, AppLang.tr('Số tài khoản', 'Account Number'), acc, copyable: true),
        _buildDetailCard(Icons.person_outline, AppLang.tr('Chủ tài khoản', 'Account Name'), name),
        _buildDetailCard(Icons.payments_outlined, AppLang.tr('Số tiền', 'Amount'), '${(widget.price / 1000).toStringAsFixed(0)}.000 VNĐ', valueColor: widget.color, isBold: true),
        
        const SizedBox(height: 24),
        
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppTheme.isDark ? const Color(0xFF2C2410) : Colors.amber.shade50,
            borderRadius: BorderRadius.circular(16), 
            border: Border.all(color: AppTheme.isDark ? Colors.amber.shade700 : Colors.amber.shade200)
          ),
          child: Column(
            children: [
              Text(AppLang.tr('NỘI DUNG CHUYỂN KHOẢN', 'TRANSFER CONTENT'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange, letterSpacing: 0.5)),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: AppTheme.inputBg, borderRadius: BorderRadius.circular(10)),
                child: Text(transferContent, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1, color: AppTheme.textPrimary), textAlign: TextAlign.center),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 45,
                child: ElevatedButton.icon(
                  onPressed: () { 
                    Clipboard.setData(ClipboardData(text: transferContent)); 
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã sao chép nội dung CK'), backgroundColor: Colors.green)); 
                  },
                  icon: const Icon(Icons.copy, size: 20),
                  label: Text(AppLang.tr('Sao chép nội dung', 'Copy content'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber, 
                    foregroundColor: AppTheme.isDark ? Colors.black : Colors.black87,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                  ),
                ),
              ),
            ]
          ),
        ),
        const SizedBox(height: 12),
        // Nút DEV TEST - Giả lập thanh toán thành công
        paymentData != null ? OutlinedButton.icon(
          onPressed: () async {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLang.tr('Đang kích hoạt giả lập thanh toán...', 'Activating simulated payment...')), backgroundColor: Colors.orange));
            await simulateTestPayment(paymentData!['payment_id']);
          },
          icon: const Icon(Icons.bug_report, size: 16, color: Colors.orange),
          label: Text(AppLang.tr('Dev Tool: Giả lập thanh toán thành công', 'Dev Tool: Simulate successful payment'), style: const TextStyle(color: Colors.orange, fontSize: 13, fontWeight: FontWeight.bold)),
          style: OutlinedButton.styleFrom(side: const BorderSide(color: Colors.orange), padding: const EdgeInsets.symmetric(vertical: 12)),
        ) : const SizedBox(),
        const SizedBox(height: 12),
        _buildStatusIndicator(),
      ],
    );
  }

  Widget _buildDetailCard(IconData icon, String label, String value, {bool copyable = false, Color? valueColor, bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppTheme.isDark ? Colors.grey.shade800 : Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 22, color: AppTheme.textSecondary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 15, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: valueColor ?? AppTheme.textPrimary)),
              ],
            ),
          ),
          if (copyable)
            IconButton(
              icon: const Icon(Icons.copy, size: 20, color: Colors.blue),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: value));
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã sao chép $label'), backgroundColor: Colors.green));
              },
              tooltip: 'Sao chép',
            ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isPolling ? widget.color.withOpacity(0.1) : (AppTheme.isDark ? Colors.grey.shade800 : Colors.grey.shade100),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isPolling ? widget.color.withOpacity(0.3) : AppTheme.dividerColor)
      ),
      child: Row(
        children: [
          if (isPolling) ...[
            SizedBox(
              width: 20, 
              height: 20, 
              child: CircularProgressIndicator(strokeWidth: 2.5, color: widget.color)
            ), 
            const SizedBox(width: 16),
          ] else ...[
            Icon(Icons.info_outline, size: 22, color: AppTheme.textMuted),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Text(
              statusMsg, 
              style: TextStyle(
                color: isPolling ? widget.color : AppTheme.textSecondary,
                fontSize: 14, 
                fontWeight: FontWeight.w600
              )
            )
          ),
        ],
      ),
    );
  }
}

// ===== FREE LIMIT GATE (used in DebateScreen) =====
class PaymentGate {
  static Future<bool> checkAndShowGate(BuildContext context, {int freeUsed = 0, int freeLimit = 5, double tokenBalance = 0}) async {
    if (freeUsed < freeLimit || tokenBalance > 0) return true;
    await showDialog(context: context, barrierDismissible: false, builder: (_) => _PaymentGateDialog(freeLimit: freeLimit));
    return false;
  }
}

class _PaymentGateDialog extends StatelessWidget {
  final int freeLimit;
  const _PaymentGateDialog({required this.freeLimit});
  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppTheme.cardBg,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 80, height: 80, decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF1A2344), Color(0xFF2C3A5E)]), shape: BoxShape.circle),
            child: const Icon(Icons.lock_outline, color: Colors.white, size: 40)),
          const SizedBox(height: 20),
          Text(AppLang.tr('Đã hết lượt miễn phí', 'Free limit reached'), style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 10),
          Text(AppLang.tr('Bạn đã sử dụng hết $freeLimit lượt phân tích miễn phí.\nNạp thêm lượt để tiếp tục sử dụng hệ thống AI.', 'You have used all $freeLimit free analysis credits.\nPlease top up to continue using the AI system.'), textAlign: TextAlign.center, style: TextStyle(color: AppTheme.textMuted, height: 1.5)),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 50,
            child: ElevatedButton.icon(
              onPressed: () { Navigator.pop(context); MainGate.currentInstance?.switchTab(3); },
              icon: const Icon(Icons.add_shopping_cart),
              label: Text(AppLang.tr('Nạp Lượt Ngay', 'Top Up Now'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.navyButton, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            ),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: () => Navigator.pop(context), child: Text(AppLang.tr('Hủy', 'Cancel'), style: TextStyle(color: AppTheme.textMuted))),
        ]),
      ),
    );
  }
}
