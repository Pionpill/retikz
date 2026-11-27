import type {
  CanonicalTheme,
  MergedScopeDefaults,
  CompositeCompileContext,
  CompileOccurrenceLocator,
  CompileWarning,
  CompositeInputScope,
  CompositeReplay,
  IRChild,
  LayoutChildResult,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneResources,
  Transform,
} from '@retikz/core';
import {
  BuiltinCompileWarningCode,
  RetikzCoreError,
  RetikzCoreErrorCode,
  calculateBoundsOfPrimitives,
} from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import { CompileProvenanceTracker } from '../../provenance';
import type { CompileRuntime, CompositeCompileOwner, CompositeReplayTransaction, NamespaceStack } from '../../runtime';
import { createCompileEnvironment, createWorkspaceCompileState } from '../../runtime';
import {
  createDuplicateWarning,
  formatCompileOccurrence,
  freezeOccurrence,
  withCompileWarningOccurrence,
} from '../../shared';
import { createPathResolveContext } from '../leaf';
import { createTreePositionContext, createLayoutTargetResolver } from '../shared';
import type { SubtreeCompileHost } from '../subtree';
import { boundsRectOf, snapshotAllocationBounds } from './layout';
import { resolveLayoutSlotSize } from './proposal';

/** 每次调用绑定当时的可见名称，不保存上一轮的名称环境 */
const createProbeTargetResolver = (
  runtime: CompileRuntime,
  queryNamespace: NamespaceStack,
  targetChain: ReadonlyArray<Transform>,
  theme: CanonicalTheme,
) => {
  queryNamespace.setPhase('resolving');
  return createLayoutTargetResolver(
    createTreePositionContext(runtime, targetChain, queryNamespace),
    {
      ...createPathResolveContext(runtime, {
        irPath: ['query'],
        scopeDefaults: {},
        theme,
      }),
      // 查询仅绑定目标，不消费绘制默认值或向已完成的试算追加诊断
      warn: undefined,
      scopeDefaults: undefined,
    },
    targetChain,
  );
};

