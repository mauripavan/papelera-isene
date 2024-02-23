import * as z from 'zod';

export const updatePriceForm = () =>
  z.object({
    increment: z
      .union([z.string(), z.number()])
      .transform(value => {
        if (typeof value === 'string') {
          return parseFloat(value);
        }
        return value;
      })
      .refine(
        value => {
          return typeof value === 'number' && !isNaN(value) && value > 0;
        },
        { message: 'Campo obligatorio' }
      ),
  });
