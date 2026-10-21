import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';

/** 在一次调用内校验容器并按需复制，错误路径只在失败时组装 */
const inspectPlainData = (value: unknown, path: string, shouldCloneJson: boolean): unknown => {
  const ancestors = new Set<object>();
  const pathSegments: Array<string | number> = [];

  const fail = (reason: string, cause?: unknown): never => {
    let currentPath = path;
    for (const segment of pathSegments) {
      currentPath += typeof segment === 'number' ? `[${segment}]` : `.${segment}`;
    }
    throw new RetikzFoundationError({
      code: RetikzFoundationErrorCode.Json,
      message: `${currentPath} ${reason}`,
      details: Object.freeze({ path: currentPath }),
      cause,
    });
  };

  const inspect = (input: unknown): unknown => {
    if (!shouldCloneJson && (input === null || typeof input !== 'object')) return input;
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) {
        return fail('must contain only finite JSON numbers', input);
      }

      return input;
    }

    if (typeof input !== 'object') return fail('must be JSON-safe plain data', input);
    if (ancestors.has(input)) return fail('must not contain cyclic references', input);
    if (Object.getOwnPropertySymbols(input).length > 0) {
      return fail('must not contain symbol keys', input);
    }

    // 只有继续进入子容器时，当前节点才需要参与后代的循环检测
    let tracksChildren = false;

    try {
      if (Array.isArray(input)) {
        if (Object.getPrototypeOf(input) !== Array.prototype) {
          return fail('must contain only plain objects and arrays', input);
        }

        const propertyNames = Object.getOwnPropertyNames(input);
        if (propertyNames.length !== input.length + 1) {
          return fail('must not contain sparse items or extra array properties', input);
        }

        const output: Array<unknown> | undefined = shouldCloneJson ? [] : undefined;

        for (let index = 0; index < input.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
          if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            pathSegments.push(index);
            return fail('must be an enumerable JSON data item', input);
          }

          let inspected: unknown = descriptor.value;
          // 合法标量直接复制；容器或非法叶子才需要路径与递归检查
          if (
            inspected !== null &&
            (typeof inspected === 'object' ||
              (shouldCloneJson &&
                typeof inspected !== 'string' &&
                typeof inspected !== 'boolean' &&
                !(typeof inspected === 'number' && Number.isFinite(inspected))))
          ) {
            pathSegments.push(index);
            if (typeof inspected === 'object' && !tracksChildren) {
              ancestors.add(input);
              tracksChildren = true;
            }
            inspected = inspect(inspected);
            pathSegments.pop();
          }
          output?.push(inspected);
        }

        return output === undefined ? input : Object.freeze(output);
      }

      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        return fail('must contain only plain objects and arrays', input);
      }

      // 写入前移除原型，保留 null 原型语义，同时允许 V8 使用快速属性存储
      const output = shouldCloneJson ? (Object.setPrototypeOf({}, null) as Record<string, unknown>) : undefined;

      for (const key of Object.getOwnPropertyNames(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          pathSegments.push(key);
          return fail('must be an enumerable JSON data property', input);
        }

        let inspected: unknown = descriptor.value;
        if (
          inspected !== null &&
          (typeof inspected === 'object' ||
            (shouldCloneJson &&
              typeof inspected !== 'string' &&
              typeof inspected !== 'boolean' &&
              !(typeof inspected === 'number' && Number.isFinite(inspected))))
        ) {
          pathSegments.push(key);
          if (typeof inspected === 'object' && !tracksChildren) {
            ancestors.add(input);
            tracksChildren = true;
          }
          inspected = inspect(inspected);
          pathSegments.pop();
        }
        if (output !== undefined) output[key] = inspected;
      }

      return output === undefined ? input : Object.freeze(output);
    } finally {
      if (tracksChildren) ancestors.delete(input);
    }
  };

  return inspect(value);
};

/**
 * 断言一棵外部数据树只使用普通对象、普通数组与安全属性描述符
 *
 * @remarks 叶子值域由调用方 schema 校验；本函数只在读取属性前排除原型对象、accessor、symbol、异常数组与循环引用
 * @param value 待检查的外部数据树
 * @param path 错误消息中用于定位根值的路径，默认 'value'
 */
export const assertPlainDataContainers = (value: unknown, path = 'value'): void => {
  inspectPlainData(value, path, false);
};

/**
 * 校验 JSON 安全的普通数据，创建脱离原输入的深冻结副本
 *
 * @param value 待复制的 JSON 安全数据
 * @param path 错误消息中用于定位当前值的路径，默认 'value'
 * @returns 与输入结构相同但不共享可变对象的深冻结副本
 * @template T 输入值的静态类型
 */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  return inspectPlainData(value, path, true) as T;
};