/** 单次组件回调的隔离试编译依赖 */
export type CompositeProbeContext = {
  /** 用于 fork 名称环境的外层编译状态 */
  runtime: CompileRuntime;
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
  child: IRChild,
  clonedProposal: LayoutProposal,
  probeOccurrence: CompileOccurrenceLocator,
  probeScopeChain: ReadonlyArray<Transform>,
  probeScopeDefaults: MergedScopeDefaults,
  probeTheme: CanonicalTheme,
  probeInputs?: CompositeInputScope,
  measurementAxis?: LayoutMeasurementAxis,
  compositeDispatcher = probeContext.host.compositeDispatcher?.probe(probeOccurrence, false).begin(),
  observeDependencies = false,
) => {
  const { key, occurrence, compositeDepth, runtime, host } = probeContext;

  const workspace = createWorkspaceCompileState(runtime.context);
  const warnings = workspace.diagnosticCollector.warnings;

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

    workspace.diagnosticCollector.collect(warning);
  };

  let probeWarningOccurrence = probeOccurrence;
  const registrationOccurrences = new Map<string, CompileOccurrenceLocator>();
  const registrationKey = (frameDepth: number, id: string): string => `${frameDepth}\u0000${id}`;
  const namespaceBaseline = runtime.state.execution.namespaceStack.fork();
  const namespaceStack = namespaceBaseline.fork({
    onDuplicate: info => {
      if (info.namespace === namespaceBaseline.identity) return;
      const warning = withCompileWarningOccurrence(createDuplicateWarning(info), probeWarningOccurrence);
      captureWarning(warning);
    },
    onRegister: info =>
      registrationOccurrences.set(registrationKey(info.frameDepth, info.id), freezeOccurrence(probeWarningOccurrence)),
  });

  const probeProvenanceTracker =
    runtime.state.execution.provenanceTracker === undefined
      ? undefined
      : new CompileProvenanceTracker(namespaceStack.identity);

  const sandboxRuntime: CompileRuntime = {
    context: {
      ...runtime.context,
      compositeInputs: probeInputs ?? { source: child, bindings: [] },
      theme: probeTheme,
      padding: undefined,
    },
    state: {
      composite: runtime.state.composite,
      ...createCompileEnvironment(
        {
          ...workspace,
          diagnosticCollector: { ...workspace.diagnosticCollector, collect: captureWarning },
        },
        {
          namespaceStack,
          provenanceTracker: probeProvenanceTracker,
          observeWarningOccurrence: current => {
            probeWarningOccurrence = current ?? probeOccurrence;
          },
        },
      ),
    },
  };

  let targetNamespace: NamespaceStack | undefined;
  let targetChain = probeScopeChain;
  let readReference = false;
  const compile = () =>
    host.compileSubtree([child], sandboxRuntime, {
      transformChains: probeScopeChain,
      scopeDefaults: probeScopeDefaults,
      occurrence: probeOccurrence,
      compositeDepth: compositeDepth + 1,
      compositeDispatcher,
      generated: true,
      probe: true,
      skipAllocation: false,
      proposal: clonedProposal,
      ...(measurementAxis === undefined ? {} : { measurementAxis }),
      ...(measurementAxis === undefined
        ? {
            captureScopeTargets: (scope, namespace, chain) => {
              if (scope !== child) return;
              targetNamespace = namespace.fork();
              // 查询者位于子项外部，但可读取其根局部名称；真正祖先仍不可引用
              targetNamespace.leaveScope();
              targetChain = chain;
            },
          }
        : {}),
    });

  const laid = observeDependencies
    ? namespaceStack.observeReferences(() => {
        readReference = true;
      }, compile)
    : compile();
  /** 仅完整布局保存查询能力；尺寸贡献不构造或保留额外的引用环境 */
  let resolvePathTargets;
  if (measurementAxis === undefined) {
    const queryNamespace = targetNamespace ?? namespaceStack.fork();
    resolvePathTargets = createProbeTargetResolver(sandboxRuntime, queryNamespace, targetChain, probeTheme);
  }
  return {
    resolvePathTargets,
    laid,
    workspace,
    namespaceStack,
    namespaceBaseline,
    registrationOccurrences,
    registrationKey,
    probeOccurrence,
    warnings,
    probeProvenanceTracker,
    targetChain,
    readReference,
  };
};

