import { isRetainedRenderError, RetainedRenderError, RetainedRenderErrorCode } from '@retikz/render/runtime';

import type { RetainedVanillaUpdateOptions } from './types';

const invalidUpdateOptions = (cause: unknown): never => {
  throw new RetainedRenderError({
    code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message: 'Vanilla retained update options must be closed plain-data records and cannot change Canvas DPR',
  });
};

const isPlainRecord = (value: unknown): value is Record<PropertyKey, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** 校验普通对象只含允许的可枚举 data properties */
const assertClosedRecord: (
  value: unknown,
  allowedKeys: ReadonlySet<string>,
) => asserts value is Record<string, unknown> = (value, allowedKeys) => {
  if (!isPlainRecord(value)) return invalidUpdateOptions(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== 'string' ||
      !allowedKeys.has(key) ||
      descriptor === undefined ||
      !descriptor.enumerable ||
      !('value' in descriptor)
    ) {
      invalidUpdateOptions(value);
    }
  }
};

/** 复制 dense data-property 数组并拒绝 accessor、symbol、extra key 与 sparse slot */
const cloneArray = (value: ReadonlyArray<unknown>, ancestors: WeakSet<object>): ReadonlyArray<unknown> => {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || keys.some(key => typeof key !== 'string')) {
    return invalidUpdateOptions(value);
  }
  const copy: Array<unknown> = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      return invalidUpdateOptions(value);
    }
    copy.push(cloneAndFreeze(descriptor.value, ancestors));
  }
  return Object.freeze(copy);
};

/** 复制并冻结 update options 的 plain-data 容器，保留 callback 与非普通对象 identity */
const cloneAndFreeze = <T>(value: T, ancestors = new WeakSet<object>()): T => {
  if (typeof value !== 'object' || value === null) return value;
  if (!Array.isArray(value) && !isPlainRecord(value)) return value;
  if (ancestors.has(value)) return invalidUpdateOptions(value);
  ancestors.add(value);
  let copy: unknown;
  if (Array.isArray(value)) copy = cloneArray(value, ancestors);
  else {
    const record = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>;
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        return invalidUpdateOptions(value);
      }
      Object.defineProperty(record, key, {
        value: cloneAndFreeze(descriptor.value, ancestors),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    copy = record;
  }
  ancestors.delete(value);
  return Object.freeze(copy) as T;
};

/** 校验并捕获 retained update 可变配置，避免后续 hydrate 读取用户可变别名 */
export const captureRetainedUpdateOptions = (input: unknown): RetainedVanillaUpdateOptions => {
  try {
    assertClosedRecord(input, new Set(['animation', 'canvas']));
    const animation = input.animation;
    const canvas = input.canvas;
    if (animation !== undefined) assertClosedRecord(animation, new Set(['enabled', 'snapshotAt', 'easings']));
    if (canvas !== undefined) assertClosedRecord(canvas, new Set(['animationProperties']));
    return cloneAndFreeze(input);
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    return invalidUpdateOptions(cause);
  }
};
