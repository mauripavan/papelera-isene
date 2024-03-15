import * as z from 'zod';

export const signupForm = () =>
  z
    .object({
      name: z.string({ required_error: 'Campo obligatorio' }),
      email: z
        .string({ required_error: 'Campo obligatorio' })
        .email({ message: 'Ingresar formato de mail valido' }),
      password: z.string().min(6).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/),
      confirm_password: z.string(),
    })
    .refine(data => data.password === data.confirm_password, {
      message: 'Las contraseñas no coinciden',
      path: ['confirm_password'],
    });
