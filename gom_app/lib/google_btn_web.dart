import 'package:flutter/material.dart';
import 'package:google_sign_in_web/web_only.dart' as web_only;

Widget buildWebGoogleButton({required VoidCallback onPressed, required Widget customButton}) {
  return SizedBox(
    height: 48,
    child: web_only.renderButton(
      configuration: web_only.GSIButtonConfiguration(
        text: web_only.GSIButtonText.signin,
        theme: web_only.GSIButtonTheme.outline,
        shape: web_only.GSIButtonShape.rectangular,
      )
    ),
  );
}
