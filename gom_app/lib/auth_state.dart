class AuthState {
  static String? token;
  static Map<String, dynamic>? user;
  static bool get isLoggedIn => token != null;

  static void clear() {
    token = null;
    user = null;
  }
}
