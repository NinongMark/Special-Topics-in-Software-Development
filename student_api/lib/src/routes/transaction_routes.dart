import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../db/database.dart';
import '../utils/response_helper.dart';

class TransactionRoutes {
  Router get router {
    final router = Router();
    
    // Enrollments
    router.get('/enrollments', _getEnrollments);
    router.post('/enrollments', _createEnrollment);
    router.patch('/enrollments/<id>', _patchEnrollment);
    
    // Grades
    router.get('/grades', _getGrades);
    router.post('/grades', _createGrade);
    router.patch('/grades/<id>', _patchGrade);

    return router;
  }

  Future<Response> _getEnrollments(Request request) async {
    final db = DatabaseHelper().db;
    final result = db.select('SELECT * FROM enrollments');
    return ApiResponse.success('Enrollments retrieved', data: result.toList());
  }

  Future<Response> _createEnrollment(Request request) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') return ApiResponse.error('Forbidden', status: 403);

    final payload = await request.readAsString();
    final data = jsonDecode(payload);

    try {
      final db = DatabaseHelper().db;
      db.execute('INSERT INTO enrollments (student_id, course_offering_id) VALUES (?, ?)', [
        data['student_id'], data['course_offering_id']
      ]);
      return ApiResponse.success('Enrolled successfully', status: 201);
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
         return ApiResponse.error('Student is already enrolled in this course offering', status: 409);
      }
      return ApiResponse.error('Validation failed: \$e', status: 422);
    }
  }

  Future<Response> _patchEnrollment(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') return ApiResponse.error('Forbidden', status: 403);
    
    final payload = await request.readAsString();
    final data = jsonDecode(payload);

    try {
      DatabaseHelper().db.execute('UPDATE enrollments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [data['status'], id]);
      return ApiResponse.success('Enrollment updated');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }

  Future<Response> _getGrades(Request request) async {
    final db = DatabaseHelper().db;
    final result = db.select('SELECT * FROM grades');
    return ApiResponse.success('Grades retrieved', data: result.toList());
  }

  Future<Response> _createGrade(Request request) async {
    final user = request.context['user'] as Map<String, dynamic>;
    final payload = await request.readAsString();
    final data = jsonDecode(payload);
    
    // Check if Instructor is authorized to grade this enrollment
    final db = DatabaseHelper().db;
    if (user['role'] == 'Instructor') {
      final check = db.select('''
        SELECT co.instructor_id FROM enrollments e
        JOIN course_offerings co ON e.course_offering_id = co.id
        WHERE e.id = ?
      ''', [data['enrollment_id']]);
      
      if (check.isEmpty || check.first['instructor_id'] != user['id']) {
        return ApiResponse.error('Forbidden: You are not the instructor for this course offering', status: 403);
      }
    } else if (user['role'] == 'Student') {
       return ApiResponse.error('Forbidden', status: 403);
    }

    try {
      db.execute('INSERT INTO grades (enrollment_id, midterm_grade, final_grade, remarks) VALUES (?, ?, ?, ?)', [
        data['enrollment_id'], data['midterm_grade'], data['final_grade'], data['remarks']
      ]);
      return ApiResponse.success('Grade recorded', status: 201);
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
         return ApiResponse.error('Grade already exists for this enrollment. Use PATCH to update.', status: 409);
      }
      return ApiResponse.error('Validation failed: \$e', status: 422);
    }
  }

  Future<Response> _patchGrade(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    final db = DatabaseHelper().db;
    
    if (user['role'] == 'Instructor') {
       final check = db.select('''
        SELECT co.instructor_id FROM grades g
        JOIN enrollments e ON g.enrollment_id = e.id
        JOIN course_offerings co ON e.course_offering_id = co.id
        WHERE g.id = ?
      ''', [id]);
      
      if (check.isEmpty || check.first['instructor_id'] != user['id']) {
        return ApiResponse.error('Forbidden: You are not the instructor for this course offering', status: 403);
      }
    } else if (user['role'] == 'Student') {
       return ApiResponse.error('Forbidden', status: 403);
    }
    
    final payload = await request.readAsString();
    final data = jsonDecode(payload) as Map<String, dynamic>;
    final setClauses = data.keys.map((k) => '$k = ?').join(', ');
    final args = data.values.toList()..add(id);

    try {
      db.execute('UPDATE grades SET $setClauses, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args);
      return ApiResponse.success('Grade updated successfully');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }
}

