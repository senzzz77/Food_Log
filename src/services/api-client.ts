const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3000/api";

interface ApiErrorPayload { message?: string }

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  // 仅在带请求体时才设置 Content-Type，避免 DELETE 等无 body 请求被 Fastify 当作空 JSON 解析而报错。
  if (options.body !== undefined && options.body !== null) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError("无法连接到本地服务，请确认 API 已启动。", 0);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(payload.message ?? "请求未完成，请稍后重试。", response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiFormRequest<T>(path: string, form: FormData, token: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", body: form, headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError("无法连接到本地服务，请确认 API 已启动。", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(payload.message ?? "上传未完成，请稍后重试。", response.status);
  }
  return response.json() as Promise<T>;
}

export async function apiBlobRequest(path: string, token: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError("无法连接到本地服务，请确认 API 已启动。", 0);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiError(payload.message ?? "无法读取图片。", response.status);
  }
  return response.blob();
}
