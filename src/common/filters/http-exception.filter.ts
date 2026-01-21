import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        errors = (exceptionResponse as any).errors;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Log error details in development
      if (process.env.NODE_ENV === 'development') {
        console.error('🔴 Error:', exception.message);
        console.error('Stack:', exception.stack);
      }
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
      ...(process.env.NODE_ENV === 'development' &&
        exception instanceof Error && { stack: exception.stack }),
      timestamp: new Date().toISOString(),
    });
  }
}
