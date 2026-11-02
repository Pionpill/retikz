import type {
  CompileOccurrenceLocator,
  CompositeReplay,
  LayoutChildResult,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneResource,
  Transform,
  CompositeInputScope,
} from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { IRChild } from '../../../schemas';
import { createWorkspaceCompileContext, createTreeCompileEnvironment } from '../../context';
import type {
  TreeCompileContext,
  NamespaceStack,
  CompositeCompileOwner,
  CompositeReplayTransaction,
} from '../../context';
import { CompileProvenanceTracker } from '../../provenance';
import { calculateBoundsOfPrimitives } from '../../scene';
import {
  BuiltinCompileWarningCode,
  createDuplicateWarning,
  formatCompileOccurrence,
  freezeOccurrence,
  withCompileWarningOccurrence,
} from '../../shared';
import type { CompileWarning } from '../../shared';
import type { TreeCompileFrame } from '../frame';
import type { SubtreeCompileHost, SubtreeCompileOptions } from '../types';
import { boundsRectOf, snapshotAllocationBounds } from './layout';
import { resolveLayoutSlotSize } from './proposal';
import { replayStyleFingerprint, replayThemeFingerprint } from './replay';

/** 单次组件回调的隔离试编译依赖 */
export type CompositeProbeContext = {
  /** 用于 fork 名称环境的外层编译状态 */
  context: TreeCompileContext;
  /** 试编译结果所属回调 */
  owner: CompositeCompileOwner;
  /** 组件定义的完整名称 */
  key: string;
  /** 调用组件的位置 */
  occurrence: CompileOccurrenceLocator;
  /** 当前组件递归深度 */
  compositeDepth: number;
  /** 在同一会话内以独占执行状态编译隔离子树 */
  host: SubtreeCompileHost;
};