/** 将隔离布局结果封装为可选择重放的事务 */
export const probeCompositeLayout = (
  probeContext: CompositeProbeContext,
  child: IRChild,
  clonedProposal: LayoutProposal,
  probeOccurrence: CompileOccurrenceLocator,
  probeScopeChain: ReadonlyArray<Transform>,
  probeScopeDefaults: MergedScopeDefaults,
  probeTheme: CanonicalTheme,
  scopeChainApplied = false,
  probeInputs?: CompositeInputScope,
): Readonly<{
  layoutResult: LayoutChildResult;
  transaction: CompositeReplayTransaction;
  resolvePathTargets: (
    query: Parameters<CompositeCompileContext['resolvePathTargets']>[1],
  ) => ReturnType<CompositeCompileContext['resolvePathTargets']>;
}> => {
  const { owner, key, runtime, host } = probeContext;
  // 同一出现位置分开记录原始试算与变换后的重放；命中只借用局部产物，replay 凭据仍属于本轮
  const probeStage = host.compositeDispatcher?.probe(probeOccurrence, scopeChainApplied);
  const eligible =
    probeStage !== undefined && probeInputs === undefined && runtime.state.execution.provenanceTracker === undefined;
  const previous = probeStage?.current;
  const token = Object.freeze({}) as CompositeReplay;
  if (
    eligible &&
    previous &&
    jsonStructuralEquals(previous.child, child) &&
    jsonStructuralEquals(previous.proposal, clonedProposal) &&
    (jsonStructuralEquals(previous.chain, probeScopeChain) || (scopeChainApplied && previous.localPlacement)) &&
    jsonStructuralEquals(previous.contribution.defaults, probeScopeDefaults) &&
    jsonStructuralEquals(previous.contribution.theme, probeTheme)
  ) {
    const namespace = runtime.state.execution.namespaceStack.fork();
    return {
      layoutResult: Object.freeze({ ...previous.layout, replay: token }),
      transaction: {
        ...previous.contribution,
        layoutIdentity: previous.layout,
        owner,
        originOccurrence: probeOccurrence,
        used: false,
      },
      resolvePathTargets: createProbeTargetResolver(
        runtime,
        namespace,
        previous.localPlacement ? probeScopeChain : previous.targetChain,
        probeTheme,
      ),
    };
  }

  const {
    laid,
    workspace,
    namespaceStack,
    namespaceBaseline,
    registrationOccurrences,
    registrationKey,
    resolvePathTargets,
    warnings,
    probeProvenanceTracker,
    targetChain,
    readReference,
  } = evaluateCompositeLayout(
    probeContext,
    child,
    clonedProposal,
    probeOccurrence,
    probeScopeChain,
    probeScopeDefaults,
    probeTheme,
    probeInputs,
    undefined,
    probeStage?.begin(),
    eligible,
  );
  const resources: SceneResources = {
    paints: workspace.paintRegistry.getResources(),
    clips: workspace.clipRegistry.getResources(),
  };
  const namespaceChanges = namespaceStack.diffTopFrame(namespaceBaseline);
  const probeFrameDepth = namespaceStack.depth - 1;
  const allocationBounds = snapshotAllocationBounds(boundsRectOf(laid), key, probeOccurrence);
  const layout = {
    allocationBounds,
    slotSize: resolveLayoutSlotSize(allocationBounds, clonedProposal),
    visualBounds:
      calculateBoundsOfPrimitives(laid.primitives, resources) ?? Object.freeze({ x: 0, y: 0, width: 0, height: 0 }),
    ...(laid.layout.alignmentGuides === undefined
      ? {}
      : { alignmentGuides: Object.freeze(laid.layout.alignmentGuides.map(guide => Object.freeze({ ...guide }))) }),
  };
  const layoutResult = Object.freeze({ ...layout, replay: token });

  const contribution = {
    primitives: laid.primitives,
    primitiveZIndices: laid.primitiveZIndices,
    geometries: laid.geometries,
    bounds: laid.bounds,
    allocations: laid.layout.allocations,
    namespaceChanges,
    namespaceChangeOccurrences: namespaceChanges.map(
      change => registrationOccurrences.get(registrationKey(probeFrameDepth, change.id)) ?? probeOccurrence,
    ),
    ...(probeProvenanceTracker === undefined ? {} : { provenance: probeProvenanceTracker.capture(laid.primitives) }),
    resources,
    warnings: [...warnings],
    artifacts: laid.artifacts,
    defaults: probeScopeDefaults,
    theme: probeTheme,
    ...(scopeChainApplied ? { scopeChainApplied: true } : {}),
  };

  const transaction: CompositeReplayTransaction = {
    ...contribution,
    owner,
    originOccurrence: probeOccurrence,
    used: false,
  };
  // 嵌套组件可读取回调环境，不能按普通 IR 的输入判断整次试算有效
  const isPrimitiveTree = (element: IRChild): boolean =>
    !('namespace' in element) && (element.type !== 'scope' || element.children.every(isPrimitiveTree));

  // 显式局部点定位的 Node 与纯分组不消费祖先变换；名称读写和诊断另在实际执行时核对
  const hasLocalPlacement = (element: IRChild): boolean => {
    if ('namespace' in element) return false;
    if (element.type === 'node') return Array.isArray(element.position);
    return (
      element.type === 'scope' &&
      element.position === undefined &&
      element.transforms === undefined &&
      element.children.every(hasLocalPlacement)
    );
  };

  if (
    eligible &&
    !readReference &&
    registrationOccurrences.size === 0 &&
    warnings.length === 0 &&
    isPrimitiveTree(child)
  ) {
    transaction.layoutIdentity = layout;
    probeStage.store({
      child,
      proposal: clonedProposal,
      chain: probeScopeChain,
      localPlacement: scopeChainApplied && hasLocalPlacement(child),
      targetChain,
      layout,
      contribution,
    });
  }
  // 此入口固定执行完整布局，始终具有结果查询能力
  return { layoutResult, transaction, resolvePathTargets: resolvePathTargets! };
};
