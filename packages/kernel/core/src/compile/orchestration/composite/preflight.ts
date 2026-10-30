import type { CompositeReplay } from '../../../contract';
import { createCompositeContractError } from '../../../resolve/diagnostics';
import { resolveClip as resolveClipValue } from '../../../resolve/resource';
import type {
  CompositeExecutionContext,
  PreparedCompositeOutputs,
  PreparedReplay,
  PreparedRuntimeOutput,
} from './execution';
import { isCompositeOutputHandle } from './execution';
import type { CompositeCompileOwner, CompositeReplayTransaction } from './types';

/** 预检完整输出树并在成功后消费句柄 */
export const preflightCompositeOutputs = (
  execution: CompositeExecutionContext,
  outputs: ReadonlyArray<unknown>,
  owner: CompositeCompileOwner,
): PreparedCompositeOutputs => {
  const preparedOutputs = new Map<object, PreparedRuntimeOutput>();
  const preparedReplays = new Map<CompositeReplay, PreparedReplay>();
  const entriesToConsume: Array<{ used: boolean }> = [];
  const transactionsToConsume: Array<CompositeReplayTransaction> = [];

  const visitHandle = (handle: unknown): void => {
    if (handle === null || typeof handle !== 'object') {
      throw createCompositeContractError(`${owner.label} received an invalid or forged output child.`);
    }

    const entry = execution.context.compositeSession.outputChildren.get(handle);
    if (entry === undefined) {
      throw createCompositeContractError(
        `${owner.label} received an output child that does not belong to this compile or was forged.`,
      );
    }

    if (entry.owner !== owner) {
      throw createCompositeContractError(
        `${owner.label} received an output child that does not belong to this composite callback.`,
      );
    }

    if (entry.used) {
      throw createCompositeContractError(`${owner.label} received an output child that was already consumed.`);
    }

    if (preparedOutputs.has(handle)) {
      throw createCompositeContractError(`${owner.label} received the same output child more than once.`);
    }

    entriesToConsume.push(entry);
    if (entry.child.kind === 'bound') {
      preparedOutputs.set(handle, { output: entry.child });
      return;
    }

    if (entry.child.kind === 'scope') {
      const scopeClipPath =
        entry.child.props.clip === undefined
          ? undefined
          : execution.context.workspace.clipRegistry.lower(
              resolveClipValue(entry.child.props.clip, {
                clipRegistry: execution.context.shared.registries.clipRegistry,
                irPath: ['clip'],
              }),
            );
      preparedOutputs.set(handle, {
        output: entry.child,
        ...(scopeClipPath === undefined ? {} : { scopeClipPath }),
      });

      for (const child of entry.child.children)
        if (isCompositeOutputHandle(execution.context, child)) visitHandle(child);

      return;
    }

    preparedOutputs.set(handle, { output: entry.child });
    const transaction = execution.context.compositeSession.replayTransactions.get(entry.child.replay);
    if (transaction === undefined) {
      throw createCompositeContractError(
        `${owner.label} received a replay token that does not belong to this compile or was forged.`,
      );
    }

    if (transaction.owner !== owner) {
      throw createCompositeContractError(
        `${owner.label} received a replay token that does not belong to this composite callback.`,
      );
    }

    if (transaction.used) {
      throw createCompositeContractError(
        `${transaction.owner.label} replay token may be placed at most once and was already replayed.`,
      );
    }

    if (preparedReplays.has(entry.child.replay)) {
      throw createCompositeContractError(
        `${owner.label} received the same replay token more than once and it was already replayed.`,
      );
    }

    const wrapperClipPath =
      entry.child.wrapper?.clip === undefined
        ? undefined
        : execution.context.workspace.clipRegistry.lower(
            resolveClipValue(entry.child.wrapper.clip, {
              clipRegistry: execution.context.shared.registries.clipRegistry,
              irPath: ['clip'],
            }),
          );
    preparedReplays.set(entry.child.replay, {
      transaction,
      ...(wrapperClipPath === undefined ? {} : { wrapperClipPath }),
    });
    transactionsToConsume.push(transaction);
  };

  for (const output of outputs) if (isCompositeOutputHandle(execution.context, output)) visitHandle(output);
  entriesToConsume.forEach(entry => (entry.used = true));
  transactionsToConsume.forEach(transaction => (transaction.used = true));

  return { outputs: preparedOutputs, replays: preparedReplays };
};
