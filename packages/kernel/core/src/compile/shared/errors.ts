import type { CompileOccurrenceLocator } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { LayoutProbeRecoverableError } from '../../resolve/diagnostics';
import {
  createLayoutProbeRecoverableError,
  isLayoutProbeRecoverableError,
  registerFatalProbeError,
  safeErrorMessage,
} from '../../resolve/diagnostics';

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

/** 将 callback/provider 的 unknown throw 规范化为 recoverable Error，同时保留原始 cause */
export const wrapLayoutProbeError = (thrown: unknown): LayoutProbeRecoverableError => {
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
