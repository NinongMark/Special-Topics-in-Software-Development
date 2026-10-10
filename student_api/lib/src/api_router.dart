import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import 'routes/auth_routes.dart';
import 'routes/student_routes.dart';
import 'routes/crud_routes.dart';
import 'routes/transaction_routes.dart';
import 'middleware/auth_middleware.dart';
import 'dart:convert';

class ApiRouter {
  Router get router {
    final app = Router();

    // Mount Auth Routes
    app.mount('/api/v1/auth', AuthRoutes().router.call);

    // Mount Student Routes
    app.mount('/api/v1/students', StudentRoutes().router.call);

    // Mount CRUD routes
    app.mount('/api/v1/programs', CrudRoutes('programs').router.call);
    app.mount('/api/v1/courses', CrudRoutes('courses').router.call);
    app.mount('/api/v1/academic-terms', CrudRoutes('academic_terms').router.call);
    app.mount('/api/v1/course-offerings', CrudRoutes('course_offerings').router.call);

    // Mount Transaction Routes (Enrollments/Grades)
    app.mount('/api/v1', TransactionRoutes().router.call);

    // Root / API Docs placeholder
    app.get('/api/docs', (Request request) {
      return Response.ok(
        jsonEncode({"message": "API Documentation available in swagger.json"}),
        headers: {'content-type': 'application/json'},
      );
    });

    return app;
  }

  Handler get handler {
    final pipeline = Pipeline()
        .addMiddleware(logRequests())
        .addMiddleware(authMiddleware()) // Apply JWT auth globally, handles exclusions
        .addHandler(router.call);
    
    return pipeline;
  }
}

