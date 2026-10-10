import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import 'package:bcrypt/bcrypt.dart';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import '../db/database.dart';
import '../utils/response_helper.dart';

class AuthRoutes {
  Router get router {
    final router = Router();
    
    router.post('/login', _login);
    router.post('/logout', _logout);
    
    // /me is protected, but we mount it here and rely on middleware later
    router.get('/me', _me);
    
    return router;
  }

  Future<Response> _login(Request request) async {
    try {
      final payload = await request.readAsString();
      if (payload.isEmpty) {
        return ApiResponse.error('Request body cannot be empty', status: 400);
      }
      
      final data = jsonDecode(payload);
      final email = data['email'];
      final password = data['password'];
      
      if (email == null || password == null) {
        return ApiResponse.error('Email and password are required', status: 422);
      }
      
      final db = DatabaseHelper().db;
      final stmt = db.prepare('SELECT id, password_hash, role, status FROM users WHERE email = ?');
      final result = stmt.select([email]);
      stmt.dispose();
      
      if (result.isEmpty) {
        return ApiResponse.error('Invalid credentials', status: 401);
      }
      
      final user = result.first;
      if (user['status'] != 'ACTIVE') {
        return ApiResponse.error('Account is deactivated', status: 403);
      }
      
      final hash = user['password_hash'].toString();
      final isValid = BCrypt.checkpw(password.toString(), hash);
      if (!isValid) {
        return ApiResponse.error('Invalid credentials', status: 401);
      }
      
      // Generate JWT
      final jwt = JWT({
        'id': user['id'],
        'email': email,
        'role': user['role'],
      });
      
      // In production, load this from dotenv
      final token = jwt.sign(SecretKey('super_secret_key_123'), expiresIn: Duration(hours: 24));
      
      return ApiResponse.success('Login successful', data: {
        'token': token,
        'user': {
          'id': user['id'],
          'email': email,
          'role': user['role']
        }
      });
    } catch (e, stack) {
      print('=== LOGIN ERROR DEBUG ===');
      print(e);
      print(stack);
      return ApiResponse.error('Internal Server Error: $e', status: 500);
    }
  }

  Future<Response> _logout(Request request) async {
    // In a stateless JWT setup, logout is often handled client side.
    // For completeness, we return success.
    return ApiResponse.success('Logged out successfully');
  }

  Future<Response> _me(Request request) async {
    final user = request.context['user'] as Map<String, dynamic>?;
    if (user == null) {
      return ApiResponse.error('Unauthorized', status: 401);
    }
    
    final db = DatabaseHelper().db;
    final stmt = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?');
    final result = stmt.select([user['id']]);
    stmt.dispose();
    
    if (result.isEmpty) {
      return ApiResponse.error('User not found', status: 404);
    }
    
    return ApiResponse.success('Current user retrieved', data: result.first);
  }
}