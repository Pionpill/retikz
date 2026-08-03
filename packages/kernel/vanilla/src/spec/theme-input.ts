import type { IRTheme } from '@retikz/core';

/** 复制可安全读取的普通对象 Theme，并保留伪造输入供 Core 严格诊断 */
export const cloneThemeInput = (theme: unknown): IRTheme => {
  if (theme === null || typeof theme !== 'object' || Array.isArray(theme)) return theme as IRTheme;
  const prototype = Object.getPrototypeOf(theme);
  if (prototype !== Object.prototype && prototype !== null) return theme;

  const output: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(theme)) {
    if (typeof key !== 'string') return theme;
    const descriptor = Object.getOwnPropertyDescriptor(theme, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !('value' in descriptor) ||
      descriptor.value === undefined
    ) {
      return theme;
    }
    Object.defineProperty(output, key, {
      value: descriptor.value,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  }
  return output;
};
