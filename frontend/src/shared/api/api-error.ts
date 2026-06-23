export class ApiError extends Error {
  public readonly statusCode?: number;
  public readonly details?: unknown;

  public constructor(message: string, options?: { statusCode?: number; details?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.statusCode = options?.statusCode;
    this.details = options?.details;
  }
}
