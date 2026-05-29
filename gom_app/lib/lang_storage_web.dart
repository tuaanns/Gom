import 'dart:html' as html;

void saveLocaleToStorage(String locale) {
  html.window.localStorage['app_lang'] = locale;
}

String getLocaleFromStorage() {
  return html.window.localStorage['app_lang'] ?? 'vi';
}

void reloadWebPage() {
  html.window.location.reload();
}
