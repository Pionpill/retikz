import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator, LayoutChildFailure } from '../../../contract';
import type { LayoutProbeRecoverableError } from '../../../resolve/diagnostics';
import { createCompositeContractError, createLayoutProbeRecoverableError } from '../../../resolve/diagnostics';
import type { LayoutProbeFailureEntry } from '../../context';
import { formatCompileOccurrence } from '../../shared';

/** 单个 callback 的 failure owner identity */
type LayoutProbeFailureOwner = Readonly<{
  /** 用于错误消息的回调所属者描述 */
  label: string;
}>;

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
    `Layout child provider '${entry.providerKey}' failed at ${formatPropertyPath(entry.sourcePath)} (${formatCompileOccurrence(entry.occurrence)}): ${entry.detail}`,
    { cause: entry.cause, detail: entry.detail, providerKey: entry.providerKey, occurrence: entry.occurrence },
  );
};
