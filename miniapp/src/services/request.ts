import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/app-store';
import { getErrorMessage } from '@/utils/error';

// 开发环境默认指向本地后端；上线时改为已备案的 HTTPS 域名（如 https://your-domain.com/api）
const API_BASE_URL = 'http://127.0.0.1:3000/api';

interface ApiErrorPayload {
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    // 跨端（微信小程序/H5）经 Taro 转译后，Error 子类的原型链与 message 可能丢失，
    // 显式修复以保证 instanceof Error 判断正确、错误信息可读。
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

function getToken(): string | null {
  return useAppStore.getState().authToken;
}

export async function request<T>(path: string, options: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; data?: unknown } = {}): Promise<T> {
  const { method = 'GET', data } = options;
  const token = getToken();
  const header: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) header.Authorization = `Bearer ${token}`;

  let response: Taro.request.SuccessCallbackResult<ApiErrorPayload | T>;
  try {
    response = await Taro.request<ApiErrorPayload | T>({
      url: `${API_BASE_URL}${path}`,
      method,
      data,
      header,
    });
  } catch (error) {
    console.error('[API] 网络请求失败：', getErrorMessage(error));
    throw new ApiError('无法连接到服务，请确认网络或后端已启动。', 0);
  }

  const { statusCode, data: body } = response;

  // 仅当请求携带了 token 时返回 401，才是真正的「登录态失效」；
  // 登录/注册接口未携带 token，其 401 属于凭证错误，应走下方通用错误处理以展示后端 message。
  if (statusCode === 401 && token) {
    console.warn('[API] 登录态失效，跳转登录页');
    useAppStore.getState().logout();
    Taro.reLaunch({ url: '/pages/login/index' });
    throw new ApiError('登录状态已失效，请重新登录。', 401);
  }

  if (statusCode < 200 || statusCode >= 300) {
    const message = (body as ApiErrorPayload)?.message ?? '请求未完成，请稍后重试。';
    console.error(`[API] ${method} ${path} 失败（${statusCode}）：${message}`);
    throw new ApiError(message, statusCode);
  }

  if (statusCode === 204) return undefined as T;
  return body as T;
}

export { API_BASE_URL };
