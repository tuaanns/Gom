import 'package:flutter_test/flutter_test.dart';
import 'package:gom_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MultiAgentGomApp());
    expect(find.text('GOM AI'), findsOneWidget);
  });
}
