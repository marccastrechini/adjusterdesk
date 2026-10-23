export function rethrowIfNavigationError(error: unknown): void {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return;
  }

  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== "string") {
    return;
  }

  if (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  ) {
    throw error;
  }
}
