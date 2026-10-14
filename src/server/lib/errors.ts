export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 415,
    message: string,
    readonly issues?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Not found");
export const forbidden = () => new HttpError(403, "Forbidden");
