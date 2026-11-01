import type { CompositeCompileContext } from '../../../contract';
import { CompileExpansionKind, LayoutChildProbeKind } from '../../../contract';
import { guardProviderOutput } from '../../../resolve';
import { createCompositeContractError, isFatalProbeError } from '../../../resolve/diagnostics';
import { freezeOccurrence, wrapLayoutProbeError } from '../../shared';
import type { TreeCompileFrame } from '../frame';
import { createLayoutChildFailure } from './failure';
import { snapshotCompositeLayoutChild } from './handle';
import { boundsRectOf, contributionOfBounds, projectContribution } from './layout';
import type { CompositeProbeContext } from './probe';
import { evaluateCompositeLayout, probeCompositeLayout } from './probe';
import { cloneLayoutProposal } from './proposal';
import type { CompositeReplayMaterializeContext } from './types';

/** 同一组件回调内共享的探测序号，不跨回调复用 */
export type CompositeProbeSequence = { /** 下一个探测位置序号 */ index: number };

/** 创建当前主题下的测量操作，探测序号与会话缓存保持回调级共享 */
export const createCompositeMeasurementMethods = (
  probeContext: CompositeProbeContext,
  frame: TreeCompileFrame,
  probeSequence: CompositeProbeSequence,
  theme: TreeCompileFrame['theme'],
): Pick<CompositeCompileContext, 'measureChild' | 'layoutChild'> => {
  const { context, owner, key, occurrence, compositeDepth } = probeContext;
  return {
    measureChild: (nextChild, proposal, axis) => {
      const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
      const inputEntry = context.compositeSession.outputChildren.get(nextChild);
      if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
        throw createCompositeContractError(`${owner.label} measureChild requires a child from this callback`);
      const inputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
      const clonedChild = guardProviderOutput(owner.label, () =>
        snapshotCompositeLayoutChild(
          owner.label,
          inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
          probeSequence.index,
        ),
      );
      const probeOccurrence = freezeOccurrence({
        sourcePath: occurrence.sourcePath,
        expansionPath: [
          ...occurrence.expansionPath,
          { kind: CompileExpansionKind.Probe, index: probeSequence.index++ },
        ],
      });
      const cacheKey = JSON.stringify([
        context.compositeSession.identityOf(inputs?.source ?? nextChild),
        inputs === undefined ? context.compositeSession.identityOf(owner) : null,
        inputs?.sourcePath,
        clonedChild,
        axis,
        clonedProposal,
        frame.scopeDefaults,
        theme,
        frame.scopeChain,
        inputs?.bindings.map(input => [input.path, context.compositeSession.identityOf(input.input)]),
        context.compositeSession.identityOf(context.namespaceStack.measurementIdentity),
        compositeDepth,
      ]);
      const cached = context.compositeSession.getMeasurement(cacheKey);
      if (cached !== undefined) {
        return { kind: 'resolved', result: cached };
      }
      try {
        const { laid } = evaluateCompositeLayout(
          probeContext,
          clonedChild,
          clonedProposal,
          probeOccurrence,
          frame.scopeChain,
          frame.scopeDefaults,
          theme,
          inputs,
          undefined,
          axis,
        );
        const allocation = laid.contribution ?? contributionOfBounds(axis, boundsRectOf(laid));
        const result = projectContribution(allocation, clonedProposal);
        context.compositeSession.setMeasurement(cacheKey, result);
        return { kind: 'resolved', result };
      } catch (thrown) {
        if (isFatalProbeError(thrown)) throw thrown;
        const failure = createLayoutChildFailure(
          context.compositeSession.failures,
          owner,
          wrapLayoutProbeError(thrown),
          'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type,
          probeOccurrence,
        );
        return { kind: 'failed', failure };
      }
    },
    layoutChild: (nextChild, proposal) => {
      const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
      const inputEntry = context.compositeSession.outputChildren.get(nextChild);
      if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
        throw createCompositeContractError(
          `${owner.label} layoutChild requires an authored or bound child from this callback`,
        );

      const probeInputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
      const clonedChild = guardProviderOutput(owner.label, () =>
        snapshotCompositeLayoutChild(
          owner.label,
          inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
          probeSequence.index,
        ),
      );
      const probeOccurrence = freezeOccurrence({
        sourcePath: occurrence.sourcePath,
        expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Probe, index: probeSequence.index }],
      });
      probeSequence.index += 1;

      try {
        const probed = probeCompositeLayout(
          probeContext,
          clonedChild,
          clonedProposal,
          probeOccurrence,
          frame.scopeChain,
          frame.scopeDefaults,
          theme,
          false,
          probeInputs,
        );
        const { layoutResult, transaction } = probed;
        transaction.materialize = ({
          scopeChain,
          scopeDefaults,
          theme: replayTheme,
        }: CompositeReplayMaterializeContext) =>
          probeCompositeLayout(
            probeContext,
            clonedChild,
            clonedProposal,
            probeOccurrence,
            scopeChain,
            scopeDefaults,
            replayTheme,
            true,
            probeInputs,
          ).transaction;
        context.compositeSession.replayTransactions.set(layoutResult.replay, transaction);
        context.compositeSession.layoutResults.set(layoutResult, { owner, replay: layoutResult.replay });

        return Object.freeze({ kind: LayoutChildProbeKind.Resolved, result: layoutResult });
      } catch (thrown) {
        if (isFatalProbeError(thrown)) throw thrown;

        const error = wrapLayoutProbeError(thrown);
        const fallbackProviderKey =
          'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type;
        const failure = createLayoutChildFailure(
          context.compositeSession.failures,
          owner,
          error,
          fallbackProviderKey,
          probeOccurrence,
        );

        return Object.freeze({ kind: LayoutChildProbeKind.Failed, failure });
      }
    },
  };
};
