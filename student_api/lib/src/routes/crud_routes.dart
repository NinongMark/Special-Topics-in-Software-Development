import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../db/database.dart';
import '../utils/response_helper.dart';

// Provides simple standard CRUD routes for a given table
class CrudRoutes {
  final String tableName;
  
  CrudRoutes(this.tableName);

  Router get router {
    final router = Router();
    router.get('/', _getAll);
    router.post('/', _create);
    router.get('/<id>', _getOne);
    router.put('/<id>', _update);
    router.patch('/<id>', _patch);
    router.delete('/<id>', _delete);
    return router;
  }

  Future<Response> _getAll(Request request) async {
    final db = DatabaseHelper().db;
    final result = db.select('SELECT * FROM $tableName');
    return ApiResponse.success('\${tableName} retrieved successfully', data: result.toList());
  }

  Future<Response> _getOne(Request request, String id) async {
    final db = DatabaseHelper().db;
    final result = db.select('SELECT * FROM $tableName WHERE id = ?', [id]);
    if (result.isEmpty) return ApiResponse.error('Not found', status: 404);
    return ApiResponse.success('Retrieved successfully', data: result.first);
  }

  Future<Response> _create(Request request) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] != 'Administrator' && user['role'] != 'Registrar') {
      return ApiResponse.error('Forbidden', status: 403);
    }

    final payload = await request.readAsString();
    final data = jsonDecode(payload) as Map<String, dynamic>;
    final db = DatabaseHelper().db;
    
    final columns = data.keys.join(', ');
    final placeholders = data.keys.map((_) => '?').join(', ');
    final args = data.values.toList();
    
    try {
      db.execute('INSERT INTO $tableName ($columns) VALUES ($placeholders)', args);
      final id = db.lastInsertRowId;
      final inserted = db.select('SELECT * FROM $tableName WHERE id = ?', [id]).first;
      return ApiResponse.success('Created successfully', data: inserted, status: 201);
    } catch (e) {
      return ApiResponse.error('Validation or database error: $e', status: 422);
    }
  }

  Future<Response> _update(Request request, String id) async {
    return _patch(request, id); // Simplified for this exercise
  }

  Future<Response> _patch(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] != 'Administrator' && user['role'] != 'Registrar') {
      return ApiResponse.error('Forbidden', status: 403);
    }

    final payload = await request.readAsString();
    final data = jsonDecode(payload) as Map<String, dynamic>;
    if (data.isEmpty) return ApiResponse.error('No fields provided', status: 400);

    final setClauses = data.keys.map((k) => '$k = ?').join(', ');
    final args = data.values.toList()..add(id);

    try {
      final db = DatabaseHelper().db;
      db.execute('UPDATE $tableName SET $setClauses, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args);
      return ApiResponse.success('Updated successfully');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }

  Future<Response> _delete(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] != 'Administrator' && user['role'] != 'Registrar') return ApiResponse.error('Forbidden', status: 403);
    
    try {
      DatabaseHelper().db.execute("UPDATE $tableName SET status = 'INACTIVE' WHERE id = ?", [id]);
      return ApiResponse.success('Deactivated successfully');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }
}

