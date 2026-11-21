export class QuickBooksError extends Error {
  readonly code?: string;
  readonly status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "QuickBooksError";
    this.code = code;
    this.status = status;
  }
}

export function isQuickBooksNotFound(error: unknown) {
  return error instanceof QuickBooksError && (error.status === 404 || error.code === "610");
}
