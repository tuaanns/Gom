import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/app_theme.dart';

class CeramicLinesListScreen extends StatefulWidget {
  const CeramicLinesListScreen({Key? key}) : super(key: key);
  @override
  State<CeramicLinesListScreen> createState() => _CeramicLinesListScreenState();
}

class _CeramicLinesListScreenState extends State<CeramicLinesListScreen> {
  static String get _baseUrl => ApiConfig.baseUrl;
  List<dynamic> _allLines = [];
  List<dynamic> _filteredLines = [];
  bool _isLoading = true;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/ceramic-lines'));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() {
          _allLines = body['data'] ?? [];
          _filteredLines = _allLines;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onSearch(String query) {
    if (query.isEmpty) {
      setState(() => _filteredLines = _allLines);
      return;
    }
    final q = query.toLowerCase();
    setState(() {
      _filteredLines = _allLines.where((c) {
        return (c['name'] ?? '').toString().toLowerCase().contains(q) ||
               (c['origin'] ?? '').toString().toLowerCase().contains(q) ||
               (c['country'] ?? '').toString().toLowerCase().contains(q) ||
               (c['style'] ?? '').toString().toLowerCase().contains(q);
      }).toList();
    });
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
      body: _isLoading
        ? const Center(child: CircularProgressIndicator(color: Color(0xFF0F265C)))
        : CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppLang.tr('Các Dòng Gốm Trứ Danh', 'Famous Ceramic Lines'),
                          style: TextStyle(fontFamily: 'Serif', fontSize: 30, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          AppLang.tr('Một thư viện kỹ thuật số lưu giữ những kiệt tác gốm sứ qua các triều đại lừng lẫy.', 'A digital library preserving ceramic masterpieces across illustrious dynasties.'),
                          style: TextStyle(fontSize: 14, color: AppTheme.textMuted, height: 1.5),
                        ),
                        const SizedBox(height: 20),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: AppTheme.searchBarBg,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.search, color: Colors.grey.shade500, size: 22),
                              const SizedBox(width: 10),
                              Expanded(
                                child: TextField(
                                  controller: _searchCtrl,
                                  onChanged: _onSearch,
                                  decoration: InputDecoration(
                                    hintText: AppLang.tr('Tìm kiếm triều đại hoặc phong cách...', 'Search for dynasties or styles...'),
                                    hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                                    border: InputBorder.none,
                                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final c = _filteredLines[i];
                      final isEven = i % 2 == 0;
                      return _buildCeramicCard(c, isEven);
                    },
                    childCount: _filteredLines.length,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
    );
  }

  Widget _buildCeramicCard(dynamic c, bool imageOnRight) {
    final imgUrl = c['image_url'] as String?;
    final name = c['name'] ?? '';
    final era = c['era'] ?? '';
    final desc = c['description'] ?? '';
    final style = c['style'] as String?;
    final tags = style != null ? style.split(',').map((s) => s.trim()).take(3).toList() : <String>[];

    final imageWidget = ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: imgUrl != null && imgUrl.isNotEmpty
        ? Image.network(imgUrl, width: 130, height: 120, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              width: 130, height: 120,
              decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.image_outlined, color: Colors.grey, size: 40),
            ),
          )
        : Container(
            width: 130, height: 120,
            decoration: BoxDecoration(color: const Color(0xFFE8E4D5), borderRadius: BorderRadius.circular(14)),
            child: const Icon(Icons.image_outlined, color: Colors.grey, size: 40),
          ),
    );

    final textWidget = Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TranslateText(era.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.textPrimary, letterSpacing: 0.8)),
          const SizedBox(height: 6),
          TranslateText(name, style: TextStyle(fontFamily: 'Serif', fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
          const SizedBox(height: 8),
          TranslateText(desc, style: TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.4), maxLines: 4, overflow: TextOverflow.ellipsis),
          if (tags.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6, runSpacing: 4,
              children: tags.map((t) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF0F265C).withOpacity(0.3)),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: TranslateText(t, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
              )).toList(),
            ),
          ],
        ],
      ),
    );

    return GestureDetector(
      onTap: () {
        showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          builder: (ctx) => _buildDetailSheet(c),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 15, offset: const Offset(0, 6))],
        ),
        child: imageOnRight
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [textWidget, const SizedBox(width: 14), imageWidget])
          : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [imageWidget, const SizedBox(width: 14), textWidget]),
      ),
    );
  }

  Widget _buildDetailSheet(dynamic c) {
    final imgUrl = c['image_url'] as String?;
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.4,
      expand: false,
      builder: (context, sc) => SingleChildScrollView(
        controller: sc,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)))),
              const SizedBox(height: 24),
              if (imgUrl != null && imgUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Image.network(imgUrl, width: double.infinity, height: 200, fit: BoxFit.cover),
                ),
              if (imgUrl != null && imgUrl.isNotEmpty) const SizedBox(height: 20),
              TranslateText(c['name'] ?? '', style: TextStyle(fontFamily: 'Serif', fontSize: 26, fontWeight: FontWeight.w900, color: AppTheme.textPrimary)),
              const SizedBox(height: 6),
              TranslateText('${c['origin'] ?? ''}, ${c['country'] ?? ''}', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textMuted)),
              if (c['era'] != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: const Color(0xFF0F265C).withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                  child: TranslateText(c['era'], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
                ),
              ],
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 12),
              if (c['style'] != null) ...[
                Text(AppLang.tr('PHONG CÁCH', 'STYLE'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8, runSpacing: 6,
                  children: (c['style'] as String).split(',').map((s) => Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: AppTheme.menuBg, borderRadius: BorderRadius.circular(20)),
                    child: TranslateText(s.trim(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  )).toList(),
                ),
                const SizedBox(height: 20),
              ],
              if (c['description'] != null) ...[
                Text(AppLang.tr('MÔ TẢ', 'DESCRIPTION'), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey, letterSpacing: 1)),
                const SizedBox(height: 8),
                TranslateText(c['description'], style: TextStyle(fontSize: 15, height: 1.6, color: AppTheme.textSecondary)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
