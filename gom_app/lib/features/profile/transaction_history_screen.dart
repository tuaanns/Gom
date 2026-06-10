import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/app_theme.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({Key? key}) : super(key: key);
  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  static String get _baseUrl => ApiConfig.baseUrl;
  bool _isLoading = true;
  List<dynamic> _transactions = [];

  @override
  void initState() {
    super.initState();
    _fetchTransactions();
  }

  Future<void> _fetchTransactions() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/payment/history'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _transactions = body['data'] ?? [];
            _isLoading = false;
          });
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '';
    try {
      final d = DateTime.parse(raw).toLocal();
      return '${d.day}/${d.month}/${d.year} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return raw;
    }
  }

  String _fmtVnd(dynamic val) {
    if (val == null) return '0đ';
    try {
      final n = double.tryParse(val.toString())?.toInt() ?? 0;
      final RegExp reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
      final String Function(Match) mathFunc = (Match match) => '${match[1]}.';
      return '${n.toString().replaceAllMapped(reg, mathFunc)}đ';
    } catch (_) {
      return '$valđ';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        backgroundColor: AppTheme.cardBg,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: AppTheme.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          AppLang.tr('Lịch sử giao dịch', 'Transaction History'),
          style: TextStyle(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.bold,
            fontFamily: 'Serif',
            fontSize: 18,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _transactions.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 64, color: AppTheme.textMuted.withOpacity(0.5)),
                      const SizedBox(height: 16),
                      Text(
                        AppLang.tr('Chưa có giao dịch nào', 'No transaction history'),
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 16, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  itemCount: _transactions.length,
                  itemBuilder: (ctx, i) {
                    final tx = _transactions[i];
                    final package = AppLang.translate(tx['package_name']?.toString() ?? 'Nạp lượt');
                    final amountVnd = tx['amount'] ?? 0;
                    final credits = tx['credit_amount'] ?? 0;
                    final status = tx['status'] ?? 'pending';
                    final date = _fmtDate(tx['created_at']);

                    Color statusColor;
                    String statusText;
                    IconData icon;
                    Color iconBg;

                    if (status == 'completed') {
                      statusColor = Colors.green;
                      statusText = AppLang.tr('Thành công', 'Success');
                      icon = Icons.check_circle_outline;
                      iconBg = Colors.green.withOpacity(0.1);
                    } else if (status == 'failed') {
                      statusColor = Colors.red;
                      statusText = AppLang.tr('Thất bại', 'Failed');
                      icon = Icons.error_outline;
                      iconBg = Colors.red.withOpacity(0.1);
                    } else {
                      statusColor = Colors.orange;
                      statusText = AppLang.tr('Chờ xử lý', 'Pending');
                      icon = Icons.pending_actions;
                      iconBg = Colors.orange.withOpacity(0.1);
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.cardBg,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: AppTheme.dividerColor,
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.shadowColor,
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Theme(
                          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                          child: ExpansionTile(
                            tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            leading: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: iconBg,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(icon, color: statusColor, size: 22),
                            ),
                            title: Text(
                              package,
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Row(
                                children: [
                                  Text(
                                    date,
                                    style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: iconBg,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Text(
                                      statusText,
                                      style: TextStyle(
                                        color: statusColor,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '+$credits ${AppLang.tr('lượt', 'credits')}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: status == 'completed' ? Colors.green : AppTheme.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _fmtVnd(amountVnd),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                            children: [
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
                                color: AppTheme.isDark ? Colors.white.withOpacity(0.02) : Colors.black.withOpacity(0.01),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Divider(height: 1, color: AppTheme.dividerColor),
                                    const SizedBox(height: 12),
                                    _buildDetailRow(AppLang.tr('Mã giao dịch', 'Transaction ID'), '#${tx['id'] ?? 'N/A'}'),
                                    const SizedBox(height: 6),
                                    _buildDetailRow(AppLang.tr('Phương thức', 'Payment Method'), AppLang.tr('Chuyển khoản VietQR', 'VietQR Bank Transfer')),
                                    const SizedBox(height: 6),
                                    _buildDetailRow(AppLang.tr('Số lượt nhận', 'Credits Received'), '$credits ${AppLang.tr('lượt', 'credits')}'),
                                    const SizedBox(height: 6),
                                    _buildDetailRow(AppLang.tr('Số tiền thanh toán', 'Payment Amount'), _fmtVnd(amountVnd), isValueBold: true),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isValueBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isValueBold ? FontWeight.bold : FontWeight.normal,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }
}
