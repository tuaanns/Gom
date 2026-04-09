import 'package:flutter/material.dart';
import 'google_btn_stub.dart' if (dart.library.js_interop) 'google_btn_web.dart';

Widget buildCrossPlatformGoogleButton({required VoidCallback onPressed, required Widget customButton}) {
  return buildWebGoogleButton(onPressed: onPressed, customButton: customButton);
}
