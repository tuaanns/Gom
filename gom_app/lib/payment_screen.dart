import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'auth_state.dart';
import 'main.dart';

const String _baseUrl = 'http://127.0.0.1:8000';

// ===== API HELPERS =====
Future<Map<String, dynamic>> fetchPaymentStatus() async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/status'),
    headers: {'Authorization': 'Bearer ${AuthState.token}'},
  );
  return jsonDecode(res.body);
}

Future<Map<String, dynamic>> fetchPaymentHistory() async {
  final res = await http.get(
    Uri.parse('$_baseUrl/api/payment/history'),
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

// ===== PAYMENT SCREEN =====
class PaymentScreen extends StatefulWidget {
  const PaymentScreen({Key? key}) : super(key: key);
  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  double tokenBalance = 0;
  int freeUsed = 0;
  int freeLimit = 5;
  bool isLoadingStatus = true;
  List<dynamic> txHistory = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadStatus();
  }

  Future<void> _loadStatus() async {
    setState(() => isLoadingStatus = true);
    try {
      final data = await fetchPaymentStatus();
      final hist = await fetchPaymentHistory();
      if (mounted) setState(() {
        tokenBalance = (data['token_balance'] ?? 0).toDouble();
        freeUsed     = (data['free_predictions_used'] ?? 0);
        freeLimit    = (data['free_limit'] ?? 5);
        txHistory    = hist['data'] ?? [];
        isLoadingStatus = false;
      });
    } catch (_) { setState(() => isLoadingStatus = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F0E8),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            expandedHeight: 240,
            floating: false,
            pinned: true,
            backgroundColor: const Color(0xFF1A2344),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () {
                MainGate.currentInstance?.switchTab(0);
              },
            ),
            title: innerBoxIsScrolled ? const Text('Nạp Lượt', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)) : null,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF0D1525), Color(0xFF1A2344), Color(0xFF2C3A5E)], begin: Alignment.topCenter, end: Alignment.bottomCenter),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 50, 24, 20),
                    child: isLoadingStatus
                      ? const Center(child: CircularProgressIndicator(color: Colors.white))
                      : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const SizedBox(height: 10),
                          Row(children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(color: Colors.white.withOpacity(0.12), borderRadius: BorderRadius.circular(14)),
                              child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 24),
                            ),
                            const SizedBox(width: 16),
                            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('Số dư hiện tại', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13)),
                              Text('${tokenBalance.toStringAsFixed(0)} lượt', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                            ]),
                          ]),
                          const Spacer(),
                          Row(children: [
                            _headerBadge(Icons.card_giftcard, 'Miễn phí', '$freeUsed/$freeLimit', Colors.amber),
                            const SizedBox(width: 12),
                            _headerBadge(Icons.diamond_outlined, 'Trả phí', tokenBalance > 0 ? '${tokenBalance.toStringAsFixed(0)}' : '0', Colors.greenAccent),
                            const SizedBox(width: 12),
                            _headerBadge(Icons.trending_up, 'Tổng', '${freeUsed + tokenBalance.toInt()}', Colors.lightBlueAccent),
                          ]),
                        ]),
                  ),
                ),
              ),
            ),
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(48),
              child: Container(
                color: const Color(0xFF1A2344),
                child: TabBar(
                  controller: _tabController,
                  indicatorColor: Colors.amber,
                  indicatorWeight: 3,
                  labelColor: Colors.white,
                  unselectedLabelColor: Colors.white54,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold),
                  tabs: const [
                    Tab(icon: Icon(Icons.add_shopping_cart, size: 18), text: 'Nạp Lượt'),
                    Tab(icon: Icon(Icons.receipt_long, size: 18), text: 'Lịch Sử'),
                  ],
                ),
              ),
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildTopUpTab(),
            _buildHistoryTab(),
          ],
        ),
      ),
    );
  }

  Widget _headerBadge(IconData icon, String label, String value, Color color) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
      child: Row(children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 10)),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
        ])),
      ]),
    ),
  );

  Widget _buildTopUpTab() {
    return RefreshIndicator(
      onRefresh: _loadStatus,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(children: [
          const Align(alignment: Alignment.centerLeft,
            child: Text('CHỌN GÓI NẠP', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1, fontSize: 13))),
          const SizedBox(height: 14),
          _buildPackageCard(1, 'Gói Cơ Bản',     10, 20000,  const Color(0xFF42A5F5), Icons.star_border, false),
          _buildPackageCard(2, 'Gói Tiêu Chuẩn',  30, 50000,  const Color(0xFF1A2344), Icons.star_half,   true),
          _buildPackageCard(3, 'Gói Cao Cấp',     70, 100000, const Color(0xFF7B1FA2), Icons.star,        false),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.amber.shade50, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.amber.shade200)),
            child: const Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Icon(Icons.info_outline, color: Colors.amber, size: 20),
              SizedBox(width: 12),
              Expanded(child: Text('Hệ thống tự động xác nhận sau khi chuyển khoản thành công. Vui lòng giữ nguyên nội dung chuyển khoản.', style: TextStyle(fontSize: 12, color: Colors.black87, height: 1.4))),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _buildPackageCard(int id, String name, int credits, int price, Color color, IconData icon, bool isPopular) {
    final savings = isPopular ? 'Tiết kiệm 17%' : id == 3 ? 'Tiết kiệm 30%' : null;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: Material(
        borderRadius: BorderRadius.circular(18),
        color: Colors.white,
        elevation: isPopular ? 4 : 2,
        shadowColor: isPopular ? color.withOpacity(0.3) : Colors.black12,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _showPaymentDialog(id, name, credits, price, color),
          child: Container(
            decoration: isPopular ? BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: color.withOpacity(0.3), width: 2),
            ) : null,
            child: Stack(children: [
              if (isPopular)
                Positioned(
                  top: 0, right: 20,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(8), bottomRight: Radius.circular(8))),
                    child: const Text('PHỔ BIẾN', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(children: [
                  Container(
                    width: 54, height: 54,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(colors: [color.withOpacity(0.15), color.withOpacity(0.05)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(icon, color: color, size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 16)),
                    const SizedBox(height: 4),
                    Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(6)),
                        child: Text('+$credits LƯỢT', style: const TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                      if (savings != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(6)),
                          child: Text(savings, style: TextStyle(color: Colors.orange.shade700, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ]),
                  ])),
                  Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                    Text('${(price / 1000).toStringAsFixed(0)}K', style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 22)),
                    Text('VND', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                  ]),
                ]),
              ),
            ]),
          ),
        ),
      ),
    );
  }

  void _showPaymentDialog(int packageId, String name, int credits, int price, Color color) {
    showDialog(context: context, builder: (_) => PaymentDialog(packageId: packageId, packageName: name, credits: credits, price: price, color: color, onCompleted: _loadStatus));
  }

  Widget _buildHistoryTab() {
    if (isLoadingStatus) return const Center(child: CircularProgressIndicator());
    if (txHistory.isEmpty) return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(
        width: 80, height: 80,
        decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
        child: Icon(Icons.receipt_long_outlined, size: 40, color: Colors.grey.shade400),
      ),
      const SizedBox(height: 16),
      const Text('Chưa có giao dịch nào', style: TextStyle(color: Colors.grey, fontSize: 16, fontWeight: FontWeight.w500)),
      const SizedBox(height: 6),
      Text('Lịch sử nạp lượt sẽ hiện ở đây', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
    ]));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: txHistory.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final tx = txHistory[i];
        final isIn = tx['type'] == 'in';
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white, borderRadius: BorderRadius.circular(14),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 3))],
          ),
          child: Row(children: [
            Container(width: 44, height: 44,
              decoration: BoxDecoration(color: isIn ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
              child: Icon(isIn ? Icons.add_circle_outline : Icons.remove_circle_outline, color: isIn ? Colors.green : Colors.red, size: 24)),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tx['description'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
              const SizedBox(height: 2),
              Text(tx['created_at']?.toString().substring(0, 10) ?? '', style: const TextStyle(color: Colors.grey, fontSize: 11)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(color: isIn ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
              child: Text('${isIn ? "+" : "-"}${tx['amount']} lượt', style: TextStyle(fontWeight: FontWeight.bold, color: isIn ? Colors.green : Colors.red, fontSize: 14)),
            ),
          ]),
        );
      },
    );
  }
}

