import { getConfig } from "./template";

const API_URL = getConfig((config) => config.template.apiUrl);

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  if (!API_URL) throw new Error("Missing template.apiUrl in app-config.json");
  const url = joinUrl(API_URL, path);
  const response = await fetch(url, options);
  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as any).error)
        : `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function requestWithFallback<T>(
  path: string,
  fallbackValue: T
): Promise<T> {
  try {
    return await request<T>(path);
  } catch (error) {
    console.warn(
      "An error occurred while fetching data. Falling back to default value!"
    );
    console.warn({ path, error, fallbackValue });
    return fallbackValue;
  }
}

export async function requestWithPost<P, T>(
  path: string,
  payload: P
): Promise<T> {
  return await request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function requestWithAuth<T>(
  path: string,
  accessToken: string,
  options?: RequestInit
): Promise<T> {
  return await request<T>(path, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      access_token: accessToken,
    },
  });
}
