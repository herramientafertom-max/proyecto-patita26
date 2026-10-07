import { registerDecorator, ValidationOptions } from 'class-validator';

const EAN_PATTERN = /^\d{6,14}$/;

/** Valida códigos de barra numéricos (EAN-8/12/13/14 y variantes intermedias). */
export function IsEan(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEan',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && EAN_PATTERN.test(value);
        },
        defaultMessage(): string {
          return 'El EAN debe ser numérico, entre 6 y 14 dígitos.';
        },
      },
    });
  };
}
