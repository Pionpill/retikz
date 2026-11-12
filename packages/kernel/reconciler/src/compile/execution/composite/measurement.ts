import type { CompositeCompileContext } from '@retikz/core';
import {
  CompileExpansionKind,
  LayoutChildProbeKind,
  createCompositeContractError,
  guardProviderOutput,
  isFatalProbeError,
} from '@retikz/core';

import type { CompositeReplayMaterializeContext } from '../../runtime';
import { freezeOccurrence, wrapLayoutProbeError } from '../../shared';
import type { SubtreeCompileRuntime } from '../subtree';
import { createLayoutChildFailure } from './failure';
import { snapshotCompositeLayoutChild } from './handle';
import { boundsRectOf, contributionOfBounds, projectContribution } from './layout';
import type { CompositeProbeContext } from './probe';
import { evaluateCompositeLayout, probeCompositeLayout } from './probe';
import { cloneLayoutProposal } from './proposal';

/** 同一组件回调内共享的探测序号，不跨回调复用 */
export type CompositeProbeSequence = { /** 下一个探测位置序号 */ index: number };

/** 创建当前主题下的测量操作，探测序号与会话缓存保持回调级共享 */
export const createCompositeMeasurementMethods = (
  probeContext: CompositeProbeContext,
  frame: SubtreeCompileRuntime,
  probeSequence: CompositeProbeSequence,
  theme: SubtreeCompileRuntime['context']['inheritance']['theme'],
): Pick<CompositeCompileContext, 'measureChild' | 'layoutChild'> => {
  const { runtime, owner, key, occurrence, compositeDepth } = probeContext;
  return {
    measureChild: (nextChild, proposal, axis) => {
      const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
      const inputEntry = runtime.state.composite.outputChildren.get(nextChild);
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
        runtime.state.composite.identityOf(inputs?.source ?? nextChild),
        inputs === undefined ? runtime.state.composite.identityOf(owner) : null,
        inputs?.sourcePath,
        clonedChild,
        axis,
        clonedProposal,
        frame.context.inheritance.defaults,
        theme,
        frame.context.transformChains,
        inputs?.bindings.map(input => [input.path, runtime.state.composite.identityOf(input.input)]),
        runtime.state.composite.identityOf(runtime.state.execution.namespaceStack.measurementIdentity),
        compositeDepth,
      ]);
      const cached = runtime.state.composite.getMeasurement(cacheKey);
      if (cached !== undefined) {
        return { kind: 'resolved', result: cached };
      }
      try {
        const { laid } = evaluateCompositeLayout(
          probeContext,
          clonedChild,
          clonedProposal,
          probeOccurrence,
          frame.context.transformChains,
          frame.context.inheritance.defaults,
          theme,
          inputs,
          undefined,
          axis,
        );
        const allocation = laid.layout.contribution ?? contributionOfBounds(axis, boundsRectOf(laid));
        const result = projectContribution(allocation, clonedProposal);
        runtime.state.composite.setMeasurement(cacheKey, result);
        return { kind: 'resolved', result };
      } catch (thrown) {
        if (isFatalProbeError(thrown)) throw thrown;
        const failure = createLayoutChildFailure(
          runtime.state.composite.failures,
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
      const inputEntry = runtime.state.composite.outputChildren.get(nextChild);
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
          frame.context.transformChains,
          frame.context.inheritance.defaults,
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
        runtime.state.composite.replayTransactions.set(layoutResult.replay, transaction);
        runtime.state.composite.layoutResults.set(layoutResult, { owner, replay: layoutResult.replay });

        return Object.freeze({ kind: LayoutChildProbeKind.Resolved, result: layoutResult });
      } catch (thrown) {
        if (isFatalProbeError(thrown)) throw thrown;

        const error = wrapLayoutProbeError(thrown);
        const fallbackProviderKey =
          'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type;
        const failure = createLayoutChildFailure(
          runtime.state.composite.failures,
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
