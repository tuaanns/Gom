import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:gom_app/api_config.dart';
import 'package:gom_app/app_theme.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/main.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({Key? key}) : super(key: key);

  @override
  State<HistoryScreen> createState() => HistoryScreenState();
}

class HistoryScreenState extends State<HistoryScreen> {
  List<dynamic> history = [];
  bool isLoading = true;
  String searchQuery = '';

  List<dynamic> get filteredHistory {
    if (searchQuery.trim().isEmpty) return history;
    final query = searchQuery.toLowerCase();
    return history.where((item) {
      final text = '${item['predicted_label']} ${item['country']} ${item['era']}'.toLowerCase();
      return text.contains(query);
    }).toList();
  }

  @override
  void initState() {
    super.initState();
    fetchHistory();
  }

  Future<void> fetchHistory() async {
    if (mounted) setState(() => isLoading = true);
    try {
      final res = await http.get(
        ApiConfig.uri('/api/history'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() => history = body['data'] ?? []);
      }
    } catch (_) {
      if (mounted) {
        showGomNotification(context, AppLang.tr('Không thể tải lịch sử', 'Cannot load history'), type: GomNotificationType.error);
      }
    } finally {
      if (mounted) setState(() => isLoading = false);
    }
  }

  String _formatDate(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    try {
      final d = DateTime.parse(raw);
      return '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')} ${d.day}/${d.month}/${d.year}';
    } catch (_) {
      return raw;
    }
  }

  String _imageUrl(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    return ApiConfig.absoluteUrl(raw);
  }

  Future<void> _openDetail(Map<String, dynamic> item) async {
    showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
    try {
      final res = await http.get(
        ApiConfig.uri('/api/history/${item['id']}'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (!mounted) return;
      Navigator.pop(context);
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        final detail = body['data'] is Map<String, dynamic> ? body['data'] as Map<String, dynamic> : item;
        Navigator.push(context, MaterialPageRoute(builder: (_) => HistoryDetailScreen(data: detail, imageUrl: _imageUrl(detail['image_url']?.toString()))));
      } else {
        showGomNotification(context, AppLang.tr('Không thể lấy chi tiết', 'Cannot load detail'), type: GomNotificationType.error);
      }
    } catch (_) {
      if (!mounted) return;
      Navigator.pop(context);
      showGomNotification(context, AppLang.tr('Lỗi kết nối', 'Connection error'), type: GomNotificationType.error);
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
        title: Image.asset('assets/logo.png', height: 32),
      ),
      body: RefreshIndicator(
        onRefresh: fetchHistory,
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(AppLang.tr('Lịch sử giám định', 'Appraisal Log'), style: TextStyle(fontFamily: 'Serif', fontSize: 30, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                    const SizedBox(height: 8),
                    Text(AppLang.tr('Xem lại các hiện vật đã phân tích.', 'Review artifacts analyzed by AI.'), style: TextStyle(fontSize: 14, color: AppTheme.textMuted, height: 1.5)),
                    const SizedBox(height: 20),
                    TextField(
                      onChanged: (value) => setState(() => searchQuery = value),
                      style: TextStyle(color: AppTheme.textPrimary),
                      decoration: InputDecoration(
                        hintText: AppLang.tr('Tìm kiếm...', 'Search...'),
                        prefixIcon: Icon(Icons.search, color: AppTheme.textMuted),
                        filled: true,
                        fillColor: AppTheme.cardBg,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppTheme.dividerColor)),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: AppTheme.dividerColor)),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
            if (isLoading)
              SliverFillRemaining(child: Center(child: CircularProgressIndicator(color: AppTheme.navyButton)))
            else if (filteredHistory.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Text(AppLang.tr('Chưa có lịch sử giám định', 'No appraisal history yet'), style: TextStyle(color: AppTheme.textMuted)),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) => _buildHistoryCard(filteredHistory[i] as Map<String, dynamic>? ?? {}),
                    childCount: filteredHistory.length,
                  ),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryCard(Map<String, dynamic> item) {
    final prediction = item['predicted_label']?.toString() ?? item['final_prediction']?.toString() ?? AppLang.tr('Chưa xác định', 'Undetermined');
    final country = item['country']?.toString() ?? '';
    final era = item['era']?.toString() ?? '';
    final date = _formatDate(item['created_at']?.toString());
    final imgUrl = _imageUrl(item['image_url']?.toString());

    return GestureDetector(
      onTap: () => _openDetail(item),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppTheme.dividerColor),
          boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 12, offset: const Offset(0, 5))],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: imgUrl.isNotEmpty
                  ? Image.network(imgUrl, width: 76, height: 76, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _placeholder())
                  : _placeholder(),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TranslateText(prediction, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.textPrimary)),
                  const SizedBox(height: 6),
                  TranslateText([country, era].where((v) => v.isNotEmpty).join(' - '), maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                  const SizedBox(height: 8),
                  Text(date, style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                ],
              ),
            ),
            Icon(Icons.chevron_right, color: AppTheme.textMuted),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 76,
      height: 76,
      color: AppTheme.inputBg,
      child: Icon(Icons.image_outlined, color: AppTheme.textMuted),
    );
  }
}

