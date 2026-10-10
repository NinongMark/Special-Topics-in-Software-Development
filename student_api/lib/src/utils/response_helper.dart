import 'dart:convert';
import 'package:shelf/shelf.dart';

class ApiResponse {
  static Response success(String message, {dynamic data, int status = 200}) {
    return Response(
      status,
      headers: {'content-type': 'application/json'},
      body: jsonEncode({
        'success': true,
        'message': message,
        if (data != null) 'data': data,
      }),
    );
  }

  static Response error(String message, {dynamic errors, int status = 400}) {
    return Response(
      status,
      headers: {'content-type': 'application/json'},
      body: jsonEncode({
        'success': false,
        'message': message,
        if (errors != null) 'errors': errors,
      }),
    );
  }
}

