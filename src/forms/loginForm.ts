import * as z from 'zod';

export const loginForm = () =>
  z.object({
    email: z
      .string({ required_error: 'Campo obligatorio' })
      .email({ message: 'Ingresar formato de mail valido' }),
    password: z
      .string({ required_error: 'Campo obligatorio' })
      .min(6, { message: 'Ingrese al menos 6 caracteres' }),
  });
