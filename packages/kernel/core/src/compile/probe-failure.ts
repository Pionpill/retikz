import type { CompileOccurrenceLocator, LayoutChildFailure } from '../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../error';
import type { LayoutProbeRecoverableError } from '../resolve/diagnostics';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isLayoutProbeRecoverableError,
  registerFatalProbeError,
  safeErrorMessage,
} from '../resolve/diagnostics';
import { formatCompileOccurrence } from './artifact';

/** 创建 Core compile transaction 内部不可能状态错误 */
export const createCompileInvariantError = (message: string, options?: ErrorOptions): RetikzCoreError => {
  const error = new RetikzCoreError({
    code: RetikzCoreErrorCode.CompileInvariantViolation,
    message,
    details: Object.freeze({}),
    cause: options?.cause,
  });
  registerFatalProbeError(error);

  return error;
};

/** 单个 callback 的 failure owner identity */
export type LayoutProbeFailureOwner = Readonly<{
  /** 用于错误消息的回调所属者描述 */
  label: string;
}>;

/** compile-local WeakMap 保存的 opaque failure 快照 */
export type LayoutProbeFailureEntry = Readonly<{
  /** 创建失败凭证的回调身份，限制跨回调使用 */
  owner: LayoutProbeFailureOwner;
  /** 最接近失败位置的 provider 标识 */
  providerKey: string;
  /** 失败子项在原始 IR 中的路径 */
  sourcePath: string;
  /** 保留复合展开路径的完整失败位置 */
  occurrence: CompileOccurrenceLocator;
  /** 用于重新抛出时构造诊断的失败详情 */
  detail: string;
  /** 原始抛出值，作为最终错误的原因保留 */
  cause: unknown;
}> & {
  /** 该失败是否已被提升抛出，防止重复使用 */
  consumed: boolean;
};

/** 将 callback/provider 的 unknown throw 规范化为 recoverable Error，同时保留原始 cause */
export const normalizeLayoutProbeError = (thrown: unknown): LayoutProbeRecoverableError => {
  if (isLayoutProbeRecoverableError(thrown)) return thrown;
  const message = safeErrorMessage(thrown, 'Layout child compilation threw a non-Error value');
  return createLayoutProbeRecoverableError(message, { cause: thrown });
};

/** 为既有 recoverable error 补齐最深 dispatch occurrence，同时保留最具体 provider key 与 raw cause */
export const enrichLayoutProbeError = (
  error: LayoutProbeRecoverableError,
  providerKey: string,
  occurrence: CompileOccurrenceLocator,
): LayoutProbeRecoverableError => {
  const { detail, providerKey: errorProviderKey, occurrence: errorOccurrence } = error.details;
  const resolvedOccurrence =
    errorOccurrence !== undefined && errorOccurrence.expansionPath.length >= occurrence.expansionPath.length
      ? errorOccurrence
      : occurrence;
  if (errorOccurrence === resolvedOccurrence && errorProviderKey !== undefined) return error;

  const cause = Object.hasOwn(error, 'cause') ? error.cause : error;

  return createLayoutProbeRecoverableError(error.message, {
    cause,
    detail,
    providerKey: errorProviderKey ?? providerKey,
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
  const occurrence = error.details.occurrence ?? fallbackOccurrence;
  const providerKey = error.details.providerKey ?? fallbackProviderKey;
  const failure = Object.freeze({}) as LayoutChildFailure;
  failures.set(failure, {
    owner,
    providerKey,
    sourcePath: occurrence.sourcePath,
    occurrence: Object.freeze({
      sourcePath: occurrence.sourcePath,
      expansionPath: Object.freeze(occurrence.expansionPath.map(segment => Object.freeze({ ...segment }))),
    }),
    detail: error.details.detail,
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
    throw createCompositeContractError(`${owner.label} received an invalid or forged layout child failure`);
  }

  const entry = failures.get(failure);
  if (entry === undefined) {
    throw createCompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this compile or was forged`,
    );
  }

  if (entry.owner !== owner) {
    throw createCompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this composite callback`,
    );
  }

  if (entry.consumed) {
    throw createCompositeContractError(`${owner.label} received a layout child failure that was already raised`);
  }

  entry.consumed = true;
  throw createLayoutProbeRecoverableError(
    `Layout child provider '${entry.providerKey}' failed at ${entry.sourcePath} (${formatCompileOccurrence(entry.occurrence)}): ${entry.detail}`,
    { cause: entry.cause, detail: entry.detail, providerKey: entry.providerKey, occurrence: entry.occurrence },
  );
};
