import { appConfig } from "../config/app";

export class BackendApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "BackendApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function resolveBackendUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = appConfig.backend.baseUrl.replace(/\/+$/, "");
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${nextPath}`;
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function resolveErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const candidate =
      "message" in payload
        ? payload.message
        : "error" in payload
          ? payload.error
          : null;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  return fallback;
}

export async function backendRequest<T>(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), appConfig.backend.timeoutMs);
  const { signal, headers, ...rest } = init;

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    }
  }

  try {
    const response = await fetch(resolveBackendUrl(path), {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(appConfig.backend.apiKey ? { "x-api-key": appConfig.backend.apiKey } : {}),
        ...(headers ?? {}),
      },
    });

    if (response.status === 204) {
      return null as T;
    }

    const payload = await parseResponseBody(response);

    if (!response.ok) {
      throw new BackendApiError(
        resolveErrorMessage(payload, `Backend request failed with status ${response.status}.`),
        response.status,
        payload,
      );
    }

    return payload as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatBackendError(error: unknown, fallback: string) {
  if (error instanceof BackendApiError) {
    return error.message || fallback;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out. The backend did not respond.";
  }

  if (error instanceof TypeError) {
    return fallback;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return fallback;
}