class HistoryDetailScreen extends StatefulWidget {
  final Map<String, dynamic> data;
  final String imageUrl;

  const HistoryDetailScreen({Key? key, required this.data, required this.imageUrl}) : super(key: key);

  @override
  State<HistoryDetailScreen> createState() => _HistoryDetailScreenState();
}

class _HistoryDetailScreenState extends State<HistoryDetailScreen> {
  // Track expand/collapse state for each agent card (matching web's isExpanded)
  final Map<int, bool> _expandedAgents = {};

  Map<String, dynamic> get data => widget.data;
  String get imageUrl => widget.imageUrl;

  Map<String, dynamic> get _resultJson {
    final r = data['result'] ?? data['result_json'];
    if (r is Map<String, dynamic>) return r;
    if (r is Map) return Map<String, dynamic>.from(r);
    return {};
  }

  Map<String, dynamic> get _finalReport {
    final r = _resultJson['final_report'];
    if (r is Map<String, dynamic>) return r;
    if (r is Map) return Map<String, dynamic>.from(r);
    return {};
  }

  List<dynamic> get _agents => _resultJson['agents'] as List? ?? _resultJson['agent_predictions'] as List? ?? [];

  List<dynamic> get _lensSources =>
      (data['lens_results'] as List?) ??
      (_resultJson['lens_results'] as List?) ??
      [];


  int? _getConfidencePercent(dynamic value) {
    if (value == null) return null;
    if (value is num) {
      return value <= 1 ? (value * 100).round() : value.round();
    }
    final parsed = double.tryParse(value.toString());
    if (parsed == null) return null;
    return parsed <= 1 ? (parsed * 100).round() : parsed.round();
  }

