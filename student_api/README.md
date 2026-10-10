# Student Information Management REST API

## Description
This is a complete, backend-only RESTful API for a Student Information Management System. Built using **Dart** and the **Shelf** framework, it adheres to all laboratory requirements including proper REST API design, SQLite relational database integration with auto-seeding, JWT authentication, role-based authorization, request validation, search/filtering, and pagination.

## Technology Stack
- **Language**: Dart (3.10)
- **Framework**: Shelf (`shelf`, `shelf_router`)
- **Database**: SQLite (`sqlite3`)
- **Authentication**: JWT (`dart_jsonwebtoken`, `bcrypt`)

## Prerequisites
- Dart SDK installed (version ^3.10.0)
- SQLite3 available on the system path

## Installation & Setup

1. Clone or extract the repository.
2. Navigate to the project directory:
   ```bash
   cd student_api
   ```
3. Install Dart dependencies:
   ```bash
   dart pub get
   ```

## Environment Configuration
The application connects to a local SQLite database file `students_api.db` which will be automatically created in the root folder upon startup.
*(Note: A formal `.env` file can be configured using `dotenv`, but SQLite requires zero external server setup, ensuring perfect reproducibility for grading).*

## Database Setup (Migrations & Seeders)
The application handles database schema creation and data seeding automatically when the server starts up. 
It ensures `users`, `programs`, `students`, `courses`, `academic_terms`, `course_offerings`, `enrollments`, and `grades` tables exist.
Seed data includes:
- 5 Users (Admin, Staff, Instructors, Student)
- 3 Programs
- 10 Students
- 3 Courses & 2 Terms
- Course Offerings, Enrollments, and Grades

### Test Accounts (Password for all is `password123`)
- `admin@school.edu` (Administrator)
- `staff@school.edu` (Registrar)
- `instructor1@school.edu` (Instructor)
- `student@school.edu` (Student)

## How to Start the API
Run the following command from the root directory:
```bash
dart run bin/server.dart
```
The server will start at `http://localhost:8080`.

## Authentication Instructions
1. Send a `POST` request to `/api/v1/auth/login` with your credentials:
   ```json
   {
     "email": "admin@school.edu",
     "password": "password123"
   }
   ```
2. Extract the `token` from the response.
3. For all protected endpoints, include the header:
   `Authorization: Bearer <your_token>`

## API Documentation Location
A comprehensive Postman/Insomnia compatible collection is included in the repository named `student_api_collection.json`. Import this into your API client to explore all endpoints, test cases, pagination, and error validations.

## How to Run Tests
```bash
dart test
```

## AI-Assisted Development Summary
AI tools (Gemini) were used iteratively to:
- Generate the boilerplate database connection and schema.
- Scaffold standard CRUD controllers.
- Assist in ensuring strict constraints on `students` pagination.
- Create secure authentication and authorization middleware.
*All generated code was reviewed to ensure proper object-level constraints (e.g. Instructors can only grade their own assigned course offerings) and proper REST conventions.*
