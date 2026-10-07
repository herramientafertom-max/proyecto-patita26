import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidRut } from './rut.util';

export function IsRut(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRut',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isValidRut(value);
        },
        defaultMessage(): string {
          return 'El RUT no es válido (debe incluir dígito verificador correcto).';
        },
      },
    });
  };
}
