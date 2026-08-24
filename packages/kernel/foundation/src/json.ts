import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

const inspectPlainData = (value: unknown, path: string, shouldCloneJson: boolean): unknown => {
  const ancestors = new Set<object>();
  const fail = (currentPath: string, message: string, cause?: unknown): never => {
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Json,
      message,
      details: Object.freeze({ path: currentPath }),
      cause,
    });
  };
  const inspect = (input: unknown, currentPath: string): unknown => {
    if (!shouldCloneJson && (input === null || typeof input !== 'object')) return input;
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
        if (Object.getPrototypeOf(input) !== Array.prototype) {
          return fail(currentPath, `${currentPath} must contain only plain objects and arrays`, input);
        }
        const propertyNames = Object.getOwnPropertyNames(input);
        if (propertyNames.length !== input.length + 1) {
          return fail(currentPath, `${currentPath} must not contain sparse items or extra array properties`, input);
        }
        const output: Array<unknown> | undefined = shouldCloneJson ? [] : undefined;
        for (let index = 0; index < input.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
          if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            return fail(
              `${currentPath}[${index}]`,
              `${currentPath}[${index}] must be an enumerable JSON data item`,
              input,
            );
          }
          const inspected = inspect(descriptor.value, `${currentPath}[${index}]`);
          output?.push(inspected);
        }
        return output === undefined ? input : Object.freeze(output);
      }

      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail(currentPath, `${currentPath} must contain only plain objects and arrays`, input);
      }
      const output = shouldCloneJson ? (Object.create(null) as Record<string, unknown>) : undefined;
      for (const key of Object.getOwnPropertyNames(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          return fail(`${currentPath}.${key}`, `${currentPath}.${key} must be an enumerable JSON data property`, input);
        }
        const inspected = inspect(descriptor.value, `${currentPath}.${key}`);
        if (output !== undefined) output[key] = inspected;
      }
      return output === undefined ? input : Object.freeze(output);
    } finally {
      ancestors.delete(input);
    }
  };
  return inspect(value, path);
};

/**
 * 断言一棵外部数据树只使用普通对象、普通数组与安全属性描述符
 *
 * @remarks 叶子值域由调用方 schema 校验；本函数只在读取属性前排除原型对象、accessor、symbol、异常数组与循环引用
 * @param value 待检查的外部数据树
 * @param path 错误消息中用于定位根值的路径
 */
export const assertPlainDataContainers = (value: unknown, path = 'value'): void => {
  inspectPlainData(value, path, false);
};

/**
 * 校验 JSON 安全的普通数据，创建脱离原输入的深冻结副本
 *
 * @param value 待复制的 JSON 安全数据
 * @param path 错误消息中用于定位当前值的路径
 * @returns 与输入结构相同但不共享可变对象的深冻结副本
 */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  return inspectPlainData(value, path, true) as T;
};
