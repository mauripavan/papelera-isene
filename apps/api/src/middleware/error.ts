import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http.ts';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  // Violación de unique (ej. código de producto repetido)
  if (err?.code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con ese valor', details: err.meta });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
};
