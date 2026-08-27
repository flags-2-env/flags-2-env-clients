import 'dart:convert';
import 'dart:typed_data';

import 'package:flags_2_env_client/flags_2_env_client.dart';

void main() {
  final client = Client(const ClientConfig(baseUrl: 'https://flags.example'));
  final body = Uint8List.fromList(
    utf8.encode('{"ok":true,"service":"flags-2-env"}'),
  );
  final first = client.decodeHealth(body);
  final second = client.decodeHealth(body);
  _expect(first.ok && first.service == 'flags-2-env', 'decode ok');
  _expect(
    second.ok == first.ok && second.service == first.service,
    'pure decode',
  );

  final fromMap = ClientConfig.fromEnvironment({
    'FLAGS_2_ENV_API_BASE': 'https://flags.example',
    'FLAGS_2_ENV_TOKEN': 'secret',
  });
  _expect(fromMap.baseUrl == 'https://flags.example', 'explicit env base');
  _expect(fromMap.bearerToken == 'secret', 'explicit env token');
}

void _expect(bool condition, String message) {
  if (!condition) {
    throw StateError('flags-2-env client: $message');
  }
}
