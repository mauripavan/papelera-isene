import * as z from 'zod';

export const addProductForm = () =>
  z.object({
    description: z.string({ required_error: 'Campo obligatorio' }).min(5, {
      message: 'La descripción debe contener al menos 5 caracteres',
    }),
    quantity: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    cost: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    earningPI: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    earningPP: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    PI: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    PP: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value);
        },
        { message: 'Campo obligatorio' }
      ),
    stock: z.union([z.string(), z.boolean()]).transform(value => {
      if (typeof value === 'boolean') {
        return value;
      } else {
        if (value === 'true') {
          return true;
        } else {
          return false;
        }
      }
    }),
  });
