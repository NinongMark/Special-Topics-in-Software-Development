import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../db/database.dart';
import '../utils/response_helper.dart';

class StudentRoutes {
  Router get router {
    final router = Router();
    
    router.get('/', _getStudents);
    router.post('/', _createStudent);
    router.get('/<id>', _getStudent);
    router.put('/<id>', _updateStudent);
    router.patch('/<id>', _patchStudent);
    router.delete('/<id>', _deleteStudent);
    router.get('/<id>/academic-record', _getAcademicRecord);
    router.get('/<id>/enrollments', _getEnrollments);
    router.get('/<id>/grades', _getGrades);
    
    return router;
  }

  Future<Response> _getStudents(Request request) async {
    final queryParams = request.url.queryParameters;
    int page = int.tryParse(queryParams['page'] ?? '1') ?? 1;
    int perPage = int.tryParse(queryParams['per_page'] ?? '20') ?? 20;
    String? search = queryParams['search'];
    String? programId = queryParams['program_id'];
    String? yearLevel = queryParams['year_level'];
    String? sort = queryParams['sort'] ?? 'last_name';
    
    // Whitelist sort columns to prevent SQL injection
    const allowedSortColumns = ['last_name', 'first_name', 'student_number', 'created_at'];
    if (!allowedSortColumns.contains(sort)) {
      sort = 'last_name';
    }

    final db = DatabaseHelper().db;
    
    String whereClause = '1=1';
    List<dynamic> args = [];
    
    if (search != null && search.isNotEmpty) {
      whereClause += ' AND (last_name LIKE ? OR first_name LIKE ? OR student_number LIKE ?)';
      args.addAll(['%$search%', '%$search%', '%$search%']);
    }
    
    if (programId != null) {
      whereClause += ' AND program_id = ?';
      args.add(programId);
    }
    
    if (yearLevel != null) {
      whereClause += ' AND year_level = ?';
      args.add(yearLevel);
    }
    
    // Get total count
    final countStmt = db.prepare('SELECT COUNT(*) as total FROM students WHERE $whereClause');
    final countResult = countStmt.select(args);
    final total = countResult.first['total'] as int;
    countStmt.dispose();

    // Get paginated data
    int offset = (page - 1) * perPage;
    final selectStmt = db.prepare('SELECT * FROM students WHERE $whereClause ORDER BY $sort LIMIT ? OFFSET ?');
    args.addAll([perPage, offset]);
    final result = selectStmt.select(args);
    selectStmt.dispose();
    
    return ApiResponse.success('Students retrieved successfully', data: {
      'data': result.toList(),
      'meta': {
        'current_page': page,
        'per_page': perPage,
        'total': total,
        'last_page': (total / perPage).ceil(),
      }
    });
  }

  Future<Response> _getStudent(Request request, String id) async {
    final db = DatabaseHelper().db;
    final stmt = db.prepare('SELECT * FROM students WHERE id = ?');
    final result = stmt.select([id]);
    stmt.dispose();
    
    if (result.isEmpty) {
      return ApiResponse.error('Student not found', status: 404);
    }
    
    // Authorization check: Student can only view themselves
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student') {
       final userEmail = user['email'];
       if (result.first['email'] != userEmail) { // Basic naive check for demonstration
          return ApiResponse.error('Forbidden', status: 403);
       }
    }

