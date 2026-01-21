import { Response } from 'express';

export class ResponseFormatter {
  static success(
    res: Response,
    data: any,
    message = 'Operation successful',
    statusCode = 200,
    meta: Record<string, any> = {},
  ) {
    const response: any = {
      success: true,
      data,
      message,
    };

    if (meta.count !== undefined) response.count = meta.count;
    if (meta.total !== undefined) response.total = meta.total;
    if (meta.page !== undefined) response.page = meta.page;
    if (meta.limit !== undefined) response.limit = meta.limit;

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    error: any = null,
    meta: Record<string, any> = {},
  ) {
    const response: any = {
      success: false,
      message,
    };

    if (process.env.NODE_ENV === 'development' && error) {
      if (typeof error === 'string') {
        response.error = error;
      } else if (error?.message) {
        response.error = error.message;
      }
    }

    if (meta.code !== undefined) response.code = meta.code;
    if (meta.field !== undefined) response.field = meta.field;

    return res.status(statusCode).json(response);
  }

  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string; value?: any }>,
  ) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  static notFound(res: Response, resource = 'Resource') {
    return res.status(404).json({
      success: false,
      message: `${resource} not found`,
    });
  }

  static unauthorized(res: Response) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - missing or invalid authentication token',
    });
  }

  static forbidden(res: Response, action = 'perform this action') {
    return res.status(403).json({
      success: false,
      message: `Forbidden - insufficient permissions to ${action}`,
    });
  }

  static handleCommonError(res: Response, error: any, operation = 'operation', statusCode = 500) {
    console.error(`Error during ${operation}:`, error);

    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map((key) => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value,
      }));
      return this.validationError(res, errors);
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        code: 11000,
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
      });
    }

    if (error.message && error.message.includes('timeout')) {
      return res.status(408).json({
        success: false,
        message: 'Request timeout - please try again',
      });
    }

    return this.error(res, `Error during ${operation}`, statusCode, error);
  }
}
