import 'dart:html' as html;

void saveThemeModeToStorage(String mode) {
  html.window.localStorage['app_theme'] = mode;
}

String getThemeModeFromStorage() {
  return html.window.localStorage['app_theme'] ?? 'light';
}
