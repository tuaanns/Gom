import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

class ApiConfig {
  static const String _overrideBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String _webBaseUrl = 'http://localhost:8000';
  static const String _androidEmulatorBaseUrl = 'http://10.0.2.2:8000';

  static String get baseUrl {
    if (_overrideBaseUrl.isNotEmpty) return _overrideBaseUrl;
    if (kIsWeb) return _webBaseUrl;
    return 'https://thearchivist-edemdeeaf4ahamgs.southeastasia-01.azurewebsites.net';
  }

  static Uri uri(String path) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$baseUrl$normalizedPath');
  }

  static String absoluteUrl(String urlOrPath) {
    if (urlOrPath.isEmpty) return '';
    String res = urlOrPath;
    if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
      res = urlOrPath.replaceFirst('http://localhost:8000', baseUrl).replaceFirst('http://localhost', baseUrl);
    } else {
      final normalizedPath = urlOrPath.startsWith('/') ? urlOrPath : '/$urlOrPath';
      res = '$baseUrl$normalizedPath';
    }
    if (kIsWeb) {
      return '$baseUrl/api/proxy-image?url=${Uri.encodeComponent(res)}';
    }
    return res;
  }
}
