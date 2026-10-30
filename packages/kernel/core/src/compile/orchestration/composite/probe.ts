import type {
  CompileOccurrenceLocator,
  CompositeReplay,
  LayoutChildResult,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneResource,
  Transform,
} from '../../../contract';
import type { CompositeInputScope } from '../../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { IRChild } from '../../../schemas';
import { formatCompileOccurrence, freezeOccurrence } from '../../artifact';
import { BuiltinCompileWarningCode } from '../../constants';
import type { FullCompileContext } from '../../context';
import { createWorkspaceCompileContext } from '../../context';
import { createDuplicateWarning, withCompileWarningOccurrence } from '../../diagnostics';
import type { NamespaceStack } from '../../namespace';
import { CompileProvenanceTracker } from '../../provenance';
import { visualBoundsOfPrimitives } from '../../scene';
import type { InputCompileWarning } from '../../warning';
import { resolveLayoutSlotSize } from '../layout-proposal';
import type { CompileExecutionContext, ScopeCompileHost, ScopeCompileFrame, SubtreeCompileOptions } from '../types';
import { boundsRectOf, replayStyleFingerprint, replayThemeFingerprint, snapshotAllocationBounds } from './layout';
import type { CompositeCompileOwner, CompositeReplayTransaction } from './types';

/** 单次组件回调的隔离试编译依赖 */
export type CompositeProbeContext = {
  /** 用于 fork 名称环境的外层编译状态 */
  context: CompileExecutionContext;
  /** 试编译结果所属回调 */
  owner: CompositeCompileOwner;
  /** 组件定义的完整名称 */
  key: string;
  /** 调用组件的位置 */
  occurrence: CompileOccurrenceLocator;
  /** 当前组件递归深度 */
  compositeDepth: number;
  /** 在同一会话内以独占执行状态编译隔离子树 */
  host: ScopeCompileHost;
};

/** 在隔离工作区执行子布局并收集未提交贡献 */
export const evaluateCompositeLayout = (
  probeContext: CompositeProbeContext,
  clonedChild: IRChild,
  clonedProposal: LayoutProposal,
  probeOccurrence: CompileOccurrenceLocator,
  probeScopeChain: ReadonlyArray<Transform>,
  probeScopeDefaults: ScopeCompileFrame['scopeDefaults'],
  probeTheme: ScopeCompileFrame['theme'],
  probeInputs?: CompositeInputScope,
  captureScopeTargets?: SubtreeCompileOptions['captureScopeTargets'],
  measurementAxis?: LayoutMeasurementAxis,
) => {
  const { key, occurrence, compositeDepth } = probeContext;

  const workspace = createWorkspaceCompileContext(probeContext.context.shared);
  const warnings = workspace.diagnostics.warnings;
  const namespaceBaselineWarnings: Array<{ id: string; warning: InputCompileWarning }> = [];

  const captureWarning = (warning: InputCompileWarning): void => {
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
  const namespaceBaseline = probeContext.context.namespaceStack.fork();
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
    probeContext.context.provenanceTracker === undefined
      ? undefined
      : new CompileProvenanceTracker(namespaceStack.identity);

  const sandboxContext: FullCompileContext = {
    shared: probeContext.context.shared,
    workspace: {
      ...workspace,
      diagnostics: { ...workspace.diagnostics, collect: captureWarning },
    },
    compositeInputs: probeInputs ?? { source: clonedChild, bindings: [] },
    theme: probeTheme,
  };

  const laid = probeContext.host.compileSubtree(
    [clonedChild],
    {
      namespaceStack,
      scopeChain: probeScopeChain,
      scopeDefaults: probeScopeDefaults,
      occurrence: probeOccurrence,
      compositeDepth: compositeDepth + 1,
      generated: true,
      probe: true,
      proposal: clonedProposal,
      ...(measurementAxis === undefined ? {} : { measurementAxis }),
      ...(captureScopeTargets === undefined ? {} : { captureScopeTargets }),
      ...(probeProvenanceTracker === undefined ? {} : { provenanceTracker: probeProvenanceTracker }),
      observeWarningOccurrence: current => {
        probeWarningOccurrence = current ?? probeOccurrence;
      },
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
  probeScopeDefaults: ScopeCompileFrame['scopeDefaults'],
  probeTheme: ScopeCompileFrame['theme'],
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
    ...workspace.paintRegistry.resources(),
    ...workspace.clipRegistry.resources(),
  ];
  const namespaceChanges = namespaceStack.diffTopFrame(namespaceBaseline);
  const probeFrameDepth = namespaceStack.depth - 1;
  const allocationBounds = snapshotAllocationBounds(boundsRectOf(laid), key, probeOccurrence);
  const layoutResult: LayoutChildResult = Object.freeze({
    allocationBounds,
    slotSize: resolveLayoutSlotSize(allocationBounds, clonedProposal),
    visualBounds: visualBoundsOfPrimitives(laid.primitives, resources),
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
