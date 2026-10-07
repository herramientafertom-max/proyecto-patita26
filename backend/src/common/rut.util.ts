export type ParsedRut = { cuerpo: string; dv: string };

function computeDv(cuerpo: string): string {
  let sum = 0;
  let multiplier = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    sum += Number(cuerpo[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Separa cuerpo y dígito verificador de un RUT en cualquier formato de entrada
 * (con o sin puntos/guion). Nunca elimina la K: solo remueve puntos, espacios y guion.
 */
export function parseRut(raw: string): ParsedRut | null {
  if (!raw) return null;
  const cleaned = raw
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[.\s]/g, '')
    .replace(/-/g, '');
  const match = /^(\d{7,8})(\d|K)$/.exec(cleaned);
  if (!match) return null;
  return { cuerpo: match[1], dv: match[2] };
}

export function isValidRut(raw: string): boolean {
  const parsed = parseRut(raw);
  if (!parsed) return false;
  return computeDv(parsed.cuerpo) === parsed.dv;
}

/**
 * Valida y normaliza un RUT a su forma canónica "cuerpodv" (sin puntos ni guion),
 * verificando el dígito verificador. Lanza si el formato o el dígito son inválidos.
 */
export function normalizeRut(raw: string): string {
  const parsed = parseRut(raw);
  if (!parsed)
    throw new Error('El RUT debe tener 7 u 8 dígitos y un dígito verificador.');
  const expectedDv = computeDv(parsed.cuerpo);
  if (expectedDv !== parsed.dv) {
    throw new Error('El dígito verificador del RUT no es válido.');
  }
  return `${parsed.cuerpo}${expectedDv}`;
}