    return ApiResponse.success('Student retrieved successfully', data: result.first);
  }

  Future<Response> _createStudent(Request request) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') {
      return ApiResponse.error('Forbidden', status: 403);
    }

    final payload = await request.readAsString();
    final data = jsonDecode(payload);
    
    final studentNumber = data['student_number'];
    final firstName = data['first_name'];
    final lastName = data['last_name'];
    
    if (studentNumber == null || firstName == null || lastName == null) {
      return ApiResponse.error('student_number, first_name, and last_name are required', status: 422);
    }
    
    try {
      final db = DatabaseHelper().db;
      db.execute('''
        INSERT INTO students (student_number, first_name, middle_name, last_name, suffix, birth_date, email, contact_number, address, program_id, year_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ''', [
        studentNumber, firstName, data['middle_name'], lastName, data['suffix'],
        data['birth_date'], data['email'], data['contact_number'], data['address'],
        data['program_id'], data['year_level']
      ]);
      
      final id = db.lastInsertRowId;
      final newStudent = db.select('SELECT * FROM students WHERE id = ?', [id]).first;
      
      return ApiResponse.success('Student created successfully', data: newStudent, status: 201);
    } catch (e) {
      if (e.toString().contains('UNIQUE constraint failed')) {
        return ApiResponse.error('Validation failed', errors: {'student_number': 'must be unique'}, status: 422);
      }
      return ApiResponse.error('Database error: ${e.toString()}', status: 500);
    }
  }

  Future<Response> _updateStudent(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') return ApiResponse.error('Forbidden', status: 403);
    
    final payload = await request.readAsString();
    final data = jsonDecode(payload);
    
    final db = DatabaseHelper().db;
    try {
      db.execute('''
        UPDATE students SET 
          student_number = ?, first_name = ?, middle_name = ?, last_name = ?, 
          suffix = ?, birth_date = ?, email = ?, contact_number = ?, 
          address = ?, program_id = ?, year_level = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      ''', [
        data['student_number'], data['first_name'], data['middle_name'], data['last_name'],
        data['suffix'], data['birth_date'], data['email'], data['contact_number'],
        data['address'], data['program_id'], data['year_level'], data['status'] ?? 'ACTIVE', id
      ]);
      return ApiResponse.success('Student updated successfully');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }

  Future<Response> _patchStudent(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') return ApiResponse.error('Forbidden', status: 403);
    
    final payload = await request.readAsString();
    final data = jsonDecode(payload) as Map<String, dynamic>;
    
    if (data.isEmpty) return ApiResponse.error('No fields to update', status: 400);

    final db = DatabaseHelper().db;
    final setClauses = data.keys.map((k) => '$k = ?').join(', ');
    final args = data.values.toList()..add(id);

    try {
      db.execute('UPDATE students SET $setClauses, updated_at = CURRENT_TIMESTAMP WHERE id = ?', args);
      return ApiResponse.success('Student patched successfully');
    } catch (e) {
      return ApiResponse.error('Database error', status: 500);
    }
  }

  Future<Response> _deleteStudent(Request request, String id) async {
    final user = request.context['user'] as Map<String, dynamic>;
    if (user['role'] == 'Student' || user['role'] == 'Instructor') return ApiResponse.error('Forbidden', status: 403);
    
    final db = DatabaseHelper().db;
    // Perform soft delete
    db.execute("UPDATE students SET status = 'INACTIVE' WHERE id = ?", [id]);
    return ApiResponse.success('Student deactivated successfully');
  }

  Future<Response> _getEnrollments(Request request, String id) async {
    final db = DatabaseHelper().db;
    final stmt = db.prepare('SELECT * FROM enrollments WHERE student_id = ?');
    final result = stmt.select([id]);
    stmt.dispose();
    return ApiResponse.success('Enrollments retrieved', data: result.toList());
  }

  Future<Response> _getGrades(Request request, String id) async {
    final db = DatabaseHelper().db;
    final result = db.select('''
      SELECT g.*, c.course_code, c.course_title, e.enrollment_date 
      FROM grades g
      JOIN enrollments e ON g.enrollment_id = e.id
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      WHERE e.student_id = ?
    ''', [id]);
    return ApiResponse.success('Grades retrieved', data: result.toList());
  }

  Future<Response> _getAcademicRecord(Request request, String id) async {
    final db = DatabaseHelper().db;
    // Aggregated student record grouped by academic term
    final result = db.select('''
      SELECT t.academic_year, t.semester, c.course_code, c.course_title, c.units, g.final_grade, g.remarks
      FROM enrollments e
      JOIN course_offerings co ON e.course_offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN academic_terms t ON co.academic_term_id = t.id
      LEFT JOIN grades g ON e.id = g.enrollment_id
      WHERE e.student_id = ?
      ORDER BY t.academic_year, t.semester
    ''', [id]);

    final Map<String, List<dynamic>> grouped = {};
    for (var row in result) {
      final termKey = "\${row['academic_year']} - \${row['semester']}";
      if (!grouped.containsKey(termKey)) {
        grouped[termKey] = [];
      }
      grouped[termKey]!.add(row);
    }
    
    return ApiResponse.success('Academic record retrieved', data: grouped);
  }
}

