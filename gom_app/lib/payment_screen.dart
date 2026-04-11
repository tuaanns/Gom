import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'auth_state.dart';
import 'main.dart';

const String _baseUrl = 'http://localhost:8000';

// ===== API HELPERS =====
Future<Map<String, dynamic>> fetchPaymentStatus() async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/status'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
  return jsonDecode(res.body);
}

Future<Map<String, dynamic>> createPayment(int packageId) async {
  final res = await http.post(
    Uri.parse('$_baseUrl/api/payment/create'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
    body: {'package_id': packageId.toString()},
  );
  return jsonDecode(res.body);
}

Future<Map<String, dynamic>> checkPaymentStatus(int paymentId) async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/check/$paymentId'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
  return jsonDecode(res.body);
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

  @override
  void initState() {
    super.initState();
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    setState(() => isLoadingStatus = true);
    try {
      final data = await fetchPaymentStatus();
      if (mounted) {
        setState(() {
          tokenBalance = (data['token_balance'] ?? 0).toDouble();
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
      builder: (BuildContext ctx) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 30),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Chọn phương thức thanh toán', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F265C))),
              const SizedBox(height: 20),
              _buildPaymentMethodTile(
                icon: Icons.qr_code_2,
                title: 'Chuyển khoản (VietQR)',
                subtitle: 'Hỗ trợ quét bằng mọi app ngân hàng',
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('VietQR', id, name, credits, price, const Color(0xFF0F265C));
                },
              ),
              const Divider(height: 1),
              _buildPaymentMethodTile(
                icon: Icons.account_balance_wallet,
                title: 'Ví MoMo',
                subtitle: 'Quét mã VietQR bằng app MoMo',
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('MoMo', id, name, credits, price, const Color(0xFFA50064));
                },
              ),
              const Divider(height: 1),
              _buildPaymentMethodTile(
                icon: Icons.account_balance_wallet_outlined,
                title: 'Ví ZaloPay',
                subtitle: 'Quét mã VietQR bằng app ZaloPay',
                onTap: () {
                  Navigator.pop(ctx);
                  _showPaymentDialog('ZaloPay', id, name, credits, price, const Color(0xFF005AFE));
                },
              ),
            ],
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
        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: Colors.blue.shade700),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: const Icon(Icons.chevron_right),
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
    return Container(
      key: widgetKey,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 10))]),
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
                      Text(subtitle, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF8B95A9), letterSpacing: 1)),
                      if (badgeText != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFD32F2F), borderRadius: BorderRadius.circular(6)),
                          child: Text(badgeText, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(title, style: const TextStyle(fontFamily: 'Serif', fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                  const SizedBox(height: 4),
                  Text(pricePerCredit, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ],
              ),
              Icon(icon, color: Colors.grey.shade300, size: 40),
            ],
          ),
          const SizedBox(height: 24),
          Text(totalPrice, style: const TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: () => _showPaymentMethodSelection(id, name, credits, price),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE8E4D5), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), elevation: 0),
              child: const Text('Chọn gói', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.bold, fontSize: 16)),
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
    final avatarUrl = AuthState.user?['avatar'] as String?;
    
    return Scaffold(
      backgroundColor: const Color(0xFFFAF9F4),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(Icons.menu, color: Color(0xFF0F265C)),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: const Text('THE ARCHIVIST', style: TextStyle(color: Color(0xFF0F265C), fontWeight: FontWeight.w600, letterSpacing: 1.5, fontSize: 16)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 14,
              backgroundColor: Colors.grey.shade300,
              backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl.replaceAll('http://localhost/', 'http://localhost:8000/')) : null,
              child: avatarUrl == null ? const Icon(Icons.person, size: 18, color: Colors.white) : null,
            ),
          )
        ],
      ),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Nạp Tín Dụng', style: TextStyle(fontFamily: 'Serif', fontSize: 34, fontWeight: FontWeight.bold, color: Color(0xFF0F265C))),
                  const SizedBox(height: 12),
                  const Text(
                    'Mở khóa sức mạnh phân tích cổ vật bằng AI. Mỗi lần giám định chỉ tốn một đơn vị tín dụng.',
                    style: TextStyle(color: Color(0xFF5A6682), fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 32),
                  
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('CHỌN GÓI TÍN DỤNG', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5A6682), letterSpacing: 1)),
                      InkWell(
                        onTap: _scrollToRecommended,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(12)),
                          child: const Text('KHUYÊN DÙNG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF5A6682), letterSpacing: 0.5)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  
                  _buildPackageUI(1, 'Gói Cơ Bản', 'CƠ BẢN', '10 Tín dụng', '15,000đ / tín dụng', '150.000đ', Icons.inventory_2_outlined, 10, 150000),
                  _buildPackageUI(2, 'Gói Phổ Biến', 'PHỔ BIẾN', '50 Tín dụng', '12,000đ / tín dụng', '600.000đ', Icons.star_border, 50, 600000, badgeText: 'TIẾT KIỆM 20%', widgetKey: _recommendedPackageKey),
                  _buildPackageUI(3, 'Gói Chuyên Gia', 'CHUYÊN GIA', '200 Tín dụng', '10,000đ / tín dụng', '2.000.000đ', Icons.account_balance_outlined, 200, 2000000, badgeText: '-33% Off'),
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
  String statusMsg = 'Khởi tạo thanh toán...';

  @override
  void initState() {
    super.initState();
    _createPayment();
  }

  Future<void> _createPayment() async {
    try {
      final data = await createPayment(widget.packageId);
      if (mounted) setState(() { paymentData = data; isCreating = false; isPolling = true; statusMsg = 'Đang chờ thanh toán...'; });
      _startPolling(data['payment_id']);
    } catch (e) {
      if (mounted) setState(() { isCreating = false; statusMsg = 'Lỗi tạo hóa đơn'; });
    }
  }

  void _startPolling(int paymentId) {
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      if (!mounted) { timer.cancel(); return; }
      _pollCount++;
      if (_pollCount > 72) { timer.cancel(); setState(() { isPolling = false; statusMsg = 'Hết giờ. Vui lòng thử lại.'; }); return; }
      try {
        final res = await checkPaymentStatus(paymentId);
        if (res['status'] == 'completed') {
          timer.cancel();
          if (mounted) setState(() { isCompleted = true; isPolling = false; statusMsg = 'Thanh toán thành công! Đã nạp ${res["credit_amount"]} tín dụng.'; });
          widget.onCompleted();
        } else if (res['status'] == 'failed') {
          timer.cancel();
          if (mounted) setState(() { isPolling = false; statusMsg = 'Hóa đơn đã hết hạn hoặc bị lỗi.'; });
        }
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
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
                   Text('Thanh toán qua ${widget.method}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: widget.color)),
                ]),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Colors.grey)),
              ]),
              const Divider(height: 30),
              if (isCreating) ...[
                const SizedBox(height: 40),
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                const Text('Đang tạo mã QR...', style: TextStyle(color: Colors.grey)),
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
                      MainGate.currentInstance?.switchTab(0); // Go to Home
                    }, 
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), 
                    child: const Text('Hoàn Thành', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))
                  ),
                ),
                const SizedBox(height: 20),
              ] else if (paymentData != null) ...[
                _buildPaymentLayout(),
              ] else ...[
                const SizedBox(height: 40),
                Text(statusMsg, style: const TextStyle(color: Colors.red, fontSize: 16)),
                const SizedBox(height: 20),
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Đóng', style: TextStyle(fontSize: 16))),
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
    final transferContent = paymentData!['transfer_content'] ?? '';
    final bankCode = 'ACB';
    final acc = '28569967';
    final name = 'MA GIA TUAN';
    final price = widget.price;
    // We use a dynamic format that Momo/ZaloPay scan perfectly via VietQR network
    final qrUrl = 'https://img.vietqr.io/image/$bankCode-$acc-compact2.png?amount=$price&addInfo=$transferContent&accountName=$name';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 10))],
        border: Border.all(color: Colors.grey.shade100),
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
                  widget.method == 'VietQR' ? 'Quét mã để thanh toán' : 'Mở App ${widget.method} để quét mã', 
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
    final transferContent = paymentData!['transfer_content'] ?? '';
    final bank = 'ACB Bank';
    final acc = '28569967';
    final name = 'Mã Gia Tuấn';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Thông tin thanh toán', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
        const SizedBox(height: 20),
        _buildDetailCard(Icons.account_balance_outlined, 'Ngân hàng', bank),
        _buildDetailCard(Icons.credit_card_outlined, 'Số tài khoản', acc, copyable: true),
        _buildDetailCard(Icons.person_outline, 'Chủ tài khoản', name),
        _buildDetailCard(Icons.payments_outlined, 'Số tiền', '${(widget.price / 1000).toStringAsFixed(0)}.000 VNĐ', valueColor: widget.color, isBold: true),
        
        const SizedBox(height: 24),
        
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.amber.shade50, 
            borderRadius: BorderRadius.circular(16), 
            border: Border.all(color: Colors.amber.shade200)
          ),
          child: Column(
            children: [
              const Text('NỘI DUNG CHUYỂN KHOẢN', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.orange, letterSpacing: 0.5)),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(10)),
                child: Text(transferContent, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1), textAlign: TextAlign.center),
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
                  label: const Text('Sao chép nội dung', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.amber, 
                    foregroundColor: Colors.black87,
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
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang kích hoạt giả lập thanh toán...'), backgroundColor: Colors.orange));
            await simulateTestPayment(paymentData!['payment_id']);
          },
          icon: const Icon(Icons.bug_report, size: 16, color: Colors.orange),
          label: const Text('Dev Tool: Giả lập thanh toán thành công', style: TextStyle(color: Colors.orange, fontSize: 13, fontWeight: FontWeight.bold)),
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
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 22, color: Colors.grey.shade700),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                const SizedBox(height: 4),
                Text(value, style: TextStyle(fontSize: 15, fontWeight: isBold ? FontWeight.bold : FontWeight.w600, color: valueColor ?? Colors.black87)),
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
        color: isPolling ? widget.color.withOpacity(0.05) : Colors.grey.shade100, 
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isPolling ? widget.color.withOpacity(0.2) : Colors.grey.shade200)
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
            Icon(Icons.info_outline, size: 22, color: Colors.grey.shade600),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Text(
              statusMsg, 
              style: TextStyle(
                color: isPolling ? widget.color : Colors.grey.shade700, 
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 80, height: 80, decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF1A2344), Color(0xFF2C3A5E)]), shape: BoxShape.circle),
            child: const Icon(Icons.lock_outline, color: Colors.white, size: 40)),
          const SizedBox(height: 20),
          const Text('Đã hết lượt miễn phí', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A2344))),
          const SizedBox(height: 10),
          Text('Bạn đã sử dụng hết $freeLimit lượt phân tích mien phi.\nNạp thêm lượt để tiếp tục sử dụng hệ thống AI.', textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey, height: 1.5)),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 50,
            child: ElevatedButton.icon(
              onPressed: () { Navigator.pop(context); MainGate.currentInstance?.switchTab(2); },
              icon: const Icon(Icons.add_shopping_cart),
              label: const Text('Nạp Lượt Ngay', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1A2344), foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
            ),
          ),
          const SizedBox(height: 10),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy', style: TextStyle(color: Colors.grey))),
        ]),
      ),
    );
  }
}
