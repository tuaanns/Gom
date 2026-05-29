import 'theme_storage_stub.dart' if (dart.library.js_interop) 'theme_storage_web.dart';

void saveThemeMode(String mode) {
  saveThemeModeToStorage(mode);
}

String getThemeMode() {
  return getThemeModeFromStorage();
}
