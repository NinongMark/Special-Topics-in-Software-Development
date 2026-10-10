import 'package:shelf/shelf.dart';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import '../utils/response_helper.dart';

Middleware authMiddleware() {
  return (Handler innerHandler) {
    return (Request request) async {
      // Public routes that don't need auth
      final path = request.url.path;
      if (path == 'api/v1/auth/login') {
        return innerHandler(request);
      }
      if (path.startsWith('api/docs') || path.isEmpty) {
         return innerHandler(request);
      }

      final authHeader = request.headers['authorization'];
      if (authHeader == null || !authHeader.startsWith('Bearer ')) {
        return ApiResponse.error('Missing or invalid authentication token', status: 401);
      }

      final token = authHeader.substring(7);
      try {
        final jwt = JWT.verify(token, SecretKey('super_secret_key_123'));
        final user = jwt.payload as Map<String, dynamic>;
        
        // Add user info to request context
        final requestWithUser = request.change(context: {'user': user});
        return innerHandler(requestWithUser);
      } catch (e) {
        return ApiResponse.error('Invalid or expired token', status: 401);
      }
    };
  };
}

Middleware roleMiddleware(List<String> allowedRoles) {
  return (Handler innerHandler) {
    return (Request request) async {
      final user = request.context['user'] as Map<String, dynamic>?;
      if (user == null) {
        return ApiResponse.error('Unauthorized', status: 401);
      }
      
      final role = user['role'] as String;
      if (!allowedRoles.contains(role) && role != 'Administrator') {
        return ApiResponse.error('Forbidden: Insufficient permissions', status: 403);
      }
      
      return innerHandler(request);
    };
  };
}

