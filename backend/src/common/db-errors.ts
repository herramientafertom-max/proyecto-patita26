type PgErrorLike = { code?: string; constraint?: string };

function asPgError(error: unknown): PgErrorLike | null {
  return typeof error === 'object' && error !== null ? error : null;
}

export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  const pgError = asPgError(error);
  if (!pgError || pgError.code !== '23505') return false;
  return constraint ? pgError.constraint === constraint : true;
}

export function isForeignKeyViolation(
  error: unknown,
  constraint?: string,
): boolean {
  const pgError = asPgError(error);
  if (!pgError || pgError.code !== '23503') return false;
  return constraint ? pgError.constraint === constraint : true;
}
