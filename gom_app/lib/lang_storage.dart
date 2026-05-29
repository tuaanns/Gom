import 'lang_storage_stub.dart' if (dart.library.js_interop) 'lang_storage_web.dart';

void saveLocale(String locale) {
  saveLocaleToStorage(locale);
}

String getLocale() {
  return getLocaleFromStorage();
}

void reloadApp() {
  reloadWebPage();
}
