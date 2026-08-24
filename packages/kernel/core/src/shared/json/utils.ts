import { cloneAndFreezeJson as cloneAndFreezeFoundationJson } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 校验并复制 JSON-safe plain data，返回 detached deeply immutable value */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  try {
    return cloneAndFreezeFoundationJson(value, path);
  } catch (cause) {
    if (cause instanceof RetikzCoreError && cause.code === RetikzCoreErrorCode.Json) throw cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new RetikzCoreError(RetikzCoreErrorCode.Json, message, { cause });
  }
};

/** 比较两个 JSON-safe tree 的结构语义，不依赖对象属性插入顺序 */
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
