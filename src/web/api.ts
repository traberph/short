import { useCallback, useEffect, useState } from "react";
import type { ApiError } from "../shared/api-types.js";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function api<T = void>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`/~/api${path}`, {
    method,
    credentials: "same-origin",
    headers: body !== undefined && !isForm ? { "content-type": "application/json" } : undefined,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    const err = data as ApiError;
    throw new ApiRequestError(res.status, err.error ?? "Request failed", err.issues);
  }
  return data as T;
}

// Loads data on mount and whenever `path` changes; `reload` refetches, `set` updates locally.
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiRequestError | undefined>();

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>("GET", path));
      setError(undefined);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err : new ApiRequestError(0, String(err)));
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, reload, set: setData };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError && err.issues) {
    return Object.values(err.issues).flat().join(", ") || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
