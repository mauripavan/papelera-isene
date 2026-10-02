export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'No autorizado') => new HttpError(401, msg);
export const notFound = (msg = 'No encontrado') => new HttpError(404, msg);
export const conflict = (msg: string, details?: unknown) => new HttpError(409, msg, details);
export const unprocessable = (msg: string, details?: unknown) => new HttpError(422, msg, details);

/** Parsea un id numérico de la URL. */
export function parseId(raw: string | string[] | undefined): number {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Id inválido');
  return id;
}
