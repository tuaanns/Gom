import 'package:flutter/material.dart';
import 'theme_storage.dart';

class AppTheme {
  static String current = getThemeMode();

  static bool get isDark => current == 'dark';

  static void saveTheme(String mode) {
    current = mode;
    saveThemeMode(mode);
  }

  // --- Dynamic Color Palette ---
  static Color get scaffoldBg => isDark ? const Color(0xFF0A0F1D) : const Color(0xFFFAF9F4);
  static Color get chatBg => isDark ? const Color(0xFF0A0F1D) : const Color(0xFFF5F0E8);
  static Color get cardBg => isDark ? const Color(0xFF151F38) : Colors.white;
  static Color get menuBg => isDark ? const Color(0xFF151F38) : const Color(0xFFF0EEDB);
  static Color get textPrimary => isDark ? Colors.white : const Color(0xFF0F265C);
  static Color get textSecondary => isDark ? Colors.white70 : const Color(0xFF1A2344);
  static Color get textMuted => isDark ? Colors.grey.shade400 : Colors.grey.shade600;
  static Color get inputBg => isDark ? const Color(0xFF151F38) : const Color(0xFFF5F3EC);
  static Color get searchBarBg => isDark ? const Color(0xFF151F38) : const Color(0xFFF0EEDB);
  static Color get bottomNavBg => isDark ? const Color(0xFF0A0F1D) : const Color(0xFFF5F0E8);
  static Color get navyButton => isDark ? const Color(0xFF1E3A8A) : const Color(0xFF0F265C);
  static Color get dividerColor => isDark ? Colors.white12 : Colors.grey.shade200;
  static Color get shadowColor => isDark ? Colors.black.withOpacity(0.3) : Colors.black.withOpacity(0.03);
  
  // Brand color (used for things like the chatbot icon, which should always match the web's dark blue/navy)
  static const Color brandNavy = Color(0xFF0F265C);
}
