import type { LayoutChildFailure } from '../contract';
import type { CompileOccurrenceLocator } from './types';

import { formatCompileOccurrence } from './artifact';

const layoutProbeRecoverableErrors = new WeakSet<object>();
const compositeContractErrors = new WeakSet<object>();
const compileInvariantErrors = new WeakSet<object>();

/** layout probe 内可被 solver 丢弃或选择提升的 candidate failure */
export class LayoutProbeRecoverableError extends Error {
  /** 不包含 provider / occurrence 外壳的稳定原始诊断详情 */
  readonly detail: string;

  /** 最接近失败点的 provider / composite key */
  readonly providerKey?: string;

  /** 最接近失败点的 canonical occurrence */
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

/** Core compile transaction 内部不可能状态 */
export class CompileInvariantError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CompileInvariantError';
    compileInvariantErrors.add(this);
  }
}

/** 单个 callback 的 failure owner identity */
export type LayoutProbeFailureOwner = Readonly<{ label: string }>;

/** compile-local WeakMap 保存的 opaque failure 快照 */
export type LayoutProbeFailureEntry = Readonly<{
  owner: LayoutProbeFailureOwner;
  providerKey: string;
  sourcePath: string;
  occurrence: CompileOccurrenceLocator;
  detail: string;
  cause: unknown;
}> & { consumed: boolean };

/** 通过模块私有 identity brand 判断 recoverable error，不读取 unknown value */
export const isLayoutProbeRecoverableError = (error: unknown): error is LayoutProbeRecoverableError =>
  error !== null && typeof error === 'object' && layoutProbeRecoverableErrors.has(error);

/** 通过模块私有 identity brand 判断 public contract error，不读取 unknown value */
export const isCompositeContractError = (error: unknown): error is CompositeContractError =>
  error !== null && typeof error === 'object' && compositeContractErrors.has(error);

/** 判断 catch boundary 必须立即穿透的 fatal error，不触发 hostile Proxy trap */
export const isFatalProbeError = (error: unknown): error is CompositeContractError | CompileInvariantError =>
  error !== null &&
  typeof error === 'object' &&
  (compositeContractErrors.has(error) || compileInvariantErrors.has(error));

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
const inspectOrdinaryError = (thrown: unknown): Readonly<{ ordinary: boolean; message?: string }> => {
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
  const inspected = inspectOrdinaryError(thrown);
  return inspected.message ?? fallback;
};

/** 安全描述任意 thrown value，hostile object 无法二次打断 catch boundary */
export const safeThrownDetail = (thrown: unknown, fallback = 'unknown thrown value'): string => {
  const inspected = inspectOrdinaryError(thrown);
  if (inspected.ordinary) return inspected.message ?? fallback;
  if (thrown !== null && (typeof thrown === 'object' || typeof thrown === 'function')) return fallback;
  try {
    return String(thrown);
  } catch {
    return fallback;
  }
};

/** 把 callback/provider 的 unknown throw 规范化为 recoverable Error，同时保留原始 cause */
export const normalizeLayoutProbeError = (thrown: unknown): LayoutProbeRecoverableError => {
  if (isLayoutProbeRecoverableError(thrown)) return thrown;
  const message = safeErrorMessage(thrown, 'Layout child compilation threw a non-Error value');
  return new LayoutProbeRecoverableError(message, { cause: thrown });
};

/** 为既有 recoverable error 补齐最深 dispatch occurrence，同时保留最具体 provider key 与 raw cause */
export const enrichLayoutProbeError = (
  error: LayoutProbeRecoverableError,
  providerKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutProbeRecoverableError => {
  const resolvedOccurrence =
    error.occurrence !== undefined && error.occurrence.expansionPath.length >= occurrence.expansionPath.length
      ? error.occurrence
      : occurrence;
  if (error.occurrence === resolvedOccurrence && error.providerKey !== undefined) return error;
  const cause = Object.hasOwn(error, 'cause') ? error.cause : error;
  return new LayoutProbeRecoverableError(error.message, {
    cause,
    detail: error.detail,
    providerKey: error.providerKey ?? providerKey,
    occurrence: resolvedOccurrence,
  });
};

/** 创建 public opaque failure，并在 compile-local owner table 中快照诊断信息 */
export const createLayoutChildFailure = (
  failures: WeakMap<object, LayoutProbeFailureEntry>,
  owner: LayoutProbeFailureOwner,
  error: LayoutProbeRecoverableError,
  fallbackProviderKey: string,
  fallbackOccurrence: CompileOccurrenceLocator,
): LayoutChildFailure => {
  const occurrence = error.occurrence ?? fallbackOccurrence;
  const providerKey = error.providerKey ?? fallbackProviderKey;
  const failure = Object.freeze({}) as LayoutChildFailure;
  failures.set(failure, {
    owner,
    providerKey,
    sourcePath: occurrence.sourcePath,
    occurrence: Object.freeze({
      sourcePath: occurrence.sourcePath,
      expansionPath: Object.freeze(occurrence.expansionPath.map(segment => Object.freeze({ ...segment }))),
    }),
    detail: error.detail,
    cause: Object.hasOwn(error, 'cause') ? error.cause : error,
    consumed: false,
  });
  return failure;
};

/** 校验 callback/compile owner 后提升被 solver 选中的 failure */
export const raiseLayoutChildFailure = (
  failures: WeakMap<object, LayoutProbeFailureEntry>,
  owner: LayoutProbeFailureOwner,
  failure: unknown,
): never => {
  if (failure === null || typeof failure !== 'object') {
    throw new CompositeContractError(`${owner.label} received an invalid or forged layout child failure`);
  }
  const entry = failures.get(failure);
  if (entry === undefined) {
    throw new CompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this compile or was forged`,
    );
  }
  if (entry.owner !== owner) {
    throw new CompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this composite callback`,
    );
  }
  if (entry.consumed) {
    throw new CompositeContractError(`${owner.label} received a layout child failure that was already raised`);
  }
  entry.consumed = true;
  throw new LayoutProbeRecoverableError(
    `Layout child provider '${entry.providerKey}' failed at ${entry.sourcePath} (${formatCompileOccurrence(entry.occurrence)}): ${entry.detail}`,
    { cause: entry.cause, detail: entry.detail, providerKey: entry.providerKey, occurrence: entry.occurrence },
  );
};