  String _getAgentPrediction(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is String) return pred;
    if (pred is Map) return pred['ceramic_line']?.toString() ?? pred.values.first?.toString() ?? '';
    return agent['ceramic_line']?.toString() ?? agent['label']?.toString() ?? agent['verdict']?.toString() ?? '';
  }

  String _getAgentCountry(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['country'] != null) return pred['country'].toString();
    return agent['country']?.toString() ?? '';
  }
  String _getAgentEra(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['era'] != null) return pred['era'].toString();
    return agent['era']?.toString() ?? '';
  }

  @override
  Widget build(BuildContext context) {
    final prediction = data['predicted_label']?.toString() ??
        _finalReport['final_prediction']?.toString() ??
        data['final_prediction']?.toString() ??
        AppLang.tr('Chưa xác định', 'Undetermined');
    final country = data['country']?.toString() ?? _finalReport['final_country']?.toString() ?? '';
    final era = data['era']?.toString() ?? _finalReport['final_era']?.toString() ?? '';
    final confidence = data['confidence'] ?? data['certainty'] ?? _finalReport['certainty'];
    final reasoning = _finalReport['reasoning']?.toString() ?? _finalReport['final_reasoning']?.toString() ?? '';
    final verdict = _finalReport['verdict']?.toString() ?? '';
    final createdAt = data['created_at']?.toString() ?? '';
    final predictionId = data['id']?.toString() ?? '';

    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      appBar: AppBar(
        backgroundColor: AppTheme.scaffoldBg,
        elevation: 0,
        iconTheme: IconThemeData(color: AppTheme.textPrimary),
        title: Text(AppLang.tr('Chi tiết giám định', 'Appraisal Detail'), style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- Image ---
            if (imageUrl.isNotEmpty)
              Container(
                height: 240,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.network(
                    imageUrl,
                    width: double.infinity,
                    height: 240,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 240,
                      width: double.infinity,
                      decoration: BoxDecoration(color: AppTheme.inputBg, borderRadius: BorderRadius.circular(20)),
                      child: Icon(Icons.image_outlined, size: 48, color: AppTheme.textMuted),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 20),

            // --- Final Verdict Card ---
            _buildFinalVerdictCard(prediction, country, era, confidence, reasoning, verdict),
            const SizedBox(height: 16),

            // --- Date & Confidence Bar Row ---
            _buildInfoCards(createdAt, predictionId, confidence),
            const SizedBox(height: 20),

            // --- Agent Predictions ---
            if (_agents.isNotEmpty) _buildAgentPredictions(context),

            // --- Lens Sources ---
            if (_lensSources.isNotEmpty) _buildLensSources(context),
          ],
        ),
      ),
    );
  }

  // ===== DATE & CONFIDENCE INFO CARDS =====
  Widget _buildInfoCards(String createdAt, String predictionId, dynamic confidence) {
    String formattedDate = '';
    if (createdAt.isNotEmpty) {
      try {
        final d = DateTime.parse(createdAt);
        formattedDate = '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')} ${d.day}/${d.month}/${d.year}';
      } catch (_) {
        formattedDate = createdAt;
      }
    }

    double confValue = 0;
    if (confidence is num) {
      confValue = confidence <= 1 ? confidence * 100 : confidence.toDouble();
    } else if (confidence != null) {
      confValue = double.tryParse(confidence.toString()) ?? 0;
      if (confValue <= 1) confValue *= 100;
    }

    Color confColor = confValue >= 80
        ? Colors.green
        : confValue >= 60
            ? Colors.orange
            : Colors.red;

    return Row(
      children: [
        // Date Card
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.dividerColor),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.calendar_today, size: 14, color: AppTheme.textMuted),
                const SizedBox(width: 6),
                Text(AppLang.tr('Ngày', 'Date'), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 0.5)),
              ]),
              const SizedBox(height: 6),
              Text(formattedDate.isNotEmpty ? formattedDate : '—', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
              if (predictionId.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text('ID: #$predictionId', style: TextStyle(fontSize: 10, color: AppTheme.textMuted)),
              ],
            ]),
          ),
        ),
        const SizedBox(width: 12),
        // Confidence Card with Progress Bar
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.dividerColor),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.trending_up, size: 14, color: AppTheme.textMuted),
                  const SizedBox(width: 6),
                  Text(AppLang.tr('Độ tin cậy', 'Confidence'), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 0.5)),
                ]),
                Text('${confValue.toStringAsFixed(0)}%', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: confColor)),
              ]),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: LinearProgressIndicator(
                  value: confValue / 100,
                  minHeight: 8,
                  backgroundColor: AppTheme.dividerColor,
                  valueColor: AlwaysStoppedAnimation<Color>(confColor),
                ),
              ),
            ]),
          ),
        ),
      ],
    );
  }

  // ===== FINAL VERDICT CARD =====
  Widget _buildFinalVerdictCard(String prediction, String country, String era, dynamic confidence, String reasoning, String verdict) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          colors: AppTheme.isDark
              ? [AppTheme.cardBg, AppTheme.navyButton.withOpacity(0.2)]
              : [Colors.white, Colors.blue.shade50.withOpacity(0.5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 20, offset: const Offset(0, 8))],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(
            AppLang.tr('🏆 KẾT LUẬN CUỐI CÙNG', '🏆 FINAL CONCLUSION'),
            style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.isDark ? Colors.blue.shade300 : const Color(0xFF1A237E), fontSize: 13),
          ),
        ]),
        Divider(height: 30, color: AppTheme.dividerColor),

        // Prediction title
        Text(AppLang.tr('Tên hiện vật:', 'Artifact Name:'), style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textPrimary.withOpacity(0.5), letterSpacing: 0.5)),
        const SizedBox(height: 4),
        TranslateText(prediction, style: TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.textPrimary)),
        const SizedBox(height: 16),

        // Country & Era
        if (country.isNotEmpty || era.isNotEmpty)
          Wrap(spacing: 12, runSpacing: 6, children: [
            if (country.isNotEmpty)
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text(AppLang.tr('Quốc gia: ', 'Country: '), style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary)),
                TranslateText(country, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
              ]),
            if (era.isNotEmpty)
              Row(mainAxisSize: MainAxisSize.min, children: [
                Text(AppLang.tr('Niên đại: ', 'Era: '), style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textPrimary)),
                TranslateText(era, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: AppTheme.textSecondary)),
              ]),
          ]),

        // Reasoning
        if (reasoning.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(AppLang.tr('Lập luận tóm tắt:', 'Summary reasoning:'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textMuted)),
          const SizedBox(height: 8),
          TranslateText(reasoning, style: TextStyle(fontSize: 14, height: 1.6, color: AppTheme.textSecondary)),
        ],

        // Verdict (for Lens mode)
        if (verdict.isNotEmpty && reasoning.isEmpty) ...[
          const SizedBox(height: 20),
          Text(AppLang.tr('Thông tin chi tiết:', 'Detailed Information:'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textMuted)),
          const SizedBox(height: 8),
          TranslateText(verdict, style: TextStyle(fontSize: 14, height: 1.6, color: AppTheme.textSecondary)),
        ],
      ]),
    );
  }

  // ===== AGENT PREDICTIONS (Synced with Web AgentCard) =====
  Widget _buildAgentPredictions(BuildContext context) {
    final agents = _agents;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Section header matching web: icon + title + count
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(children: [
          Icon(Icons.auto_awesome, size: 16, color: AppTheme.isDark ? const Color(0xFFD4A574) : const Color(0xFF8B6914)),
          const SizedBox(width: 8),
          Text(
            '${AppLang.tr('GÓC NHÌN CHUYÊN GIA', 'SPECIALIST PERSPECTIVES')} (${agents.length})',
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppTheme.textPrimary, letterSpacing: 0.5),
          ),
        ]),
      ),
      Column(
        children: List.generate(agents.length, (i) {
          final agent = agents[i] is Map<String, dynamic> ? agents[i] as Map<String, dynamic> : <String, dynamic>{};
          return _buildAgentCard(agent, i);
        }),
      ),
      const SizedBox(height: 20),
    ]);
  }

  /// Individual Agent Card — matches web's AgentCard component exactly:
  /// 1. Agent name (left) + Confidence badge (right)
  /// 2. Prediction label (ceramic_line)
  /// 3. Country & Era as separate chip badges
  /// 4. Evidence/reasoning with expand/collapse
  Widget _buildAgentCard(Map<String, dynamic> agent, int index) {
    final colors = [Colors.indigo, Colors.teal, Colors.deepPurple, Colors.orange];
    final color = colors[index % colors.length];
    final name = agent['agent_name']?.toString() ?? 'Agent ${index + 1}';
    final predName = _getAgentPrediction(agent);
    final country = _getAgentCountry(agent);
    final era = _getAgentEra(agent);
    final evidence = agent['evidence']?.toString() ?? agent['reasoning']?.toString() ?? '';
    final confPercent = _getConfidencePercent(agent['confidence'] ?? agent['certainty']);
    final isExpanded = _expandedAgents[index] ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.dividerColor, width: 2),
        gradient: LinearGradient(
          colors: AppTheme.isDark
              ? [AppTheme.cardBg, AppTheme.cardBg.withOpacity(0.8)]
              : [Colors.white, Colors.grey.shade50],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 8, offset: const Offset(0, 3))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Agent name (left) + Confidence badge (right) — matching web
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.isDark ? const Color(0xFFD4A574) : color,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (confPercent != null) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD4A574).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '$confPercent%',
                      style: TextStyle(
                        color: AppTheme.isDark ? const Color(0xFFD4A574) : const Color(0xFF8B6914),
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),

            // Row 2: Prediction label — matching web's bold label
            TranslateText(
              predName.isNotEmpty ? predName : AppLang.tr('Chưa xác định', 'Undetermined'),
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 8),

            // Row 3: Country & Era as separate chip badges — matching web exactly
            if (country.isNotEmpty || era.isNotEmpty)
              Wrap(spacing: 6, runSpacing: 6, children: [
                if (country.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD4A574).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: TranslateText(
                      country,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.isDark ? const Color(0xFFD4A574) : const Color(0xFF8B6914),
                      ),
                    ),
                  ),
                if (era.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (AppTheme.isDark ? Colors.white : const Color(0xFF1A237E)).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: TranslateText(
                      era,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.isDark ? Colors.white70 : const Color(0xFF1A237E),
                      ),
                    ),
                  ),
              ]),

            // Row 4: Evidence/reasoning with expand/collapse — matching web's isExpanded logic
            if (evidence.isNotEmpty) ...[
              const SizedBox(height: 10),
              TranslateText(
                evidence,
                style: TextStyle(fontSize: 12, height: 1.5, color: AppTheme.textMuted),
                maxLines: isExpanded ? null : 3,
                overflow: isExpanded ? null : TextOverflow.ellipsis,
              ),
              // Show "Xem thêm" / "Thu gọn" button if evidence is long (> 150 chars, matching web)
              if (evidence.length > 150)
                GestureDetector(
                  onTap: () => setState(() => _expandedAgents[index] = !isExpanded),
                  child: Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      isExpanded ? AppLang.tr('Thu gọn', 'Show less') : AppLang.tr('Xem thêm', 'Show more'),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.isDark ? const Color(0xFFD4A574) : const Color(0xFF8B6914),
                      ),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  // ===== LENS SOURCES =====
  Widget _buildLensSources(BuildContext context) {
    final sources = _lensSources;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 20, offset: const Offset(0, 4))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(Icons.search, size: 16, color: AppTheme.textPrimary.withOpacity(0.7)),
          const SizedBox(width: 8),
          Text(
            AppLang.tr('Nguồn tham khảo (${sources.length})', 'Reference Sources (${sources.length})'),
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
          ),
        ]),
        const SizedBox(height: 12),
        ...sources.asMap().entries.map((entry) {
          final item = entry.value;
          if (item is! Map) return const SizedBox.shrink();
          final title = item['title']?.toString().split('\n').first ?? 'Source ${entry.key + 1}';
          final url = item['link']?.toString() ?? item['url']?.toString() ?? '';
          String hostname = url;
          try {
            hostname = Uri.parse(url).host;
          } catch (_) {}

          return GestureDetector(
            onTap: url.isNotEmpty ? () async {
              try {
                String targetUrl = url.trim();
                if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
                  targetUrl = 'https://$targetUrl';
                }
                await launchUrl(Uri.parse(targetUrl), mode: LaunchMode.externalApplication);
              } catch (_) {}
            } : null,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.inputBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.dividerColor),
              ),
              child: Row(children: [
                Container(
                  width: 28, height: 28,
                  decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.15), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.open_in_new, size: 14, color: Color(0xFF059669)),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(hostname, style: TextStyle(fontSize: 10, color: AppTheme.textMuted), maxLines: 1, overflow: TextOverflow.ellipsis),
                  ]),
                ),
                const SizedBox(width: 8),
                Icon(Icons.chevron_right, size: 16, color: Colors.grey.shade400),
              ]),
            ),
          );
        }).toList(),
      ]),
    );
  }
}
