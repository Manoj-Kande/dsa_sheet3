// Deduplicates in-flight GET requests with the same URL
const inFlight = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "ApiError"; }
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const isGet = !options?.method || options.method === "GET";

  if (isGet && inFlight.has(url)) return inFlight.get(url) as Promise<T>;

  const promise = (async () => {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    const json = await res.json();
    if (!res.ok) throw new ApiError(json?.error?.code ?? "UNKNOWN", json?.error?.message ?? "Request failed");
    return json.data as T;
  })();

  if (isGet) {
    inFlight.set(url, promise);
    promise.finally(() => inFlight.delete(url));
  }

  return promise;
}
