// Deprecated - use ResponseFormatter instead
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, any>;
}

export class ResponseUtil {
  static success<T>(
    data: T,
    message = 'Operation successful',
    meta?: Record<string, any>,
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      ...(meta && { meta }),
    };
  }

  static error(message: string, data?: any): ApiResponse {
    return {
      success: false,
      message,
      ...(data && { data }),
    };
  }
}
