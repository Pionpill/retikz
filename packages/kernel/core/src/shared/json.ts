import { cloneAndFreezeJson as cloneAndFreezeFoundationJson } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

/**
 * 校验并复制 JSON-safe plain data，返回 detached deeply immutable value
 * @template T 要校验、复制并冻结的 JSON 值类型
 */
export const cloneAndFreezeJson = <T>(value: T, path = 'value'): T => {
  try {
    return cloneAndFreezeFoundationJson(value, path);
  } catch (cause) {
    if (cause instanceof RetikzCoreError && cause.code === RetikzCoreErrorCode.Json) throw cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new RetikzCoreError(RetikzCoreErrorCode.Json, message, { cause });
  }
};
