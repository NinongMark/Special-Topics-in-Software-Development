import 'package:sqlite3/sqlite3.dart';
import 'package:bcrypt/bcrypt.dart';
import 'dart:io';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  late Database db;

  factory DatabaseHelper() {
    return _instance;
  }

  DatabaseHelper._internal();

  void init() {
    // Open a local sqlite database
    db = sqlite3.open('students_api.db');
    
    // Enable foreign keys
    db.execute('PRAGMA foreign_keys = ON;');
    
    _createTables();
    _seedData();
  }

  void _createTables() {
    db.execute('''
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ''');
    
    db.execute('''
      CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_number TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        middle_name TEXT,
        last_name TEXT NOT NULL,
        suffix TEXT,
        birth_date DATE,
        email TEXT,
        contact_number TEXT,
        address TEXT,
        program_id INTEGER,
        year_level INTEGER,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id) REFERENCES programs(id)
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_code TEXT NOT NULL UNIQUE,
        course_title TEXT NOT NULL,
        description TEXT,
        units INTEGER NOT NULL,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS academic_terms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        academic_year TEXT NOT NULL,
        semester TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS course_offerings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        academic_term_id INTEGER NOT NULL,
        instructor_id INTEGER NOT NULL,
        section TEXT NOT NULL,
        schedule TEXT,
        room TEXT,
        capacity INTEGER,
        status TEXT DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (academic_term_id) REFERENCES academic_terms(id),
        FOREIGN KEY (instructor_id) REFERENCES users(id)
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_offering_id INTEGER NOT NULL,
        enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ENROLLED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id),
        UNIQUE (student_id, course_offering_id)
      );
    ''');

    db.execute('''
      CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL UNIQUE,
        midterm_grade REAL,
        final_grade REAL,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id)
      );
    ''');
  }

  void _seedData() {
    final stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    final result = stmt.select();
    final count = result.first['count'] as int;
    stmt.dispose();

    if (count == 0) {
      final defaultPassword = BCrypt.hashpw('password123', BCrypt.gensalt());
      
      // Seed Users
      db.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin User', 'admin@school.edu', '$defaultPassword', 'Administrator')");
      db.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Staff User', 'staff@school.edu', '$defaultPassword', 'Registrar')");
      db.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Instructor One', 'instructor1@school.edu', '$defaultPassword', 'Instructor')");
      db.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Instructor Two', 'instructor2@school.edu', '$defaultPassword', 'Instructor')");
      db.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Student User', 'student@school.edu', '$defaultPassword', 'Student')");
      
      // Seed Programs
      db.execute("INSERT INTO programs (code, name, description) VALUES ('BSIT', 'BS Information Technology', 'IT Program')");
      db.execute("INSERT INTO programs (code, name, description) VALUES ('BSCS', 'BS Computer Science', 'CS Program')");
      db.execute("INSERT INTO programs (code, name, description) VALUES ('BSIS', 'BS Information Systems', 'IS Program')");

      // Seed Courses
      db.execute("INSERT INTO courses (course_code, course_title, units) VALUES ('IT101', 'Intro to Computing', 3)");
      db.execute("INSERT INTO courses (course_code, course_title, units) VALUES ('IT102', 'Programming 1', 3)");
      db.execute("INSERT INTO courses (course_code, course_title, units) VALUES ('IT201', 'Data Structures', 3)");

      // Seed Academic Terms
      db.execute("INSERT INTO academic_terms (academic_year, semester) VALUES ('2023-2024', '1st Semester')");
      db.execute("INSERT INTO academic_terms (academic_year, semester) VALUES ('2023-2024', '2nd Semester')");

      // Seed Students
      for(int i=1; i<=10; i++) {
        db.execute("INSERT INTO students (student_number, first_name, last_name, program_id, year_level) VALUES ('2026-0000$i', 'Student', 'Test$i', 1, 1)");
      }

      // Seed Course Offerings
      db.execute("INSERT INTO course_offerings (course_id, academic_term_id, instructor_id, section, capacity) VALUES (1, 1, 3, 'A', 40)");
      db.execute("INSERT INTO course_offerings (course_id, academic_term_id, instructor_id, section, capacity) VALUES (2, 1, 4, 'B', 40)");

      // Seed Enrollments
      db.execute("INSERT INTO enrollments (student_id, course_offering_id) VALUES (1, 1)");
      db.execute("INSERT INTO enrollments (student_id, course_offering_id) VALUES (2, 1)");
      db.execute("INSERT INTO enrollments (student_id, course_offering_id) VALUES (1, 2)");

      // Seed Grades
      db.execute("INSERT INTO grades (enrollment_id, midterm_grade, final_grade, remarks) VALUES (1, 85, 90, 'Passed')");
    }
  }
}
