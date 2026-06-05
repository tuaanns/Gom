import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'lang_storage.dart';

class AuthState {
  static String? token;
  static Map<String, dynamic>? user;
  static bool get isLoggedIn => token != null;

  static void clear() {
    token = null;
    user = null;
  }
}

class AppLang {
  static String current = getLocale();
  static String tr(String vi, String en) => current == 'vi' ? vi : en;

  static final Map<String, String> _dict = {
    // Packages
    'Cơ Bản': 'Basic',
    'Phổ Biến': 'Popular',
    'Chuyên Gia': 'Expert',
    'Nạp lượt': 'Top Up',

    // Names
    'Gốm Bát Tràng': 'Bat Trang Ceramics',
    'Gốm Biên Hòa': 'Bien Hoa Ceramics',
    'Gốm Phù Lãng': 'Phu Lang Ceramics',
    'Gốm Chu Đậu': 'Chu Dau Ceramics',
    'Gốm Thanh Hà': 'Thanh Ha Ceramics',
    'Gốm Bàu Trúc': 'Bau Truc Ceramics',
    'Gốm Mỹ Thiện': 'My Thien Ceramics',
    'Sứ Cảnh Đức Trấn': 'Jingdezhen Porcelain',
    'Gốm Nghi Hưng (Tử Sa)': 'Yixing Clay (Zisha)',
    'Gốm Long Tuyền (Celadon)': 'Longquan Celadon',
    'Gốm Nhữ Diêu': 'Ru Ware',
    'Gốm Đức Hóa': 'Dehua Porcelain',
    'Gốm Raku': 'Raku Ware',
    'Sứ Arita (Imari)': 'Arita Ware (Imari)',
    'Gốm Bizen': 'Bizen Ware',
    'Gốm Hagi': 'Hagi Ware',
    'Gốm Shigaraki': 'Shigaraki Ware',
    'Gốm Celadon Goryeo': 'Goryeo Celadon',
    'Sứ trắng Joseon': 'Joseon White Porcelain',
    'Gốm Sawankhalok': 'Sawankhalok Ware',
    'Gốm Bencharong': 'Bencharong',
    'Sứ Meissen': 'Meissen Porcelain',
    'Gốm Delft': 'Delftware',
    'Gốm Majolica': 'Majolica',
    'Sứ Limoges': 'Limoges Porcelain',
    'Sứ Wedgwood': 'Wedgwood Porcelain',
    'Gốm Iznik': 'Iznik Pottery',
    'Gốm Ba Tư (Kashan)': 'Persian Pottery (Kashan)',
    'Gốm Pueblo': 'Pueblo Pottery',
    'Gốm Talavera': 'Talavera Pottery',
    'Gốm Ndebele': 'Ndebele Pottery',
    'Gốm Raku Đương Đại': 'Contemporary Raku',

    // Origins
    'Hà Nội': 'Hanoi',
    'Đồng Nai': 'Dong Nai',
    'Bắc Ninh': 'Bac Ninh',
    'Hải Dương': 'Hai Duong',
    'Quảng Nam': 'Quang Nam',
    'Ninh Thuận': 'Ninh Thuan',
    'Bình Dương': 'Binh Duong',
    'Giang Tây': 'Jiangxi',
    'Giang Tô': 'Jiangsu',
    'Chiết Giang': 'Zhejiang',
    'Hà Nam': 'Henan',
    'Phúc Kiến': 'Fujian',
    'Kyoto': 'Kyoto',
    'Saga': 'Saga',
    'Okayama': 'Okayama',
    'Yamaguchi': 'Yamaguchi',
    'Shiga': 'Shiga',
    'Gangjin': 'Gangjin',
    'Gwangju': 'Gwangju',
    'Sukhothai': 'Sukhothai',
    'Bangkok': 'Bangkok',
    'Sachsen': 'Saxony',
    'Faenza, Deruta': 'Faenza, Deruta',
    'Limoges': 'Limoges',
    'Staffordshire': 'Staffordshire',
    'Bursa': 'Bursa',
    'Isfahan': 'Isfahan',
    'New Mexico': 'New Mexico',
    'Puebla': 'Puebla',
    'Zimbabwe': 'Zimbabwe',
    'Toàn cầu': 'Global',

    // Countries
    'Việt Nam': 'Vietnam',
    'Trung Quốc': 'China',
    'Nhật Bản': 'Japan',
    'Hàn Quốc': 'South Korea',
    'Thái Lan': 'Thailand',
    'Đức': 'Germany',
    'Hà Lan': 'Netherlands',
    'Ý': 'Italy',
    'Pháp': 'France',
    'Anh': 'United Kingdom',
    'Thổ Nhĩ Kỳ': 'Turkey',
    'Iran': 'Iran',
    'Hoa Kỳ': 'United States',
    'Mexico': 'Mexico',
    'Quốc tế': 'International',

    // Eras
    'Thế kỷ 14 - nay': '14th century - present',
    'Đầu thế kỷ 20 - nay': 'Early 20th century - present',
    'Thế kỷ 13 - nay': '13th century - present',
    'Thế kỷ 13 - 17': '13th - 17th century',
    'Thế kỷ 16 - nay': '16th century - present',
    'Hàng nghìn năm': 'Thousands of years',
    'Thế kỷ 19 - nay': '19th century - present',
    'Thế kỷ 10 - nay': '10th century - present',
    'Thời Tống': 'Song dynasty',
    'Thời Tống - Nguyên': 'Song - Yuan dynasty',
    'Thời Bắc Tống': 'Northern Song dynasty',
    'Thời Kamakura': 'Kamakura period',
    'Thời Goryeo (918-1392)': 'Goryeo dynasty (918-1392)',
    'Thời Joseon (1392-1897)': 'Joseon dynasty (1392-1897)',
    'Thế kỷ 13 - 15': '13th - 15th century',
    'Thế kỷ 18 - nay': '18th century - present',
    'Thế kỷ 17 - nay': '17th century - present',
    'Thời Phục Hưng': 'Renaissance period',
    'Thế kỷ 15 - 17': '15th - 17th century',
    'Thế kỷ 12 - 14': '12th - 14th century',
    'Hàng nghìn năm - nay': 'Thousands of years - present',
    'Thế kỷ 20 - nay': '20th century - present',

    // Styles
    'Men ngọc, Men rạn, Hoa lam': 'Celadon, Cracked glaze, Blue-and-white',
    'Men màu, Chạm khắc nổi': 'Colored glazes, Relief carving',
    'Men da lươn, Men nâu': 'Eel-skin glaze, Brown glaze',
    'Hoa lam, Men trắng ngà': 'Blue-and-white, Ivory white glaze',
    'Đất nung, Không men': 'Terracotta, Unglazed',
    'Thủ công, Đất nung': 'Handcrafted, Terracotta',
    'Men màu, Vẽ tay': 'Colored glazes, Hand-painted',
    'Hoa lam, Men trắng, Ngũ thái': 'Blue-and-white, White glaze, Wucai',
    'Tử sa, Không men': 'Zisha (purple clay), Unglazed',
    'Men ngọc, Celadon': 'Celadon',
    'Men xanh thiên thanh': 'Sky blue glaze',
    'Blanc de Chine, Sứ trắng': 'Blanc de Chine, White porcelain',
    'Raku, Wabi-sabi': 'Raku, Wabi-sabi',
    'Sứ vẽ màu, Imari': 'Painted porcelain, Imari',
    'Không men, Nung củi': 'Unglazed, Wood-fired',
    'Men rạn, Trà đạo': 'Cracked glaze, Tea ceremony',
    'Tro tự nhiên, Không men': 'Natural ash glaze, Unglazed',
    'Men ngọc, Sanggam': 'Celadon, Sanggam (inlaid)',
    'Sứ trắng, Hoa lam': 'White porcelain, Blue-and-white',
    'Men xanh celadon, Hoa văn cá': 'Celadon, Fish motifs',
    'Ngũ sắc, Hoàng gia': 'Bencharong (5 colors), Royal',
    'Sứ cứng, Vẽ tay': 'Hard-paste porcelain, Hand-painted',
    'Men thiếc, Xanh-trắng': 'Tin-glazed, Blue-and-white',
    'Men thiếc, Đa sắc': 'Tin-glazed, Polychrome',
    'Jasperware, Tân cổ điển': 'Jasperware, Neoclassical',
    'Men xanh-đỏ, Hoa tulip': 'Blue-and-red glaze, Tulip motifs',
    'Lustre, Mina\'i': 'Lustre ware, Mina\'i',
    'Đất nung, Hình học': 'Terracotta, Geometric motifs',
    'Hình học, Đa sắc': 'Geometric patterns, Polychrome',
    'Đương đại, Thử nghiệm': 'Contemporary, Experimental',

    // Descriptions
    'Làng gốm cổ nổi tiếng nhất Việt Nam, nổi bật với men ngọc, men rạn và gốm hoa lam truyền thống.': 'The most famous ancient ceramic village in Vietnam, famous for its traditional celadon, crackle glaze, and blue-and-white ceramics.',
    'Phong cách gốm mỹ thuật kết hợp giữa nghệ thuật Đông Dương và kỹ thuật phương Tây, men màu rực rỡ.': 'Artistic ceramic style combining Indochinese art and Western techniques, featuring vibrant colored glazes.',
    'Nổi tiếng với gốm men da lươn, sản phẩm mang nét mộc mạc, giản dị của vùng Kinh Bắc.': 'Famous for its eel-skin glazed ceramics, presenting the rustic and simple character of Kinh Bac region.',
    'Dòng gốm cổ quý giá, từng được xuất khẩu sang Nhật Bản và Trung Đông. Nổi tiếng với hoa văn vẽ chìm.': 'A precious ancient ceramic line, once exported to Japan and the Middle East. Renowned for its underglaze designs.',
    'Làng gốm cổ bên sông Thu Bồn, gần phố cổ Hội An, nổi bật với gốm đất nung truyền thống.': 'An ancient pottery village by Thu Bon river, near Hoi An ancient town, famous for its traditional terracotta.',
    'Dòng gốm Chăm cổ xưa nhất Đông Nam Á, làm hoàn toàn thủ công không dùng bàn xoay.': 'The oldest Cham ceramic line in Southeast Asia, made entirely by hand without a potter\'s wheel.',
    'Gốm sứ truyền thống tỉnh Bình Dương với kỹ thuật vẽ tay tinh xảo, màu sắc phong phú.': 'Traditional ceramics of Binh Duong province with delicate hand-painted techniques and rich colors.',
    'Kinh đô sứ của thế giới, nổi tiếng với sứ hoa lam (Blue and White) và sứ men trắng tinh xảo.': 'The porcelain capital of the world, famous for blue-and-white porcelain and exquisite white porcelain.',
    'Nổi tiếng thế giới với ấm trà tử sa, được làm từ đất sét đặc biệt có màu tím đỏ.': 'World-famous for Yixing purple clay teapots, crafted from a special reddish-purple clay.',
    'Dòng men ngọc bích (celadon) nổi tiếng nhất, với lớp men xanh ngọc trong suốt tuyệt đẹp.': 'The most famous celadon ceramic line, featuring a beautiful translucent green jade glaze.',
    'Một trong 5 đại danh lò gốm Trung Quốc, men xanh thiên thanh cực kỳ quý hiếm.': 'One of the five famous great kilns of China, featuring an extremely rare sky-blue glaze.',
    'Sứ trắng tinh khiết Blanc de Chine, nổi tiếng với tượng Phật và đồ thờ phụng.': 'Pure white Blanc de Chine porcelain, famous for Buddhist statues and ritual items.',
    'Phong cách gốm gắn liền với trà đạo Nhật Bản, thể hiện triết lý wabi-sabi.': 'Ceramic style closely linked to the Japanese tea ceremony, embodying the philosophy of wabi-sabi.',
    'Sứ xuất khẩu nổi tiếng của Nhật, men nhiều màu rực rỡ với hoa văn Nhật đặc trưng.': 'Famous Japanese export porcelain, featuring brilliant polychrome glazes with distinctive Japanese motifs.',
    'Dòng gốm không tráng men, nung ở nhiệt độ cao tạo nên vẻ đẹp tự nhiên độc đáo.': 'An unglazed ceramic line fired at high temperatures, creating unique natural beauty.',
    'Được yêu thích trong giới trà đạo, men rạn tự nhiên thay đổi theo thời gian sử dụng.': 'Highly favored in tea ceremony circles, featuring a natural crackle glaze that changes over time with use.',
    'Một trong 6 lò gốm cổ Nhật Bản, nổi bật với kết cấu đất thô tự nhiên và vảy tro đặc trưng.': 'One of the Six Ancient Kilns of Japan, distinguished by its natural coarse clay texture and characteristic ash flakes.',
    'Men ngọc bích hoàng gia Hàn Quốc, kỹ thuật khảm sanggam độc đáo trên thế giới.': 'Korean royal jade celadon, featuring the world\'s unique sanggam inlay technique.',
    'Sứ trắng tinh khiết phản ánh tinh thần Nho giáo, vẽ hoa lam đậm chất Hàn Quốc.': 'Pure white porcelain reflecting Confucian spirit, decorated with blue-and-white designs of distinct Korean character.',
    'Gốm cổ Thái Lan thời Sukhothai, ảnh hưởng sâu sắc từ kỹ thuật Trung Hoa.': 'Ancient Thai ceramics of the Sukhothai period, heavily influenced by Chinese techniques.',
    'Gốm hoàng gia Thái 5 màu, trang trí công phu với hoa văn truyền thống Thái.': 'Thai royal five-color ceramics, elaborately decorated with traditional Thai patterns.',
    'Nhà sản xuất sứ đầu tiên tại châu Âu, nổi tiếng với biểu tượng hai thanh kiếm chéo.': 'The first manufacturer of porcelain in Europe, famous for its crossed swords logo.',
    'Gốm men thiếc nổi tiếng với hoa văn xanh-trắng, lấy cảm hứng từ sứ Trung Hoa.': 'Tin-glazed earthenware famous for blue-and-white designs, inspired by Chinese porcelain.',
    'Gốm tráng men thiếc rực rỡ sắc màu, mang đậm phong cách nghệ thuật Phục Hưng Ý.': 'Brightly colored tin-glazed earthenware, reflecting the artistic style of the Italian Renaissance.',
    'Sứ cao cấp Pháp, men trắng tinh khiết và vẽ tay tinh xảo, biểu tượng xa xỉ châu Âu.': 'Premium French porcelain, featuring pure white glaze and exquisite hand-painting, a symbol of European luxury.',
    'Thương hiệu sứ hoàng gia Anh, nổi tiếng với dòng Jasperware xanh-trắng tân cổ điển.': 'British royal porcelain brand, famous for its neoclassical blue-and-white Jasperware line.',
    'Gốm Ottoman vĩ đại, hoa văn hoa tulip và cẩm chướng trên men xanh-đỏ rực rỡ.': 'Magnificent Ottoman pottery, featuring tulip and carnation motifs on brilliant blue-and-red glaze.',
    'Gốm men láng Ba Tư với kỹ thuật Mina\'i và Lustre, ảnh hưởng sâu rộng đến gốm Hồi giáo.': 'Persian glazed ceramics using Mina\'i and Lustre techniques, deeply influencing Islamic pottery.',
    'Gốm thổ dân Pueblo Bắc Mỹ, hoa văn hình học truyền thống trên nền đất nung.': 'North American Pueblo Native pottery, decorated with traditional geometric designs on a terracotta body.',
    'Di sản UNESCO, kết hợp kỹ thuật gốm Tây Ban Nha và nghệ thuật bản địa Mexico.': 'A UNESCO World Heritage craft, combining Spanish glazing techniques with native Mexican art.',
    'Gốm truyền thống của người Ndebele với hoa văn hình học đậm màu sắc sặc sỡ đặc trưng châu Phi.': 'Traditional Ndebele pottery featuring vibrant, colorful geometric patterns characteristic of Africa.',
    'Phong trào gốm Raku đương đại kết hợp kỹ thuật Raku Nhật Bản cổ điển với tư duy nghệ thuật hiện đại.': 'Contemporary Raku movement combining classic Japanese techniques with modern artistic concepts.',
  };

