import type { CanonicalTheme, CompositeCompileContext } from '@retikz/core';
import {
  CompileExpansionKind,
  LayoutChildProbeKind,
  createContractViolationError,
  guardProviderOutput,
  isFatalProbeError,
} from '@retikz/core';

import type { CompositeReplayMaterializeContext } from '../../runtime';
import { freezeOccurrence, wrapLayoutProbeError } from '../../shared';
import type { SubtreeCompileRuntime } from '../subtree';
import { createLayoutChildFailure } from './failure';
import { readCompositeChild } from './handle';
import { boundsRectOf, contributionOfBounds, projectContribution } from './layout';
import type { CompositeProbeContext } from './probe';
import { evaluateCompositeLayout, probeCompositeLayout } from './probe';
import { cloneLayoutProposal } from './proposal';

/** 同一组件回调内共享的探测序号，不跨回调复用 */
export type CompositeProbeSequence = { /** 下一个探测位置序号 */ index: number };

/** 创建尺寸测量回调，复用测量缓存并将可恢复错误转换为失败结果 */
const createMeasureChild = (
  probeContext: CompositeProbeContext,
  frame: SubtreeCompileRuntime,
  probeSequence: CompositeProbeSequence,
  theme: CanonicalTheme,
): CompositeCompileContext['measureChild'] => {
  const { runtime, owner, key, occurrence, compositeDepth } = probeContext;
  let measurementEnvironmentIdentity: number | undefined;
  return (nextChild, proposal, axis) => {
    /** 准备布局约束与子项，绑定子项必须属于当前回调 */
    const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
    const inputEntry = runtime.state.composite.outputChildren.get(nextChild);
    if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
      throw createContractViolationError(`${owner.label} measureChild requires a child from this callback`);
    const inputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
    const child =
      inputEntry?.child.kind === 'bound'
        ? inputEntry.child.child
        : guardProviderOutput(owner.label, () =>
            readCompositeChild(owner.label, nextChild, `layoutChild input at probe ${probeSequence.index}`),
          );
    const probeIndex = probeSequence.index++;

    /** 按子项、测量轴、约束和有效编译环境查询尺寸缓存 */
    // ⚡同一回调的稳定环境只序列化一次，跨回调按内容共享短编号
    measurementEnvironmentIdentity ??= runtime.state.composite.internMeasurementContent(
      JSON.stringify([frame.context.inheritance.defaults, theme, frame.context.transformChains, compositeDepth]),
    );
    const cacheKey = JSON.stringify([
      runtime.state.composite.identityOf(inputs?.source ?? nextChild),
      inputs === undefined ? runtime.state.composite.identityOf(owner) : null,
      inputs?.sourcePath,
      runtime.state.composite.internMeasurementChild(child),
      axis,
      clonedProposal,
      measurementEnvironmentIdentity,
      inputs?.bindings.map(input => [input.path, runtime.state.composite.identityOf(input.input)]),
      runtime.state.composite.identityOf(runtime.state.execution.namespaceStack.measurementIdentity),
    ]);
    const cached = runtime.state.composite.getMeasurement(cacheKey);
    if (cached !== undefined) {
      return { kind: 'resolved', result: cached };
    }

    // ⚡只有实际试算才创建位置快照，命中缓存仍保留探测序号推进
    const probeOccurrence = freezeOccurrence({
      sourcePath: occurrence.sourcePath,
      expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Probe, index: probeIndex }],
    });

    /** 未命中缓存时隔离求值，优先使用尺寸贡献，否则从完整布局中提取尺寸 */
    try {
      const { laid } = evaluateCompositeLayout(
        probeContext,
        child,
        clonedProposal,
        probeOccurrence,
        frame.context.transformChains,
        frame.context.inheritance.defaults,
        theme,
        inputs,
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
        'namespace' in child ? `${child.namespace}.${child.type}` : child.type,
        probeOccurrence,
      );
      return { kind: 'failed', failure };
    }
  };
};

/** 创建布局试算回调，保存可供后续重放的事务及重新物化能力 */
const createLayoutChild = (
  probeContext: CompositeProbeContext,
  frame: SubtreeCompileRuntime,
  probeSequence: CompositeProbeSequence,
  theme: CanonicalTheme,
): CompositeCompileContext['layoutChild'] => {
  const { runtime, owner, key, occurrence } = probeContext;
  return (nextChild, proposal) => {
    /** 准备布局约束与子项，保留绑定子项的运行时输入 */
    const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
    const inputEntry = runtime.state.composite.outputChildren.get(nextChild);
    if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
      throw createContractViolationError(
        `${owner.label} layoutChild requires an authored or bound child from this callback`,
      );

    const probeInputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
    const child =
      inputEntry?.child.kind === 'bound'
        ? inputEntry.child.child
        : guardProviderOutput(owner.label, () =>
            readCompositeChild(owner.label, nextChild, `layoutChild input at probe ${probeSequence.index}`),
          );
    const probeOccurrence = freezeOccurrence({
      sourcePath: occurrence.sourcePath,
      expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Probe, index: probeSequence.index }],
    });
    probeSequence.index += 1;

    /** 完整试算子树，取得布局结果及尚未提交的重放事务 */
    try {
      const probed = probeCompositeLayout(
        probeContext,
        child,
        clonedProposal,
        probeOccurrence,
        frame.context.transformChains,
        frame.context.inheritance.defaults,
        theme,
        false,
        probeInputs,
      );
      const { layoutResult, transaction } = probed;

      /** 重放环境变化时，根据新的继承配置、主题和变换重新生成事务 */
      transaction.materialize = ({
        scopeChain,
        scopeDefaults,
        theme: replayTheme,
      }: CompositeReplayMaterializeContext) =>
        probeCompositeLayout(
          probeContext,
          child,
          clonedProposal,
          probeOccurrence,
          scopeChain,
          scopeDefaults,
          replayTheme,
          true,
          probeInputs,
        ).transaction;

      /** 登记结果与凭据的归属，后续由输出预检和 replay 提交阶段消费 */
      runtime.state.composite.replayTransactions.set(layoutResult.replay, transaction);
      runtime.state.composite.layoutResults.set(layoutResult, {
        owner,
        replay: layoutResult.replay,
        resolvePathTargets: probed.resolvePathTargets,
      });

      return Object.freeze({ kind: LayoutChildProbeKind.Resolved, result: layoutResult });
    } catch (thrown) {
      if (isFatalProbeError(thrown)) throw thrown;

      const error = wrapLayoutProbeError(thrown);
      const fallbackProviderKey = 'namespace' in child ? `${child.namespace}.${child.type}` : child.type;
      const failure = createLayoutChildFailure(
        runtime.state.composite.failures,
        owner,
        error,
        fallbackProviderKey,
        probeOccurrence,
      );

      return Object.freeze({ kind: LayoutChildProbeKind.Failed, failure });
    }
  };
};

/** 组合当前主题下的尺寸测量与布局试算操作，两者共享同一回调的归属和探测序号 */
export const createCompositeMeasurementMethods = (
  probeContext: CompositeProbeContext,
  frame: SubtreeCompileRuntime,
  probeSequence: CompositeProbeSequence,
  theme: CanonicalTheme,
): Pick<CompositeCompileContext, 'measureChild' | 'layoutChild'> => ({
  measureChild: createMeasureChild(probeContext, frame, probeSequence, theme),
  layoutChild: createLayoutChild(probeContext, frame, probeSequence, theme),
});
