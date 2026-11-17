import { API_BASE_URL, API_TIMEOUT_MS } from '@/constants/api';
import type { ErrorResponse } from '@/types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class ConnectionError extends Error {
  constructor() {
    super('Could not reach the server');
    this.name = 'ConnectionError';
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ConnectionError();
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readBody(response);

  if (!response.ok) {
    throw toApiError(payload, response.status);
  }

  return payload as T;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(payload: unknown, status: number): ApiError {
  if (payload && typeof payload === 'object') {
    const body = payload as ErrorResponse;
    const message =
      typeof body.message === 'string' && body.message.length > 0
        ? body.message
        : `Request failed (${status})`;
    const details = Array.isArray(body.details)
      ? body.details.filter((item): item is string => typeof item === 'string')
      : [];
    return new ApiError(message, status, details);
  }

  return new ApiError(`Request failed (${status})`, status);
}
