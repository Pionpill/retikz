import { RetikzFoundationError, RetikzFoundationErrorCode } from './error';
import type { PropertyPath } from './types';

/** 按路径段内容与类型判断路径是否相等 */
export const isPropertyPathEqual = (left: PropertyPath, right: PropertyPath): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

/** 判断路径是否位于指定前缀内，包含前缀自身 */
export const hasPropertyPathPrefix = (path: PropertyPath, prefix: PropertyPath): boolean =>
  prefix.length <= path.length && prefix.every((segment, index) => segment === path[index]);

/** 按段排序，数字按数值比较，同前缀时祖先先于后代 */
export const comparePropertyPaths = (left: PropertyPath, right: PropertyPath): number => {
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const a = left[index];
    const b = right[index];
    if (a === b) continue;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a !== typeof b) return typeof a === 'number' ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return left.length - right.length;
};

/** 编码供 Map 索引使用的路径键，保留数字与字符串区别 */
export const encodePropertyPath = (path: PropertyPath): string => JSON.stringify(path);

/** 将路径格式化为可读属性访问表达式，空路径显示为根对象 */
export const formatPropertyPath = (path: PropertyPath): string => {
  let formatted = '';
  for (const segment of path) {
    if (typeof segment === 'number') formatted += `[${segment}]`;
    else if (/^[A-Za-z_$][\w$]*$/u.test(segment)) formatted += `${formatted.length === 0 ? '' : '.'}${segment}`;
    else formatted += `[${JSON.stringify(segment)}]`;
  }
  return formatted || '$';
};

/** 读取 JSON 对象的自身属性；路径类型不匹配或属性缺失时返回 undefined */
export const readPropertyPath = (root: unknown, path: PropertyPath): unknown => {
  let current = root;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      if (typeof segment !== 'number' || !Number.isSafeInteger(segment) || segment < 0) return undefined;
    } else if (typeof segment !== 'string') return undefined;
    if (!Object.hasOwn(current, segment)) return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
};

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

/**
 * 递归比较两棵 JSON 数据树的结构和值
 * @description 对象属性顺序不影响结果，数组按顺序比较，标量使用 Object.is，因此 0 与 -0 不相等；不修改输入
 * @remarks 调用方负责保证输入为合法 JSON 数据树；不执行合法性校验，不支持循环引用、Date、Map 或 class 实例
 * @param left 左侧 JSON 数据树
 * @param right 右侧 JSON 数据树
 * @returns 两侧结构和值是否相同
 */
export const jsonStructuralEquals = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;

    for (let index = 0; index < left.length; index += 1) {
      if (!Object.hasOwn(left, index) || !Object.hasOwn(right, index)) return false;
      if (!jsonStructuralEquals(left[index], right[index])) return false;
    }

    return true;
  }

  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      key => Object.hasOwn(right, key) && jsonStructuralEquals(Reflect.get(left, key), Reflect.get(right, key)),
    )
  );
};
