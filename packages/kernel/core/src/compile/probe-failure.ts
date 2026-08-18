import { RetikzError } from '@retikz/foundation';

import type { CompileOccurrenceLocator, LayoutChildFailure } from '../contract';

import { RetikzCoreErrorCode } from '../error';
import {
  isRetikzLayoutProbeRecoverableError,
  registerFatalProbeError,
  RetikzCompositeContractError,
  RetikzLayoutProbeRecoverableError,
  safeErrorMessage,
} from '../resolve/diagnostics';
import { formatCompileOccurrence } from './artifact';

/** Core compile transaction 内部不可能状态 */
export class RetikzCompileInvariantError extends RetikzError<
  typeof RetikzCoreErrorCode.CompileInvariantViolation,
  Readonly<Record<string, never>>
> {
  public constructor(message: string, options?: ErrorOptions) {
    super({
      code: RetikzCoreErrorCode.CompileInvariantViolation,
      message,
      details: Object.freeze({}),
      cause: options?.cause,
    });
    registerFatalProbeError(this);
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

/** 将 callback/provider 的 unknown throw 规范化为 recoverable Error，同时保留原始 cause */
export const normalizeLayoutProbeError = (thrown: unknown): RetikzLayoutProbeRecoverableError => {
  if (isRetikzLayoutProbeRecoverableError(thrown)) return thrown;
  const message = safeErrorMessage(thrown, 'Layout child compilation threw a non-Error value');
  return new RetikzLayoutProbeRecoverableError(message, { cause: thrown });
};

/** 为既有 recoverable error 补齐最深 dispatch occurrence，同时保留最具体 provider key 与 raw cause */
export const enrichLayoutProbeError = (
  error: RetikzLayoutProbeRecoverableError,
  providerKey: string,
  occurrence: CompileOccurrenceLocator,
): RetikzLayoutProbeRecoverableError => {
  const resolvedOccurrence =
    error.occurrence !== undefined && error.occurrence.expansionPath.length >= occurrence.expansionPath.length
      ? error.occurrence
      : occurrence;
  if (error.occurrence === resolvedOccurrence && error.providerKey !== undefined) return error;
  const cause = Object.hasOwn(error, 'cause') ? error.cause : error;
  return new RetikzLayoutProbeRecoverableError(error.message, {
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
  error: RetikzLayoutProbeRecoverableError,
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
    throw new RetikzCompositeContractError(`${owner.label} received an invalid or forged layout child failure`);
  }
  const entry = failures.get(failure);
  if (entry === undefined) {
    throw new RetikzCompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this compile or was forged`,
    );
  }
  if (entry.owner !== owner) {
    throw new RetikzCompositeContractError(
      `${owner.label} received a layout child failure that does not belong to this composite callback`,
    );
  }
  if (entry.consumed) {
    throw new RetikzCompositeContractError(`${owner.label} received a layout child failure that was already raised`);
  }
  entry.consumed = true;
  throw new RetikzLayoutProbeRecoverableError(
    `Layout child provider '${entry.providerKey}' failed at ${entry.sourcePath} (${formatCompileOccurrence(entry.occurrence)}): ${entry.detail}`,
    { cause: entry.cause, detail: entry.detail, providerKey: entry.providerKey, occurrence: entry.occurrence },
  );
};
