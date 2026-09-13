/**
 * 从任意异常对象中提取可读的错误信息。
 *
 * Taro 跨端（H5 / 微信小程序）经 Babel 转译后，`Error` 子类的原型链与
 * 非枚举的 `message` 可能丢失，导致 `err instanceof Error` 为 false、
 * `console.error(err)` 输出为 `{}`。因此这里不依赖 `instanceof`，直接按常见
 * 字段名兜底读取，保证错误信息始终可读。
 */
export function getErrorMessage(err: unknown, fallback = '操作失败，请稍后重试。'): string {
  if (err == null) return fallback;
  if (typeof err === 'string') return err.trim() || fallback;

  const obj = err as Record<string, unknown>;
  for (const key of ['message', 'errMsg', 'msg', 'error']) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return fallback;
}