/** 在隔离工作区执行子布局并收集未提交贡献 */
export const evaluateCompositeLayout = (
  probeContext: CompositeProbeContext,
  clonedChild: IRChild,
  clonedProposal: LayoutProposal,
  probeOccurrence: CompileOccurrenceLocator,
  probeScopeChain: ReadonlyArray<Transform>,
  probeScopeDefaults: TreeCompileFrame['scopeDefaults'],
  probeTheme: TreeCompileFrame['theme'],
  probeInputs?: CompositeInputScope,
  captureScopeTargets?: SubtreeCompileOptions['captureScopeTargets'],
  measurementAxis?: LayoutMeasurementAxis,
) => {
  const { key, occurrence, compositeDepth } = probeContext;

  const workspace = createWorkspaceCompileContext(probeContext.context.shared);
  const warnings = workspace.diagnostics.warnings;
  const namespaceBaselineWarnings: Array<{ id: string; warning: CompileWarning }> = [];

  const captureWarning = (warning: CompileWarning): void => {
    if (
      warning.code === BuiltinCompileWarningCode.UnresolvedNodeReference ||
      warning.code === BuiltinCompileWarningCode.OffsetBaseUnresolved ||
      warning.code === BuiltinCompileWarningCode.PolarOriginUnresolved ||
      warning.code === BuiltinCompileWarningCode.AtTargetUnresolved
    ) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Composite '${key}' at ${formatCompileOccurrence(occurrence)} cannot layout child with an unresolved reference: ${warning.message}`,
      );
    }

    workspace.diagnostics.collect(warning);
  };

  let probeWarningOccurrence = probeOccurrence;
  const registrationOccurrences = new Map<string, CompileOccurrenceLocator>();
  const registrationKey = (frameDepth: number, id: string): string => `${frameDepth}\u0000${id}`;
  const namespaceBaseline = probeContext.context.tree.namespaceStack.fork();
  const namespaceStack = namespaceBaseline.fork({
    onDuplicate: info => {
      const warning = withCompileWarningOccurrence(createDuplicateWarning(info), probeWarningOccurrence);
      captureWarning(warning);
      if (info.overwroteForkBaseline) namespaceBaselineWarnings.push({ id: info.id, warning });
    },
    onRegister: info =>
      registrationOccurrences.set(registrationKey(info.frameDepth, info.id), freezeOccurrence(probeWarningOccurrence)),
  });

  const probeProvenanceTracker =
    probeContext.context.tree.provenanceTracker === undefined
      ? undefined
      : new CompileProvenanceTracker(namespaceStack.identity);

  const sandboxContext: TreeCompileContext = {
    shared: probeContext.context.shared,
    session: probeContext.context.session,
    ...createTreeCompileEnvironment(
      {
        ...workspace,
        diagnostics: { ...workspace.diagnostics, collect: captureWarning },
      },
      {
        namespaceStack,
        provenanceTracker: probeProvenanceTracker,
        observeWarningOccurrence: current => {
          probeWarningOccurrence = current ?? probeOccurrence;
        },
      },
    ),
    initial: {
      compositeInputs: probeInputs ?? { source: clonedChild, bindings: [] },
      theme: probeTheme,
    },
  };

  const laid = probeContext.host.compileSubtree(
    [clonedChild],
    {
      scopeChain: probeScopeChain,
      scopeDefaults: probeScopeDefaults,
      occurrence: probeOccurrence,
      compositeDepth: compositeDepth + 1,
      generated: true,
      probe: true,
      proposal: clonedProposal,
      ...(measurementAxis === undefined ? {} : { measurementAxis }),
      ...(captureScopeTargets === undefined ? {} : { captureScopeTargets }),
    },
    sandboxContext,
  );

  return {
    laid,
    workspace,
    namespaceStack,
    namespaceBaseline,
    registrationOccurrences,
    registrationKey,
    probeOccurrence,
    namespaceBaselineWarnings,
    warnings,
    probeProvenanceTracker,
  };
};

/** 将隔离布局结果封装为可选择重放的事务 */
export const probeCompositeLayout = (
  probeContext: CompositeProbeContext,
  clonedChild: IRChild,
  clonedProposal: LayoutProposal,
  probeOccurrence: CompileOccurrenceLocator,
  probeScopeChain: ReadonlyArray<Transform>,
  probeScopeDefaults: TreeCompileFrame['scopeDefaults'],
  probeTheme: TreeCompileFrame['theme'],
  scopeChainApplied = false,
  probeInputs?: CompositeInputScope,
  captureScopeTargets?: SubtreeCompileOptions['captureScopeTargets'],
): Readonly<{
  layoutResult: LayoutChildResult;
  transaction: CompositeReplayTransaction;
  namespaceStack: NamespaceStack;
}> => {
  const { owner, key } = probeContext;

  const {
    laid,
    workspace,
    namespaceStack,
    namespaceBaseline,
    registrationOccurrences,
    registrationKey,
    namespaceBaselineWarnings,
    warnings,
    probeProvenanceTracker,
  } = evaluateCompositeLayout(
    probeContext,
    clonedChild,
    clonedProposal,
    probeOccurrence,
    probeScopeChain,
    probeScopeDefaults,
    probeTheme,
    probeInputs,
    captureScopeTargets,
  );
  const token = Object.freeze({}) as CompositeReplay;
  const resources: Array<SceneResource> = [
    ...workspace.paintRegistry.getResources(),
    ...workspace.clipRegistry.getResources(),
  ];
  const namespaceChanges = namespaceStack.diffTopFrame(namespaceBaseline);
  const probeFrameDepth = namespaceStack.depth - 1;
  const allocationBounds = snapshotAllocationBounds(boundsRectOf(laid), key, probeOccurrence);
  const layoutResult: LayoutChildResult = Object.freeze({
    allocationBounds,
    slotSize: resolveLayoutSlotSize(allocationBounds, clonedProposal),
    visualBounds:
      calculateBoundsOfPrimitives(laid.primitives, resources) ?? Object.freeze({ x: 0, y: 0, width: 0, height: 0 }),
    ...(laid.alignmentGuides === undefined ? {} : { alignmentGuides: laid.alignmentGuides }),
    replay: token,
  });

  const transaction: CompositeReplayTransaction = {
    owner,
    originOccurrence: probeOccurrence,
    used: false,
    primitives: laid.primitives,
    primitiveZIndices: laid.primitiveZIndices,
    layouts: laid.layouts,
    bounds: laid.bounds,
    allocations: laid.allocations,
    namespaceChanges,
    namespaceChangeOccurrences: namespaceChanges.map(
      change => registrationOccurrences.get(registrationKey(probeFrameDepth, change.id)) ?? probeOccurrence,
    ),
    ...(probeProvenanceTracker === undefined ? {} : { provenance: probeProvenanceTracker.capture(laid.primitives) }),
    namespaceBaselineWarnings,
    resources,
    warnings: [...warnings],
    artifacts: laid.artifacts,
    styleFingerprint: replayStyleFingerprint(probeScopeDefaults),
    themeFingerprint: replayThemeFingerprint(probeTheme),
    ...(scopeChainApplied ? { scopeChainApplied: true } : {}),
  };

  return { layoutResult, transaction, namespaceStack };
};
