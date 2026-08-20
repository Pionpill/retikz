import type { CompileOccurrenceLocator } from '../contract';

import { RetikzCoreError, RetikzCoreErrorCode } from '../error';

const layoutProbeRecoverableErrors = new WeakSet<object>();
const compositeContractErrors = new WeakSet<object>();
const additionalFatalProbeErrors = new WeakSet<object>();

type LayoutProbeErrorDetails = Readonly<{
  detail: string;
  providerKey?: string;
  occurrence?: CompileOccurrenceLocator;
}>;

/** layout probe 内可被 solver 丢弃或选中提升的 candidate failure */
export type LayoutProbeRecoverableError = RetikzCoreError<
  typeof RetikzCoreErrorCode.LayoutProbeRecoverable,
  LayoutProbeErrorDetails
>;

/** 创建 layout probe 可恢复错误并记录私有 identity */
export const createLayoutProbeRecoverableError = (
  message: string,
  options: ErrorOptions &
    Readonly<{ detail?: string; providerKey?: string; occurrence?: CompileOccurrenceLocator }> = {},
): LayoutProbeRecoverableError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.LayoutProbeRecoverable,
    message,
    details: {
      detail: options.detail ?? message,
      ...(options.providerKey === undefined ? {} : { providerKey: options.providerKey }),
      ...(options.occurrence === undefined ? {} : { occurrence: options.occurrence }),
    },
    cause: options.cause,
  });
  layoutProbeRecoverableErrors.add(error);
  return error;
};

/** 创建公开 Composite contract 违反错误并记录 fatal identity */
export const createCompositeContractError = (message: string, options?: ErrorOptions): RetikzCoreError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.CompositeContractViolation,
    message,
    details: Object.freeze({}),
    cause: options?.cause,
  });
  compositeContractErrors.add(error);
  return error;
};

/** 通过模块私有 identity brand 判断 recoverable error，不读取 unknown value */
export const isLayoutProbeRecoverableError = (error: unknown): error is LayoutProbeRecoverableError =>
  error !== null && typeof error === 'object' && layoutProbeRecoverableErrors.has(error);

/** 通过模块私有 identity brand 判断 public contract error，不读取 unknown value */
export const isCompositeContractError = (error: unknown): error is RetikzCoreError =>
  error !== null && typeof error === 'object' && compositeContractErrors.has(error);

/** 注册必须穿透 layout probe recoverable boundary 的领域错误 */
export const registerFatalProbeError = (error: object): void => {
  additionalFatalProbeErrors.add(error);
};

/** 判断 catch boundary 必须立即穿透的 fatal error，不触发 hostile Proxy trap */
export const isFatalProbeError = (error: unknown): error is Error =>
  error !== null &&
  typeof error === 'object' &&
  (compositeContractErrors.has(error) || additionalFatalProbeErrors.has(error));

/** 安全判断 ordinary Error identity，任何 prototype trap 都视为非 Error */
const isOrdinaryError = (value: unknown): value is Error => {
  if (value === null || typeof value !== 'object') return false;
  const visited = new WeakSet<object>();
  try {
    let prototype: object | null = value;
    while (prototype !== null) {
      if (visited.has(prototype)) return false;
      visited.add(prototype);
      prototype = Object.getPrototypeOf(prototype);
      if (prototype === Error.prototype) return true;
    }
  } catch {
    return false;
  }
  return false;
};

/** 单次安全读取 ordinary Error identity 与 message */
const readOrdinaryError = (thrown: unknown): Readonly<{ ordinary: boolean; message?: string }> => {
  if (!isOrdinaryError(thrown)) return { ordinary: false };
  try {
    const message = Reflect.get(thrown, 'message');
    return typeof message === 'string' ? { ordinary: true, message } : { ordinary: true };
  } catch {
    return { ordinary: true };
  }
};

/** 安全读取 ordinary Error message，读取失败时返回 fallback */
export const safeErrorMessage = (thrown: unknown, fallback: string): string => {
  const inspected = readOrdinaryError(thrown);
  return inspected.message ?? fallback;
};

/** 安全描述任意 thrown value，hostile object 无法二次打断 catch boundary */
export const safeThrownDetail = (thrown: unknown, fallback = 'unknown thrown value'): string => {
  const inspected = readOrdinaryError(thrown);
  if (inspected.ordinary) return inspected.message ?? fallback;
  if (thrown !== null && (typeof thrown === 'object' || typeof thrown === 'function')) return fallback;
  try {
    return String(thrown);
  } catch {
    return fallback;
  }
};
