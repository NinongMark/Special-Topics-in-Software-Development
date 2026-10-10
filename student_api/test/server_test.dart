import 'package:test/test.dart';
import 'package:shelf/shelf.dart';
import 'package:student_api/src/api_router.dart';

void main() {
  group('Server API Tests', () {
    late Handler handler;

    setUp(() {
      handler = ApiRouter().handler;
    });

    test('Unauthenticated user receives 401 on protected route', () async {
      final request = Request('GET', Uri.parse('http://localhost:8080/api/v1/students'));
      final response = await handler(request);
      
      expect(response.statusCode, equals(401));
    });

    test('Login route requires email and password', () async {
      final request = Request(
        'POST', 
        Uri.parse('http://localhost:8080/api/v1/auth/login'),
        body: '{"email": "test@test.com"}' // Missing password
      );
      final response = await handler(request);
      
      expect(response.statusCode, equals(422));
    });
    
    test('API docs returns 200', () async {
      final request = Request('GET', Uri.parse('http://localhost:8080/api/docs'));
      final response = await handler(request);
      
      expect(response.statusCode, equals(200));
    });
  });
}
