import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:gom_app/api_config.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:gom_app/main.dart';
import 'package:gom_app/auth_state.dart';
import 'package:gom_app/payment_screen.dart';
import 'package:gom_app/app_theme.dart';

Map<String, dynamic> _asMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return {};
}

Map<String, dynamic> _apiData(dynamic decoded) {
  final body = _asMap(decoded);
  final nested = _asMap(body['data']);
  return nested.isNotEmpty ? nested : body;
}

int _readInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

double _readDouble(dynamic value, double fallback) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

class DebateScreen extends StatefulWidget {
  const DebateScreen({Key? key}) : super(key: key);
  @override
  State<DebateScreen> createState() => DebateScreenState();
}

class DebateScreenState extends State<DebateScreen> {
  static String get _baseUrl => ApiConfig.baseUrl;
  final ImagePicker _picker = ImagePicker();

  Map<String, dynamic>? debateData;
  String? lastPredictionId;
  String? lastCreatedAt;
  bool isAnalyzing = false;
  Uint8List? _previewBytes;
  int freeUsed = 0;
  int freeLimit = 5;
  double tokenBalance = 0;
  List<dynamic> _ceramicLines = [];
  bool _loadingCeramics = true;

  @override
  void initState() {
    super.initState();
    loadQuota();
    _loadCeramicLines();
  }

