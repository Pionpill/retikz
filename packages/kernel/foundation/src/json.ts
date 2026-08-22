import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

/**
 * 校验 JSON 安全的普通数据，创建脱离原输入的深冻结副本
 *
 * @param value 待复制的 JSON 安全数据
 * @param path 错误消息中用于定位当前值的路径
 * @returns 与输入结构相同但不共享可变对象的深冻结副本
 */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  const ancestors = new Set<object>();
  const fail = (currentPath: string, message: string, cause?: unknown): never => {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Json,
      message,
      details: Object.freeze({ path: currentPath }),
      cause,
    });
  };
  const clone = (input: unknown, currentPath: string): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) {
        return fail(currentPath, `${currentPath} must contain only finite JSON numbers`, input);
      }
      return input;
    }
    if (typeof input !== 'object') return fail(currentPath, `${currentPath} must be JSON-safe plain data`, input);
    if (ancestors.has(input)) return fail(currentPath, `${currentPath} must not contain cyclic references`, input);
    if (Object.getOwnPropertySymbols(input).length > 0) {
      return fail(currentPath, `${currentPath} must not contain symbol keys`, input);
    }

    ancestors.add(input);
    try {
      if (Array.isArray(input)) {
        const propertyNames = Object.getOwnPropertyNames(input);
        if (propertyNames.length !== input.length + 1) {
          return fail(currentPath, `${currentPath} must not contain sparse items or extra array properties`, input);
        }
        const output: Array<unknown> = [];
        for (let index = 0; index < input.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
          if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            return fail(
              `${currentPath}[${index}]`,
              `${currentPath}[${index}] must be an enumerable JSON data item`,
              input,
            );
          }
          output.push(clone(descriptor.value, `${currentPath}[${index}]`));
        }
        return Object.freeze(output);
      }

      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(currentPath, `${currentPath} must contain only plain objects and arrays`, input);
      }
      const output = Object.create(null) as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          return fail(`${currentPath}.${key}`, `${currentPath}.${key} must be an enumerable JSON data property`, input);
        }
        output[key] = clone(descriptor.value, `${currentPath}.${key}`);
      }
      return Object.freeze(output);
    } finally {
      ancestors.delete(input);
    }
  };
  return clone(value, path) as T;
};