  static String translate(String? text) {
    if (text == null || text.isEmpty) return '';
    if (current == 'vi') return text;
    final trimmed = text.trim();

    // Quick keyword matching for package names to avoid any encoding/formatting differences
    final lower = trimmed.toLowerCase();
    if (lower.contains('phổ biến') || lower.contains('pho bien') || lower.contains('popular')) {
      return lower.contains('gói') || lower.contains('pack') ? 'Popular Pack' : 'Popular';
    }
    if (lower.contains('cơ bản') || lower.contains('co ban') || lower.contains('basic')) {
      return lower.contains('gói') || lower.contains('pack') ? 'Basic Pack' : 'Basic';
    }
    if (lower.contains('chuyên gia') || lower.contains('chuyen gia') || lower.contains('expert')) {
      return lower.contains('gói') || lower.contains('pack') ? 'Expert Pack' : 'Expert';
    }
    if (lower.contains('nạp lượt') || lower.contains('nap luot') || lower.contains('top up')) {
      return 'Top Up';
    }

    if (_dict.containsKey(trimmed)) return _dict[trimmed]!;
    if (_dict.containsKey(text)) return _dict[text]!;

    // Perform regex replacements for common phrases
    String result = text;
    result = result.replaceAllMapped(RegExp(r'(?:thế\s+kỷ|thế\s*kỉ|tk|thk|th\.kỷ) ?(\d+)', caseSensitive: false), (match) {
      final n = int.tryParse(match.group(1) ?? '') ?? 0;
      if (n == 0) return match.group(0)!;
      final suffix = n == 1 ? 'st' : n == 2 ? 'nd' : n == 3 ? 'rd' : 'th';
      return '$n$suffix century';
    });

    result = result
      .replaceAll(RegExp(r'Thời đại đương đại', caseSensitive: false), 'Contemporary era')
      .replaceAll(RegExp(r'đương đại', caseSensitive: false), 'contemporary')
      .replaceAll(RegExp(r'Hiện đại', caseSensitive: false), 'Modern')
      .replaceAll(RegExp(r'hiện đại', caseSensitive: false), 'modern')
      .replaceAll(RegExp(r'thời kỳ|th?i k?', caseSensitive: false), 'era')
      .replaceAll(RegExp(r'cuối', caseSensitive: false), 'late')
      .replaceAll(RegExp(r'đầu', caseSensitive: false), 'early')
      .replaceAll(RegExp(r'đến nay', caseSensitive: false), '- present')
      .replaceAll(RegExp(r'trở lại đây|tr?lại đây', caseSensitive: false), 'onwards')
      .replaceAll(RegExp(r'từ những năm|t?những năm', caseSensitive: false), 'from the')
      .replaceAll(RegExp(r'Việt Nam', caseSensitive: false), 'Vietnam')
      .replaceAll(RegExp(r'Trung Quốc', caseSensitive: false), 'China')
      .replaceAll(RegExp(r'Nhật Bản', caseSensitive: false), 'Japan')
      .replaceAll(RegExp(r'Hàn Quốc', caseSensitive: false), 'South Korea')
      .replaceAll(RegExp(r'Thái Lan', caseSensitive: false), 'Thailand')
      .replaceAll(RegExp(r'Đức', caseSensitive: false), 'Germany')
      .replaceAll(RegExp(r'Hà Lan', caseSensitive: false), 'Netherlands')
      .replaceAll(RegExp(r'Ý', caseSensitive: false), 'Italy')
      .replaceAll(RegExp(r'Pháp', caseSensitive: false), 'France')
      .replaceAll(RegExp(r'Anh', caseSensitive: false), 'United Kingdom')
      .replaceAll(RegExp(r'Thổ Nhĩ Kỳ|Th? Nh? K?', caseSensitive: false), 'Turkey')
      .replaceAll(RegExp(r'Iran', caseSensitive: false), 'Iran')
      .replaceAll(RegExp(r'Hoa Kỳ|Hoa K?', caseSensitive: false), 'United States')
      .replaceAll(RegExp(r'Mexico', caseSensitive: false), 'Mexico')
      .replaceAll(RegExp(r'Quốc tế|Qu?c t?', caseSensitive: false), 'International')
      .replaceAll(RegExp(r'Không xác định', caseSensitive: false), 'Unknown');

    return result;
  }

