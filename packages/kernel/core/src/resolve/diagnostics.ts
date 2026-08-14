import type { CompileOccurrenceLocator } from '../contract';

const layoutProbeRecoverableErrors = new WeakSet<object>();
const compositeContractErrors = new WeakSet<object>();
const additionalFatalProbeErrors = new WeakSet<object>();

/** layout probe 内可被 solver 丢弃或选中提升的 candidate failure */
export class LayoutProbeRecoverableError extends Error {
  /** 不包含 provider / occurrence 外壳的稳定原始诊断详情 */
  readonly detail: string;

  /** 最近失败点的 provider / composite key */
  readonly providerKey?: string;

  /** 最近失败点的 canonical occurrence */
  readonly occurrence?: CompileOccurrenceLocator;

  public constructor(
    message: string,
    options: ErrorOptions &
      Readonly<{ detail?: string; providerKey?: string; occurrence?: CompileOccurrenceLocator }> = {},
  ) {
    super(message, options);
    this.name = 'LayoutProbeRecoverableError';
    this.detail = options.detail ?? message;
    this.providerKey = options.providerKey;
    this.occurrence = options.occurrence;
    layoutProbeRecoverableErrors.add(this);
  }
}

/** author callback、provider output 或 opaque handle 违反公开 Composite contract */
export class CompositeContractError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CompositeContractError';
    compositeContractErrors.add(this);
  }
}

/** 通过模块私有 identity brand 判断 recoverable error，不读取 unknown value */
export const isLayoutProbeRecoverableError = (error: unknown): error is LayoutProbeRecoverableError =>
  error !== null && typeof error === 'object' && layoutProbeRecoverableErrors.has(error);

/** 通过模块私有 identity brand 判断 public contract error，不读取 unknown value */
export const isCompositeContractError = (error: unknown): error is CompositeContractError =>
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