  Future<void> _loadCeramicLines() async {
    try {
      final res = await http.get(Uri.parse('$_baseUrl/api/ceramic-lines?featured=1'));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (mounted) setState(() {
          _ceramicLines = body['data'] ?? [];
          _loadingCeramics = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingCeramics = false);
    }
  }

  Future<void> loadQuota() async {
    try {
      final res = await http.get(
        Uri.parse('$_baseUrl/api/payment/status'),
        headers: {'Authorization': 'Bearer ${AuthState.token}'},
      );
      if (res.statusCode == 200) {
        final data = _apiData(jsonDecode(res.body));
        if (mounted) setState(() {
          freeUsed = _readInt(data['free_used'] ?? data['free_predictions_used'], freeUsed);
          freeLimit = _readInt(data['free_limit'], freeLimit);
          tokenBalance = _readDouble(data['token_balance'], tokenBalance);
        });
      }
    } catch (_) {}
  }

  void _showImageSourceDialog({bool isLens = false}) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      backgroundColor: AppTheme.cardBg,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(isLens ? AppLang.tr('Chọn ảnh cho Google Lens', 'Select photo for Google Lens') : AppLang.tr('Chọn ảnh cho AI', 'Select photo for AI'), style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.camera_alt, color: Colors.blue),
              title: Text(AppLang.tr('Chụp ảnh từ Camera', 'Take a photo from Camera'), style: TextStyle(color: AppTheme.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndAnalyze(ImageSource.camera, isLens: isLens);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: Colors.purple),
              title: Text(AppLang.tr('Chọn ảnh từ Thư viện', 'Select photo from Gallery'), style: TextStyle(color: AppTheme.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _pickAndAnalyze(ImageSource.gallery, isLens: isLens);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickAndAnalyze(ImageSource source, {bool isLens = false}) async {
    if (freeUsed >= freeLimit && tokenBalance <= 0) {
      final shouldNavigate = await PaymentGate.checkAndShowGate(context, freeUsed: freeUsed, freeLimit: freeLimit, tokenBalance: tokenBalance);
      if (!shouldNavigate) return;
    }

    final XFile? image = await _picker.pickImage(source: source, maxWidth: 1920, maxHeight: 1920, imageQuality: 85);
    if (image == null) return;

    final bytes = await image.readAsBytes();
    setState(() { _previewBytes = bytes; isAnalyzing = true; debateData = null; });

    try {
      final endpoint = isLens ? '/api/predict/lens' : '/api/ai/debate';
      final request = http.MultipartRequest('POST', Uri.parse('$_baseUrl$endpoint'));
      request.headers['Authorization'] = 'Bearer ${AuthState.token}';
      request.fields['lang'] = AppLang.current;
      request.files.add(http.MultipartFile.fromBytes('image', bytes, filename: image.name, contentType: MediaType.parse('image/jpeg')));

      final streamedRes = await request.send();
      final response = await http.Response.fromStream(streamedRes);

      if (!mounted) return;

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        Map<String, dynamic> data = body['data'] as Map<String, dynamic>? ?? {};

        final quotaInfo = data['quota'] as Map<String, dynamic>?;
        if (quotaInfo != null) {
          setState(() {
            freeUsed = _readInt(quotaInfo['free_used'] ?? quotaInfo['free_predictions_used'], freeUsed);
            freeLimit = _readInt(quotaInfo['free_limit'], freeLimit);
            tokenBalance = _readDouble(quotaInfo['token_balance'], tokenBalance);
          });
        }

        final dbId = data['db_id']?.toString() ?? '';
        final now = DateTime.now().toIso8601String();

        if (isLens) {
          final lensData = data['data'] as Map<String, dynamic>? ?? {};
          lensData['isLensMode'] = true;
          setState(() {
            debateData = lensData;
            lastPredictionId = dbId;
            lastCreatedAt = now;
          });
        } else {
          final aiData = data['data'] as Map<String, dynamic>? ?? {};
          setState(() {
            debateData = aiData;
            lastPredictionId = dbId;
            lastCreatedAt = now;
          });
        }
        
        // Cập nhật lại lịch sử đồng thời ngầm bên dưới
        MainGate.currentInstance?.refreshHistoryTab();
        
        showGomNotification(context, AppLang.tr('Giám định hoàn tất!', 'Appraisal complete!'), type: GomNotificationType.success);
      } else if (response.statusCode == 402) {
        final body = jsonDecode(response.body);
        final quotaInfo = _asMap(_asMap(body)['errors']).isNotEmpty
            ? _asMap(_asMap(body)['errors'])
            : _apiData(body);
        setState(() {
          freeUsed = _readInt(quotaInfo['free_used'] ?? quotaInfo['free_predictions_used'], freeUsed);
          freeLimit = _readInt(quotaInfo['free_limit'], freeLimit);
          tokenBalance = _readDouble(quotaInfo['token_balance'], tokenBalance);
        });
        if (mounted) {
          PaymentGate.checkAndShowGate(context, freeUsed: freeUsed, freeLimit: freeLimit, tokenBalance: tokenBalance);
        }
      } else {
        final errMsg = parseErrorMessage(response.body, response.statusCode);
        showGomNotification(context, errMsg, type: GomNotificationType.error);
      }
    } catch (e) {
      if (!mounted) return;
      showGomNotification(context, AppLang.tr('Mất liên lạc với hội đồng giám định', 'Lost connection to the appraisal board'), type: GomNotificationType.error);
    } finally {
      if (mounted) setState(() => isAnalyzing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBg,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // --- Custom Top Bar ---
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                child: Center(
                  child: Image.asset('assets/logo.png', height: 100),
                ),
              ),

              // --- Hero Text ---
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    Text(
                      AppLang.tr('Nhận dạng\ndòng gốm sứ', 'Identify\nceramic lines'),
                      style: TextStyle(
                        fontFamily: 'Serif',
                        fontSize: 34,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.textPrimary,
                        height: 1.2,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),

              // --- Upload Card ---
              if (debateData == null && !isAnalyzing) _buildUploadCard(),

              // --- Dòng Gốm Trứ Danh ---
              if (debateData == null && !isAnalyzing) _buildCeramicLinesSection(),

              // --- Preview & Results ---
              if (_previewBytes != null) _buildImagePreview(),
              if (isAnalyzing) _buildLoading(),
              if (debateData != null) ...[
                _buildFinalResultCard(),
                _buildInfoCards(
                  lastCreatedAt ?? '',
                  lastPredictionId ?? '',
                  debateData?['isLensMode'] == true
                      ? (debateData?['certainty'] ?? debateData?['confidence'] ?? 0.0)
                      : (debateData?['final_report']?['certainty'] ?? debateData?['final_report']?['confidence'] ?? 0.0)
                ),
                _buildLensSourcesSection(),
                _buildSpecialistSection(),
                _buildDebateLogSection(),

                // --- Nút Nhận Dạng Tiếp ---
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            setState(() {
                              debateData = null;
                              _previewBytes = null;
                            });
                          },
                          icon: Icon(Icons.arrow_back, color: AppTheme.navyButton, size: 18),
                          label: Text(
                            AppLang.tr('TRỞ VỀ', 'BACK TO HOME'),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: BorderSide(color: AppTheme.navyButton, width: 1.5),
                            foregroundColor: AppTheme.navyButton,
                            minimumSize: const Size(0, 52),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            _showImageSourceDialog();
                          },
                          icon: const Icon(Icons.add_a_photo, color: Colors.white, size: 18),
                          label: Text(
                            AppLang.tr('NHẬN DẠNG TIẾP', 'IDENTIFY NEXT'),
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.navyButton,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(0, 52),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLoading() => Padding(
    padding: const EdgeInsets.all(40.0),
    child: Center(
      child: Column(children: [
        CircularProgressIndicator(color: AppTheme.navyButton),
        const SizedBox(height: 20),
        Text(AppLang.tr('Các chuyên gia đang tranh biện... (~20s)', 'Experts are debating... (~20s)'), style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
      ]),
    ),
  );

  Widget _buildUploadCard() => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 24),
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      decoration: BoxDecoration(
        color: AppTheme.cardBg,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppTheme.shadowColor, blurRadius: 20, offset: const Offset(0, 8)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Camera icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.navyButton,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.camera_alt, color: Colors.white, size: 30),
          ),
          const SizedBox(height: 20),
          Text(
            AppLang.tr('Tải ảnh lên để định danh', 'Upload image to identify'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: AppTheme.textPrimary,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            AppLang.tr(
              'Chụp ảnh hoặc tải lên hình ảnh hiện vật\nđể hệ thống AI phân tích niên đại\nvà dòng gốm.',
              'Take a photo or upload an image\nfor the AI to analyze its era\nand ceramic line.'
            ),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.textMuted,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 24),

          // Quota info
          Container(
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: freeUsed < freeLimit || tokenBalance > 0
                  ? AppTheme.menuBg
                  : (AppTheme.isDark ? const Color(0xFF361E1E) : Colors.red.shade50),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              freeUsed < freeLimit
                ? AppLang.tr('Lượt miễn phí: ${freeLimit - freeUsed}/$freeLimit còn lại', 'Free limits: ${freeLimit - freeUsed}/$freeLimit left')
                : tokenBalance > 0
                  ? AppLang.tr('Số dư: ${tokenBalance.toStringAsFixed(0)} lượt', 'Balance: ${tokenBalance.toStringAsFixed(0)} tokens')
                  : AppLang.tr('Đã hết lượt! Nạp thêm để tiếp tục.', 'Out of tokens! Top up to continue.'),
              style: TextStyle(
                color: freeUsed < freeLimit || tokenBalance > 0
                    ? AppTheme.textPrimary
                    : Colors.redAccent,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          // CTA Buttons
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isAnalyzing ? null : () => _showImageSourceDialog(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.navyButton,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: Text(
                      AppLang.tr('NHẬN DẠNG AI', 'AI PREDICT'),
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _buildCeramicLinesSection() => Padding(
    padding: const EdgeInsets.only(top: 32),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                AppLang.tr('Dòng Gốm Trứ Danh', 'Famous Ceramic Lines'),
                style: TextStyle(
                  fontFamily: 'Serif',
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: AppTheme.textPrimary,
                ),
              ),
              GestureDetector(
                onTap: () {
                  MainGate.currentInstance?.switchTab(1);
                },
                child: Row(
                  children: [
                    Text(
                      AppLang.tr('XEM TẤT CẢ', 'VIEW ALL'),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.textSecondary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios, size: 12, color: AppTheme.textSecondary),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Cards
        if (_loadingCeramics)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator(color: AppTheme.navyButton, strokeWidth: 2)),
          )
        else if (_ceramicLines.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Center(child: Text(AppLang.tr('Chưa có dữ liệu dòng gốm', 'No ceramic line data yet'), style: TextStyle(color: AppTheme.textMuted))),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: _ceramicLines.take(2).toList().asMap().entries.map((entry) {
                final i = entry.key;
                final c = entry.value;
                final imgUrl = c['image_url'] as String?;
                final name = c['name'] ?? '';
                final era = c['era'] ?? '';
                final desc = c['description'] ?? '';
                final style = c['style'] as String?;
                final tags = style != null ? style.split(',').map((s) => s.trim()).take(2).toList() : <String>[];
                final isEven = i % 2 == 0;

                final imageWidget = ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: imgUrl != null && imgUrl.isNotEmpty
                    ? Image.network(imgUrl, width: 120, height: 110, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          width: 120, height: 110,
                          decoration: BoxDecoration(color: AppTheme.menuBg, borderRadius: BorderRadius.circular(14)),
                          child: const Icon(Icons.image_outlined, color: Colors.grey, size: 36),
                        ),
                      )
                    : Container(
                        width: 120, height: 110,
                        decoration: BoxDecoration(color: AppTheme.menuBg, borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.image_outlined, color: Colors.grey, size: 36),
                      ),
                );

                final textWidget = Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      TranslateText(era.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 0.8)),
                      const SizedBox(height: 4),
                      TranslateText(name, style: TextStyle(fontFamily: 'Serif', fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                      const SizedBox(height: 6),
                      TranslateText(desc, style: TextStyle(fontSize: 11, color: AppTheme.textSecondary, height: 1.4), maxLines: 3, overflow: TextOverflow.ellipsis),
                      if (tags.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6, runSpacing: 4,
                          children: tags.map((t) => Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              border: Border.all(color: AppTheme.textPrimary.withOpacity(0.3)),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: TranslateText(t, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
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
                      backgroundColor: AppTheme.cardBg,
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
                      builder: (ctx) => _buildCeramicDetailSheet(c),
                    );
                  },
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.cardBg,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(color: AppTheme.shadowColor, blurRadius: 12, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: isEven
                      ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [textWidget, const SizedBox(width: 12), imageWidget])
                      : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [imageWidget, const SizedBox(width: 12), textWidget]),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    ),
  );

  Widget _buildCeramicDetailSheet(dynamic c) => DraggableScrollableSheet(
    initialChildSize: 0.6,
    maxChildSize: 0.85,
    minChildSize: 0.4,
    expand: false,
    builder: (context, scrollController) => SingleChildScrollView(
      controller: scrollController,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppTheme.dividerColor, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 24),
            if (c['image_url'] != null && c['image_url'].toString().isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  c['image_url'].toString().startsWith('http') ? c['image_url'] : ApiConfig.absoluteUrl(c['image_url'].toString()),
                  width: double.infinity,
                  height: 220,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
              const SizedBox(height: 20),
            ],
            TranslateText(
              c['name'] ?? '',
              style: TextStyle(fontFamily: 'Serif', fontSize: 26, fontWeight: FontWeight.w900, color: AppTheme.textPrimary),
            ),
            const SizedBox(height: 6),
            TranslateText(
              '${c['origin'] ?? ''}, ${c['country'] ?? ''}',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textMuted),
            ),
            if (c['era'] != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: AppTheme.navyButton.withOpacity(0.08), borderRadius: BorderRadius.circular(8)),
                child: TranslateText(c['era'], style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppTheme.textPrimary)),
              ),
            ],
            const SizedBox(height: 20),
            Divider(color: AppTheme.dividerColor),
            const SizedBox(height: 12),
            if (c['style'] != null) ...[
              Text(AppLang.tr('PHONG CÁCH', 'STYLE'), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 1)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: (c['style'] as String).split(',').map((s) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: AppTheme.inputBg, borderRadius: BorderRadius.circular(20)),
                  child: TranslateText(s.trim(), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                )).toList(),
              ),
              const SizedBox(height: 20),
            ],
            if (c['description'] != null) ...[
              Text(AppLang.tr('MÔ TẢ', 'DESCRIPTION'), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppTheme.textMuted, letterSpacing: 1)),
              const SizedBox(height: 8),
              TranslateText(
                c['description'],
                style: TextStyle(fontSize: 15, height: 1.6, color: AppTheme.textSecondary),
              ),
            ],
          ],
        ),
      ),
    ),
  );

  Widget _buildImagePreview() => Container(
    margin: const EdgeInsets.all(16),
    width: double.infinity,
    constraints: const BoxConstraints(maxHeight: 250),
    decoration: BoxDecoration(color: AppTheme.cardBg, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 10)]),
    child: ClipRRect(borderRadius: BorderRadius.circular(20), child: Image.memory(_previewBytes!, fit: BoxFit.contain)),
  );

  Widget _buildFinalResultCard() {
    final isLensMode = debateData?['isLensMode'] == true;
    final finalApp = isLensMode ? debateData! : (debateData?['final_report'] ?? {});

    String rawPrediction = finalApp['final_prediction']?.toString() ?? AppLang.tr('Chưa xác định', 'Undetermined');
    String title = rawPrediction;
    String infoText = '';

    final bool isErrorState = rawPrediction.contains('Lỗi kết nối') || rawPrediction.contains('connection error');

    if (isLensMode) {
      if (isErrorState) {
        title = AppLang.tr('Lỗi kết nối Google Lens', 'Google Lens connection error');
        infoText = AppLang.tr('Không thể kết nối đến Google Lens. Vui lòng thử lại.', 'Cannot connect to Google Lens. Please try again.');
      } else {
        // Extract title from the prediction text
        final boldMatch = RegExp(r'\*\*([^*]{3,40})\*\*').firstMatch(rawPrediction);
        final quoteMatch = RegExp(r'"([^"]{3,40})"').firstMatch(rawPrediction);
        if (boldMatch != null) {
          title = boldMatch.group(1) ?? rawPrediction;
        } else if (quoteMatch != null) {
          title = quoteMatch.group(1) ?? rawPrediction;
        } else {
          final firstSentence = rawPrediction.split(RegExp(r'[.!?\n]')).first;
          title = firstSentence.length > 40 ? '${firstSentence.substring(0, 37)}...' : firstSentence;
        }
        infoText = rawPrediction;
      }
    } else {
      title = rawPrediction;
      infoText = finalApp['reasoning']?.toString() ?? '';
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Card(
        color: AppTheme.cardBg,
        elevation: 8,
        shadowColor: AppTheme.shadowColor,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24), 
            gradient: LinearGradient(
              colors: AppTheme.isDark 
                  ? [AppTheme.cardBg, AppTheme.navyButton.withOpacity(0.2)]
                  : [Colors.white, Colors.blue.shade50.withOpacity(0.5)], 
              begin: Alignment.topLeft, 
              end: Alignment.bottomRight
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(
                AppLang.tr('🏆 KẾT LUẬN CUỐI CÙNG', '🏆 FINAL CONCLUSION'), 
                style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.isDark ? Colors.blue.shade300 : const Color(0xFF1A237E)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isErrorState ? Colors.red.shade600 : Colors.green,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  AppLang.tr('Đ?tin cậy: ', 'Confidence: ') + 
                  (isErrorState ? '0%' : _formatConfidence(finalApp['certainty'] ?? finalApp['confidence'] ?? (null))),
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ]),
            Divider(height: 30, color: AppTheme.dividerColor),
            Text(
              AppLang.tr('Tên hiện vật:', 'Artifact Name:'),
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.textPrimary.withOpacity(0.5), letterSpacing: 0.5),
            ),
            const SizedBox(height: 4),
            TranslateText(title, style: TextStyle(fontFamily: 'Serif', fontSize: 22, fontWeight: FontWeight.w900, color: AppTheme.textPrimary)),
            const SizedBox(height: 20),
            if (isLensMode) ...[
              if (infoText.isNotEmpty) ...[
                Text(
                  AppLang.tr('Thông tin chi tiết:', 'Detailed Information:'),
                  style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textMuted),
                ),
                const SizedBox(height: 8),
                TranslateText(infoText, style: TextStyle(fontSize: 14.5, height: 1.5, color: AppTheme.textSecondary)),
              ],
            ] else ...[
              Row(
                children: [
                  Text(AppLang.tr('Quốc gia: ', 'Country: '), style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  TranslateText(finalApp['final_country']?.toString() ?? 'N/A', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                  Text(AppLang.tr(' | Niên đại: ', ' | Era: '), style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textPrimary)),
                  TranslateText(finalApp['final_era']?.toString() ?? 'N/A', style: TextStyle(fontWeight: FontWeight.w600, color: AppTheme.textSecondary)),
                ],
              ),
              const SizedBox(height: 20),
              if (infoText.isNotEmpty) ...[
                Text(AppLang.tr('Lập luận tóm tắt:', 'Summary reasoning:'), style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textMuted)),
                const SizedBox(height: 8),
                TranslateText(infoText, style: TextStyle(fontSize: 14.5, height: 1.5, color: AppTheme.textSecondary)),
              ],
            ],
          ]),
        ),
      ),
    );
  }

  // DATE & CONFIDENCE INFO CARDS - Synced with Web / Detail Screen
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

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
      child: Row(
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
      ),
    );
  }

  // Helper: format confidence (float 0-1 ??percentage, int ??as-is)
  String _formatConfidence(dynamic value) {
    if (value == null) return 'N/A';
    if (value is num) {
      if (value <= 1) return '${(value * 100).toStringAsFixed(0)}%';
      return '${value.toStringAsFixed(0)}%';
    }
    return value.toString();
  }

  // Trích xuất prediction name từ agent data
  String _getAgentPrediction(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is String) return pred;
    if (pred is Map) return pred['ceramic_line']?.toString() ?? pred.values.first?.toString() ?? '';
    return agent['ceramic_line']?.toString() ?? '';
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

  String _getAgentStyle(Map<String, dynamic> agent) {
    final pred = agent['prediction'];
    if (pred is Map && pred['style'] != null) return pred['style'].toString();
    return agent['style']?.toString() ?? '';
  }

  Widget _buildSpecialistSection() {
    if (debateData?['isLensMode'] == true) return const SizedBox();
    final List<dynamic> agents = debateData?['agent_predictions'] ?? [];
    if (agents.isEmpty) return const SizedBox();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8), child: Text(AppLang.tr('GÓC NHÌN CHUYÊN GIA', 'SPECIALIST PERSPECTIVES'), style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textMuted))),
      SizedBox(
        height: 330,
        child: ListView.builder(
          scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12),
          itemCount: agents.length,
          itemBuilder: (context, i) {
            final agent = agents[i] as Map<String, dynamic>? ?? {};
            final colors = [Colors.indigo, Colors.teal, Colors.deepPurple, Colors.orange];
            final color = colors[i % colors.length];
            final predName = _getAgentPrediction(agent);
            final country = _getAgentCountry(agent);
            final era = _getAgentEra(agent);
            final style = _getAgentStyle(agent);
            
            // Lấy 75% chiều rộng màn hình cho mỗi card chuyên gia trên mobile
            double cardWidth = MediaQuery.of(context).size.width * 0.75;
            if (cardWidth > 320) cardWidth = 320;

            return Container(
              width: cardWidth,
              margin: const EdgeInsets.symmetric(horizontal: 6),
              child: Card(
                color: AppTheme.cardBg,
                shadowColor: AppTheme.shadowColor,
                elevation: 3, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Container(width: 36, height: 36, decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle), child: Icon(Icons.psychology, color: color, size: 20)),
                      const SizedBox(width: 10),
                      Expanded(child: Text(agent['agent_name']?.toString() ?? 'Agent ${i + 1}', style: TextStyle(fontWeight: FontWeight.bold, color: color), maxLines: 1, overflow: TextOverflow.ellipsis)),
                    ]),
                    const SizedBox(height: 10),
                    TranslateText(predName.isNotEmpty ? predName : AppLang.tr('Chưa xác định', 'Undetermined'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.textPrimary), maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 4),
                    if (country.isNotEmpty || era.isNotEmpty)
                      Row(
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              child: Row(
                                children: [
                                  TranslateText(country.isNotEmpty ? country : "N/A", style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                  Text(' - ', style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                  TranslateText(era.isNotEmpty ? era : "N/A", style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    if (style.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(AppLang.tr('Phong cách: ', 'Style: '), style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontStyle: FontStyle.italic)),
                          Expanded(child: TranslateText(style, style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontStyle: FontStyle.italic), maxLines: 2, overflow: TextOverflow.ellipsis)),
                        ],
                      ),
                    ],
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text(AppLang.tr('Tin cậy: ', 'Confidence: ') + _formatConfidence(agent['certainty'] ?? agent['confidence']), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ]),
                ),
              ),
            );
          },
        ),
      ),
    ]);
  }

  Widget _buildDebateLogSection() {
    if (debateData?['isLensMode'] == true) return const SizedBox();
    final List<dynamic> agents = debateData?['agent_predictions'] ?? [];
    final hasDebate = agents.any((a) => a is Map && a['debate_details'] != null);
    if (!hasDebate) return const SizedBox();

    final agentColorMap = {
      'GPT': const Color(0xFF3F51B5),
      'Grok': const Color(0xFF009688),
      'Gemini': const Color(0xFF7B1FA2),
    };
    Color _getColor(String name) => agentColorMap.entries
        .firstWhere((e) => name.toLowerCase().contains(e.key.toLowerCase()), orElse: () => const MapEntry('', Color(0xFF607D8B)))
        .value;

    final agentIcons = {
      'GPT': Icons.auto_stories,
      'Grok': Icons.biotech,
      'Gemini': Icons.public,
    };
    IconData _getIcon(String name) => agentIcons.entries
        .firstWhere((e) => name.toLowerCase().contains(e.key.toLowerCase()), orElse: () => const MapEntry('', Icons.psychology))
        .value;

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF1A237E), Color(0xFF283593)], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [BoxShadow(color: const Color(0xFF1A237E).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))],
          ),
          child: Row(children: [
            Container(
              width: 50, height: 50,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(14)),
              child: const Icon(Icons.forum_rounded, color: Colors.white, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(AppLang.tr('Phòng Tranh Luận', 'Debate Room'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white, letterSpacing: 0.5)),
              Text('${agents.where((a) => a is Map && a['debate_details'] != null).length}' + AppLang.tr(' chuyên gia AI đang trao đổi', ' AI experts debating'), style: const TextStyle(fontSize: 12, color: Colors.white70)),
            ])),
            // Avatars overlap
            SizedBox(
              width: 80, height: 36,
              child: Stack(
                children: List.generate(agents.length.clamp(0, 3), (i) {
                  final name = (agents[i] as Map?)?['agent_name']?.toString() ?? '';
                  return Positioned(
                    left: i * 22.0,
                    child: Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(name), border: Border.all(color: Colors.white, width: 2)),
                      child: Icon(_getIcon(name), color: Colors.white, size: 16),
                    ),
                  );
                }),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 20),

        // Debate timeline
        ...agents.asMap().entries.map((entry) {
          final i = entry.key;
          final agentData = entry.value;
          if (agentData is! Map) return const SizedBox();
          final agent = agentData as Map<String, dynamic>;
          final agentName = agent['agent_name']?.toString() ?? 'Agent';
          final debateDetails = agent['debate_details'];
          if (debateDetails == null || debateDetails is! Map) return const SizedBox();

          final debate = debateDetails as Map<String, dynamic>;
          final argument = debate['argument']?.toString() ?? '';
          final defense = debate['defense']?.toString() ?? '';
          final attacks = (debate['attacks'] is List) ? (debate['attacks'] as List) : [];
          final confAdj = debate['confidence_adjustment']?.toString() ?? '';
          final color = _getColor(agentName);
          final icon = _getIcon(agentName);
          final isLast = i == agents.length - 1;

          return Stack(
            children: [
              // Timeline line
              if (!isLast)
                Positioned(
                  top: 40,
                  bottom: 0,
                  left: 19, // Center of the 40x40 circle
                  child: Container(width: 2, color: color.withOpacity(0.15)),
                ),
              // The dot/icon
              Positioned(
                top: 0,
                left: 0,
                child: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [color, color.withOpacity(0.7)]),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 3))],
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
              ),
              // Card content
              Padding(
                padding: const EdgeInsets.only(left: 60),
                child: Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: AppTheme.cardBg,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: AppTheme.shadowColor, blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // Agent name header
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [color.withOpacity(0.08), color.withOpacity(0.02)]),
                        borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
                      ),
                      child: Row(children: [
                        Text(agentName, style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 15)),
                        const Spacer(),
                        if (confAdj.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 
                                  ? (AppTheme.isDark ? const Color(0xFF1E3524) : Colors.green.shade50)
                                  : (AppTheme.isDark ? const Color(0xFF3B1E1E) : Colors.red.shade50),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              Icon(
                                double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 ? Icons.trending_up : Icons.trending_down, 
                                size: 14, 
                                color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 
                                    ? (AppTheme.isDark ? Colors.green.shade300 : Colors.green) 
                                    : (AppTheme.isDark ? Colors.red.shade300 : Colors.red),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                confAdj, 
                                style: TextStyle(
                                  fontSize: 11, 
                                  fontWeight: FontWeight.bold, 
                                  color: double.tryParse(confAdj) != null && double.parse(confAdj) >= 0 
                                      ? (AppTheme.isDark ? Colors.green.shade300 : Colors.green) 
                                      : (AppTheme.isDark ? Colors.red.shade300 : Colors.red),
                                ),
                              ),
                            ]),
                          ),
                      ]),
                    ),

                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        // Argument
                        if (argument.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.lightbulb_outline, size: 16, color: color),
                            const SizedBox(width: 6),
                            Text(AppLang.tr('Lập luận chính', 'Main Argument'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
                          ]),
                          const SizedBox(height: 6),
                          TranslateText(argument, style: TextStyle(fontSize: 13, height: 1.5, color: AppTheme.textSecondary)),
                          const SizedBox(height: 14),
                        ],

                        // Attacks
                        if (attacks.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.gavel, size: 16, color: Colors.red.shade400),
                            const SizedBox(width: 6),
                            Text(AppLang.tr('Phản bác đối thủ', 'Counter-argument'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.red.shade400)),
                          ]),
                          const SizedBox(height: 6),
                          ...attacks.map((atk) => Container(
                            margin: const EdgeInsets.only(bottom: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppTheme.isDark ? const Color(0xFF3B1E1E) : Colors.red.shade50,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppTheme.isDark ? const Color(0xFF5E2B2B) : Colors.red.shade100),
                            ),
                            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Container(width: 6, height: 6, margin: const EdgeInsets.only(top: 5), decoration: BoxDecoration(color: Colors.red.shade300, shape: BoxShape.circle)),
                              const SizedBox(width: 10),
                              Expanded(child: TranslateText(atk.toString(), style: TextStyle(fontSize: 12, height: 1.4, color: AppTheme.isDark ? Colors.red.shade200 : Colors.red.shade900))),
                            ]),
                          )),
                          const SizedBox(height: 14),
                        ],

                        // Defense
                        if (defense.isNotEmpty) ...[
                          Row(children: [
                            Icon(Icons.shield_outlined, size: 16, color: Colors.green.shade600),
                            const SizedBox(width: 6),
                            Text(AppLang.tr('Bảo vệ quan điểm', 'Defense Argument'), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green.shade600)),
                          ]),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.isDark ? const Color(0xFF1E3524) : Colors.green.shade50,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppTheme.isDark ? const Color(0xFF2E5E3D) : Colors.green.shade100),
                            ),
                            child: TranslateText(defense, style: TextStyle(fontSize: 13, height: 1.5, color: AppTheme.isDark ? Colors.green.shade200 : const Color(0xFF2E7D32))),
                          ),
                        ],
                      ]),
                    ),
                  ]),
                ),
              ),
            ],
          );
        }),
      ]),
    );
  }

  Widget _buildLensSourcesSection() {
    final List<dynamic> sources = debateData?['lens_results'] ?? [];
    if (sources.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.cardBg,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppTheme.shadowColor,
              blurRadius: 20,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.search, size: 16, color: AppTheme.textPrimary.withOpacity(0.7)),
                const SizedBox(width: 8),
                Text(
                  AppLang.tr(
                    'Nguồn tham khảo (${sources.length})',
                    'Reference Sources (${sources.length})',
                  ),
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textPrimary),
                ),
              ],
            ),
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
                    await launchUrl(
                      Uri.parse(targetUrl),
                      mode: kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication,
                    );
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
                  child: Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.open_in_new, size: 14, color: Color(0xFF059669)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              hostname,
                              style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400),
                    ],
                  ),
                ),
              );
            }).toList(),
          ],
        ),
      ),
    );
  }
}
