import { isValidRut, normalizeRut, parseRut } from './rut.util';

describe('rut.util', () => {
  it('normaliza un RUT con puntos y guion a su forma canónica', () => {
    expect(normalizeRut('12.345.678-5')).toBe('123456785');
  });

  it('valida y normaliza un RUT real terminado en K', () => {
    expect(isValidRut('6.000.000-k')).toBe(true);
    expect(normalizeRut('6.000.000-k')).toBe('6000000K');
  });

  it('no elimina la K al limpiar puntos y espacios (a diferencia del legacy)', () => {
    expect(parseRut(' 6.000.000-K ')).toEqual({ cuerpo: '6000000', dv: 'K' });
  });

  it('rechaza un dígito verificador incorrecto', () => {
    expect(isValidRut('12345678-0')).toBe(false);
    expect(() => normalizeRut('12345678-0')).toThrow();
  });

  it('rechaza cuerpos demasiado cortos o demasiado largos', () => {
    expect(parseRut('123456-7')).toBeNull();
    expect(parseRut('123456789-5')).toBeNull();
  });

  it('rechaza entradas vacías o basura', () => {
    expect(parseRut('')).toBeNull();
    expect(parseRut('no-es-un-rut')).toBeNull();
  });
});
