/**
 * Typed error hierarchy for the application.
 *
 * All application errors extend AppError and carry a `code` string that
 * IPC handlers can forward to the renderer for structured error handling.
 */

export class AppError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND');
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string) {
    super(message, 'EXTERNAL_SERVICE_ERROR');
  }
}