// ===== PAYMENT DIALOG (QR + Polling) =====
class PaymentDialog extends StatefulWidget {
  final int packageId, credits, price;
  final String packageName;
  final Color color;
  final VoidCallback onCompleted;
  const PaymentDialog({Key? key, required this.packageId, required this.packageName, required this.credits, required this.price, required this.color, required this.onCompleted}) : super(key: key);
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
  String statusMsg = 'Đang tạo hóa đơn...';

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
          if (mounted) setState(() { isCompleted = true; isPolling = false; statusMsg = 'Thanh toán thành công! Đã nạp ${res["credit_amount"]} lượt.'; });
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
                   Text(widget.packageName, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: widget.color)),
                ]),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close, color: Colors.grey)),
              ]),
              const Divider(height: 30),
              if (isCreating) ...[
                const SizedBox(height: 40),
                const CircularProgressIndicator(),
                const SizedBox(height: 16),
                const Text('Đang tạo hóa đơn...', style: TextStyle(color: Colors.grey)),
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
                  child: ElevatedButton(onPressed: () => Navigator.pop(context), style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))), child: const Text('Hoàn Thành', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
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
    final bank = 'ACB';
    final acc = '28569967';
    final name = 'Ma Gia Tuan';
    final price = widget.price;
    final qrUrl = 'https://img.vietqr.io/image/$bank-$acc-compact2.png?amount=$price&addInfo=$transferContent&accountName=$name';

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
            child: Image.network(qrUrl, height: 280, fit: BoxFit.contain, loadingBuilder: (ctx, child, progress) {
              if (progress == null) return child;
              return const SizedBox(height: 280, child: Center(child: CircularProgressIndicator()));
            }),
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.qr_code_scanner, color: Colors.blue.shade700, size: 20),
                const SizedBox(width: 10),
                Text('Quét mã để thanh toán', style: TextStyle(fontSize: 14, color: Colors.blue.shade700, fontWeight: FontWeight.bold)),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildInfoSection() {
    final transferContent = paymentData!['transfer_content'] ?? '';
    final bank = 'ACB';
    final acc = '28569967';
    final name = 'Ma Gia Tuan';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Thông tin thanh toán', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87)),
        const SizedBox(height: 20),
        _buildDetailCard(Icons.account_balance_outlined, 'Ngân hàng', bank),
        _buildDetailCard(Icons.credit_card_outlined, 'Số tài khoản', acc, copyable: true),
        _buildDetailCard(Icons.person_outline, 'Chủ tài khoản', name),
        _buildDetailCard(Icons.payments_outlined, 'Số tiền', '${(widget.price / 1000).toStringAsFixed(0)}.000 VNĐ', valueColor: Colors.blue.shade700, isBold: true),
        
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
        const SizedBox(height: 32),
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
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusIndicator() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: isPolling ? Colors.blue.shade50 : Colors.grey.shade100, 
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isPolling ? Colors.blue.shade100 : Colors.grey.shade200)
      ),
      child: Row(
        children: [
          if (isPolling) ...[
            SizedBox(
              width: 20, 
              height: 20, 
              child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.blue.shade600)
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
                color: isPolling ? Colors.blue.shade700 : Colors.grey.shade700, 
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
          Container(width: 80, height: 80, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF1A2344), Color(0xFF2C3A5E)]), shape: BoxShape.circle),
            child: const Icon(Icons.lock_outline, color: Colors.white, size: 40)),
          const SizedBox(height: 20),
          const Text('Đã hết lượt miễn phí', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1A2344))),
          const SizedBox(height: 10),
          Text('Bạn đã sử dụng hết $freeLimit lượt phân tích mien phi.\nNạp thêm lượt để tiếp tục sử dụng hệ thống AI.', textAlign: TextAlign.center, style: const TextStyle(color: Colors.grey, height: 1.5)),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 50,
            child: ElevatedButton.icon(
              onPressed: () { Navigator.pop(context); Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentScreen())); },
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

