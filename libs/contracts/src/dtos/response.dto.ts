/** Interface representing data constraints for  api response. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  correlationId?: string;
  timestamp: string;
}

export function successResponse<T>(
  data: T,
  message?: string,
  correlationId?: string,
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

export function errorResponse(message: string, correlationId?: string): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}