  static Future<String> translateAsync(String? text) async {
    if (text == null || text.isEmpty) return '';
    if (current == 'vi') return text;

    final local = translate(text);
    if (local != text) return local;

    try {
      final url = Uri.parse(
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=$current&dt=t&q=${Uri.encodeComponent(text)}'
      );
      final response = await http.get(url).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded != null && decoded[0] != null) {
          final parts = decoded[0] as List;
          return parts.map((part) => part[0]?.toString() ?? '').join('');
        }
      }
    } catch (_) {}
    return text;
  }
}

class TranslateText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final TextAlign? textAlign;

  const TranslateText(this.text, {Key? key, this.style, this.maxLines, this.overflow, this.textAlign}) : super(key: key);

  @override
  State<TranslateText> createState() => _TranslateTextState();
}

class _TranslateTextState extends State<TranslateText> {
  String? _translated;
  String? _lastLang;

  @override
  void initState() {
    super.initState();
    _lastLang = AppLang.current;
    _load();
  }

  @override
  void didUpdateWidget(TranslateText oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text || _lastLang != AppLang.current) {
      _load();
    }
  }

  void _load() {
    _lastLang = AppLang.current;
    if (AppLang.current == 'vi' || widget.text.isEmpty) {
      setState(() => _translated = widget.text);
      return;
    }

    final local = AppLang.translate(widget.text);
    if (local != widget.text) {
      setState(() => _translated = local);
      return;
    }

    AppLang.translateAsync(widget.text).then((val) {
      if (mounted && _lastLang == AppLang.current) {
        setState(() => _translated = val);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      (_translated ?? widget.text).replaceAll('**', ''),
      style: widget.style,
      maxLines: widget.maxLines,
      overflow: widget.overflow,
      textAlign: widget.textAlign,
    );
  }
}
