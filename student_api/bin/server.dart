import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart';
import 'package:student_api/src/api_router.dart';
import 'package:student_api/src/db/database.dart';

void main(List<String> args) async {
  // Initialize SQLite database and tables/seeds
  print('Initializing database...');
  DatabaseHelper().init();
  print('Database seeded and ready.');

  // Configure routes and middleware
  final handler = ApiRouter().handler;

  // Use any available host or IPv4 localhost
  final ip = InternetAddress.anyIPv4;
  
  // For running in containers, we respect the PORT environment variable.
  final port = int.parse(Platform.environment['PORT'] ?? '8080');
  
  final server = await serve(handler, ip, port);
  print('Server listening on port \${server.port}');
}
