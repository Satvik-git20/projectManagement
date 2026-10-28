export async function apiFetch<T>(
  url: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json: body, ...rest } = init ?? {};

  const response = await fetch(url, {
    ...rest,
    method: rest.method ?? (body !== undefined ? "POST" : "GET"),
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...rest.headers,
    },
    body: body !== undefined ? JSON.stringify(body) : rest.body,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
