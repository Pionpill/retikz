import type { JsonValue } from '@retikz/foundation';
import type { BoundsRect } from '@retikz/math';
import { boundsToRect } from '@retikz/math';

import type {
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileContext,
  CompositeCompileResult,
  CompositeCompileScopeProps,
  CompositeContributionResult,
  CompositeReplay,
  CompositeReplayWrapper,
  CompositeRuntimeInputContext,
  GroupPrimitive,
  LayoutChildResult,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneClipPath,
  ScenePrimitive,
  SceneResource,
  SpatialHandleOwner,
  Transform,
} from '../../contract';
import { CompileExpansionKind, LayoutChildProbeKind, NaturalLayoutProposal } from '../../contract';
import type { CompositeRuntimeInputScope } from '../../contract/composite';
import { captureCompositeInputScope, selectCompositeInputScope } from '../../contract/composite';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { BoundaryReferenceResolver, PathTargetResolver, TargetResolution } from '../../resolve';
import {
  bindComposite,
  resolveBoundaryReference,
  resolveComposite,
  resolvePath as resolvePathValue,
  resolveScopeDefaults,
  resolveTheme,
} from '../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeErrorMessage,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { PositionTargetResolveContext } from '../../resolve/position';
import { resolvePosition } from '../../resolve/position';
import { resolveClip as resolveClipValue } from '../../resolve/resource';
import type { IRChild, IRPosition, IRTarget } from '../../schemas';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
import { cloneAndFreezeJson } from '../../shared/json';
import { formatCompileChildPath, formatCompileOccurrence } from '../artifact';
import { BuiltinCompileWarningCode } from '../constants';
import { projectPublishedCompileLayout, projectScopeCompileLayouts } from '../element';
import { NamespaceStack } from '../namespace';
import type { NodeLayout } from '../node';
import {
  alignmentGuidesOfNode,
  compileNodeState,
  createScopePlaceholderLayout,
  createSyntheticRectangleLayout,
  emitNodePrimitives,
  labelExtentPoints,
  outerRectOf,
  projectNodeLayoutObservation,
  projectNodeOwnerOutput,
} from '../node';
import { emitDefinedPath } from '../path';
import {
  createCompileInvariantError,
  createLayoutChildFailure,
  enrichLayoutProbeError,
  normalizeLayoutProbeError,
  raiseLayoutChildFailure,
} from '../probe-failure';
import { createClipRegistry, createPaintRegistry, importSceneResources, remapPrimitiveResources } from '../resource';
import { withProviderOutputValidationBoundary } from '../scene-primitive';
import {
  createIntrinsicScopeLayout,
  resolveFinalScopeTransforms,
  resolvePreliminaryScopeTransforms,
  resolveScopePositionTarget,
} from '../scope';
import { createScopeTransformContext } from '../transform';
import type { CompositeCompileArtifact } from '../types';
import type { CompileWarningInput } from '../warning';
import { cloneAlignmentGuides, resolveStructuralAlignmentGuides, transformAlignmentGuides } from './alignment-guide';
import { filterAnimations } from './animation';
import { freezeCompileArtifact, freezeOccurrence, orderCompileArtifacts } from './artifact';
import { canonicalizeBoundsRect, collectLayoutBounds } from './bounds';
import {
  createCompositeBoundChild,
  createCompositeReplayChild,
  createCompositeScopeChild,
  snapshotCompositeLayoutChild,
  snapshotCompositeOutputChild,
  validateCompositeSpatialOutput,
} from './composite-output';
import type { CompileContext } from './context';
import {
  compileWarningOccurrenceOf,
  createDuplicateWarning,
  replaceCompileWarningOccurrence,
  withCompileWarningOccurrence,
} from './diagnostics';
import { cloneLayoutProposal, resolveLayoutAxisSlotSize, resolveLayoutSlotSize } from './layout-proposal';
import { createOwnerOutputPublisher } from './owner-output';
import { bindPathTarget, targetKeyOf } from './path-target';
import { createPositionResolveContext } from './position-context';
import type { InternalScenePrimitive } from './primitive';
import {
  collectPlaceholderLocators,
  makePathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';
import { createCompileProvenanceTracker } from './provenance';
import { replayPendingSpatialHandle } from './spatial-handle';
import type {
  CompileSemanticOwner,
  CompositeCompileOwner,
  CompositeReplayMaterializeContext,
  CompositeReplayTransaction,
  CompositeRuntimeOutputChild,
  CoordinateChild,
  EmitScopeGroupContext,
  NodeChild,
  PathChild,
  PendingPathEmission,
  ScopeChild,
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  TraversalCompileOptions,
  TraversalFrame,
  TraversalResult,
  TraversalRuntime,
} from './types';
import { optionalVisualBoundsOfPrimitives, visualBoundsOfPrimitives } from './visual-bounds';

/** 按有效默认配置判断 replay 是否需要重新物化 */
const replayStyleFingerprint = (scopeDefaults: TraversalFrame['scopeDefaults']): string =>
  JSON.stringify(scopeDefaults);

/** 对 resolved Theme 做 compile-local 稳定比较 */
const replayThemeFingerprint = (theme: TraversalFrame['theme']): string => JSON.stringify(theme);

/** 从真实边界提取指定轴，不补齐未查询的尺寸 */
const contributionOfBounds = (axis: LayoutMeasurementAxis, bounds: Readonly<BoundsRect>): LayoutContribution =>
  axis === 'x'
    ? { axis, width: bounds.width }
    : axis === 'y'
      ? { axis, height: bounds.height }
      : { axis, width: bounds.width, height: bounds.height };

/** 共享既有单轴槽位语义，隔离并冻结可缓存贡献 */
const projectContribution = (contribution: LayoutContribution, proposal: LayoutProposal): LayoutContribution => {
  if (contribution.axis === 'x')
    return Object.freeze({ axis: 'x', width: resolveLayoutAxisSlotSize(contribution.width, proposal.x) });
  if (contribution.axis === 'y')
    return Object.freeze({ axis: 'y', height: resolveLayoutAxisSlotSize(contribution.height, proposal.y) });
  return Object.freeze({
    axis: 'both',
    width: resolveLayoutAxisSlotSize(contribution.width, proposal.x),
    height: resolveLayoutAxisSlotSize(contribution.height, proposal.y),
  });
};

/** 编译 child 树，完成 namespace 注册、延迟 path 回填、zIndex 排序和自动 layout bbox 收集 */
export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
  options: TraversalCompileOptions = {},
): TraversalResult => {
  const scopeTransformsContext = createScopeTransformContext();
  const session = options.session ?? {
    measurements: new Map<string, LayoutContribution>(),
    measurementIdentities: new WeakMap<object, number>(),
    measurementPrimitiveIdentities: new Map<unknown, number>(),
    nextMeasurementIdentity: 0,
    replayTransactions: new WeakMap(),
    layoutResults: new WeakMap(),
    outputChildren: new WeakMap(),
    failures: new WeakMap(),
  };
  let rootContribution: LayoutContribution | undefined;
  const warningOccurrences: Array<CompileOccurrenceLocator> = [];

  const dispatchWarning = (warning: CompileWarningInput): void => {
    context.onWarn(withCompileWarningOccurrence(warning, warningOccurrences.at(-1)));
  };

  /** 在同步 child 编译或延迟 emit 期间绑定当前 warning occurrence */
  const withWarningOccurrence = <T>(occurrence: CompileOccurrenceLocator, execute: () => T): T => {
    warningOccurrences.push(occurrence);
    options.observeWarningOccurrence?.(occurrence);

    try {
      return execute();
    } finally {
      warningOccurrences.pop();
      options.observeWarningOccurrence?.(warningOccurrences.at(-1));
    }
  };

  /** 编译运行时环境 */
  const runtime: TraversalRuntime = {
    context: {
      measureText: context.measureText,
      lowerTex: context.lowerTex,
      onWarn: dispatchWarning,
      round: context.round,
      nodeGeometry: context.nodeGeometry,
      nodeDistance: context.nodeDistance,
      labelDistance: context.labelDistance,
      rootFontSize: context.rootFontSize,
      shapes: context.shapes,
      boundaries: context.boundaries,
      clips: context.clips,
      patterns: context.patterns,
      arrows: context.arrows,
      marks: context.marks,
      paths: context.paths,
      paint: context.paint,
      clip: context.clip,
      composites: context.composites,
      maxCompositeDepth: context.maxCompositeDepth,
      artifacts: context.artifacts,
      observation: context.observation,
      proposal: options.proposal ?? NaturalLayoutProposal,
      session,
    },
    state: {
      primitives: [],
      layoutBounds: undefined,
      namespaceStack:
        options.namespaceStack ??
        new NamespaceStack({
          onDuplicate: info => dispatchWarning(createDuplicateWarning(info)),
        }),
      zIndexOf: new WeakMap(),
      placeholderBalance: 0,
      ...(options.provenanceTracker === undefined ? {} : { provenanceTracker: options.provenanceTracker }),
    },
  };

  const resolveExplicitBoundary: BoundaryReferenceResolver = (boundary, referenceContext) =>
    resolveBoundaryReference(boundary, {
      visualDef: referenceContext.visualDef,
      visualParams: referenceContext.visualParams,
      shapeRegistry: runtime.context.shapes,
      boundaryRegistry: runtime.context.boundaries,
      irPath: referenceContext.irPath,
    });

  /** 从当前 traversal 状态投影 resolver 所需的窄位置上下文 */
  const positionContextOf = (scopeChain: ReadonlyArray<Transform>): PositionTargetResolveContext =>
    createPositionResolveContext({
      geometryContext: runtime.context.nodeGeometry,
      lookupReference: id => runtime.state.namespaceStack.lookupReference(id),
      nodeDistance: runtime.context.nodeDistance,
      scopeChain,
      resolveExplicitBoundary,
      effectiveTransform: scopeTransformsContext.resolve(scopeChain),
    });

  /** 为单次 Path resolve 创建复用 binding 的 target resolver，避免重复 provider lookup */
  const createPathTargetResolver = (): PathTargetResolver => {
    const bindingsByScope = new WeakMap<ReadonlyArray<Transform>, Map<string, TargetResolution | null>>();

    const bindingOf = (target: IRTarget, chain: ReadonlyArray<Transform>): TargetResolution | null => {
      let bindings = bindingsByScope.get(chain);
      if (bindings === undefined) {
        bindings = new Map();
        bindingsByScope.set(chain, bindings);
      }

      const key = targetKeyOf(target);
      if (bindings.has(key)) return bindings.get(key) ?? null;

      const binding = bindPathTarget(target, positionContextOf(chain));
      bindings.set(key, binding);

      return binding;
    };

    return {
      pointOfTarget: (target, chain) => bindingOf(target, chain)?.point ?? null,
      refPointOfTarget: (target, chain) => bindingOf(target, chain)?.referencePoint ?? null,
      bindTarget: bindingOf,
    };
  };

  /** 仅在选中时投影 Kernel 的同次编译事实并加入最终提交队列 */
  const publishKernelObservation = (
    owner: CompileObservationOwner,
    occurrence: CompileOccurrenceLocator,
    frame: TraversalFrame,
    project: () => JsonValue,
  ): void => {
    const output = createOwnerOutputPublisher(
      Object.freeze(owner),
      occurrence.sourcePath,
      true,
      runtime.context.observation,
    );
    if (!output.publisher.requested) return;

    output.publisher.publish(project());
    const value = output.value();
    if (value === undefined) throw createCompileInvariantError('internal: Kernel owner output was not published');

    frame.compileObservationSink.push({
      owner,
      occurrence: freezeOccurrence(occurrence),
      origin: freezeOccurrence(occurrence),
      ancestors: frame.ancestors,
      scopeChain: frame.scopeChain,
      value,
      observerKeys: output.keys,
      theme: frame.theme,
      scopeDefaults: frame.scopeDefaults,
    });
  };

  /** 复用已经登记的裁切路径，每个逻辑宿主只发布一次应用 */
  const publishClipObservation = (
    clipRef: string | undefined,
    host: CompileOccurrenceLocator,
    frame: TraversalFrame,
  ): void => {
    if (clipRef === undefined) return;

    publishKernelObservation(
      { kind: 'clip' },
      {
        sourcePath: host.sourcePath,
        expansionPath: [...host.expansionPath, { kind: CompileExpansionKind.Clip, index: 0 }],
      },
      frame,
      () => {
        const resource = runtime.context.clip.resources().find(candidate => candidate.id === clipRef);
        if (resource === undefined) throw createCompileInvariantError('internal: observed clip resource is missing');
        return { path: resource.path };
      },
    );
  };

  /** 把 allocation contribution 绑定到最近的显式 composite allocation boundary */
  const pushAllocation = (
    sink: TraversalFrame['allocationSink'],
    boundsPoints: Array<IRPosition>,
    allocationBoundary?: object,
  ): void => {
    sink.push({ boundsPoints, ...(allocationBoundary === undefined ? {} : { allocationBoundary }) });
  };

  /** 只保留当前 traversal 对外可见的 allocation contribution */
  const effectiveAllocations = <T extends { allocationBoundary?: object }>(values: ReadonlyArray<T>): Array<T> =>
    values.filter(value => value.allocationBoundary === undefined);

  /** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
  const flushPendingPathEmissions = (pendingPaths: ReadonlyArray<PendingPathEmission>): void => {
    if (pendingPaths.length === 0) return;

    runtime.state.namespaceStack.enterResolvingPhase();

    try {
      for (const pendingPath of pendingPaths) {
        try {
          const targetResolver = createPathTargetResolver();
          const resolution = resolvePathValue(pendingPath.path, {
            scopeDefaults: pendingPath.scopeDefaults,
            mode: pendingPath.theme.mode,
            scopeChain: pendingPath.scopeChain,
            targetResolver,
            paths: runtime.context.paths,
            arrows: runtime.context.arrows,
            marks: runtime.context.marks,
            patterns: runtime.context.patterns,
            round: runtime.context.round,
            irPath: pendingPath.irPath,
          });
          const result = withWarningOccurrence(pendingPath.occurrence, () =>
            emitDefinedPath(pendingPath, resolution, targetResolver, {
              ...runtime.context,
              resolveTransform: scopeTransformsContext.resolve,
            }),
          );
          const rawPrimitives = result?.primitives ?? [];
          const primitives = runtime.state.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
          const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
          if (idx === -1) {
            throw createCompileInvariantError('internal: path placeholder missing from its sink');
          }

          pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
          if (pendingPath.semanticOwner !== undefined) {
            runtime.state.provenanceTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
          }

          runtime.state.placeholderBalance--;

          for (const prim of primitives) recordPrimitiveZIndex(runtime.state.zIndexOf, prim, pendingPath.zIndex);
          if (result !== null) {
            pendingPath.boundsSink.push({
              boundsPoints: [...result.boundsPoints],
              shadow: resolution.path.shadow,
            });
            pushAllocation(pendingPath.allocationSink, [...result.boundsPoints], pendingPath.allocationBoundary);
          }
        } catch (thrown) {
          options.observeFailurePath?.(pendingPath.irPath);
          throw thrown;
        }
      }
    } finally {
      runtime.state.namespaceStack.exitResolvingPhase();
    }
  };

  /** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
  const emitNodeChild = (
    child: NodeChild,
    index: number,
    frame: TraversalFrame,
    occurrence?: CompileOccurrenceLocator,
    semanticOwner?: CompileSemanticOwner,
  ): void => {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, scopeDefaults } = frame;
    const nodeIrPath = formatCompileChildPath(locatorPrefix, index, 'node');

    const compilation = compileNodeState(child, nodeIrPath, {
      ...runtime.context,
      scopeDefaults,
      mode: frame.theme.mode,
      scopeChain,
      positionContext: positionContextOf(scopeChain),
      effectiveTransform: scopeTransformsContext.resolve(scopeChain),
      childProposal: frame.childProposal,
    });

    const { layout, properties } = compilation;
    const globalLayout = scopeTransformsContext.project(layout, scopeChain);
    publishKernelObservation({ kind: 'node' }, occurrence ?? { sourcePath: nodeIrPath, expansionPath: [] }, frame, () =>
      projectNodeOwnerOutput(layout, runtime.context.round, runtime.context.nodeGeometry),
    );
    if (child.id) {
      runtime.state.namespaceStack.register(child.id, globalLayout, `${nodeIrPath}.id`);
      child.aliasIds?.forEach((id, aliasIndex) =>
        runtime.state.namespaceStack.register(id, globalLayout, `${nodeIrPath}.aliasIds[${aliasIndex}]`),
      );
    }

    frame.publicationSink.push(globalLayout);
    frame.observationSink.push({
      id: properties.id,
      layout,
      scopeChain,
      occurrence:
        occurrence ??
        Object.freeze({
          sourcePath: nodeIrPath,
          expansionPath: Object.freeze([]),
        }),
    });
    const rawPrimitives = emitNodePrimitives(compilation, runtime.context.round, runtime.context.paint.register);
    const emittedPrimitives = runtime.state.provenanceTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
    if (semanticOwner !== undefined) {
      runtime.state.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
    }

    for (const prim of emittedPrimitives) {
      primitiveSink.push(prim);
      recordPrimitiveZIndex(runtime.state.zIndexOf, prim, child.zIndex);
    }

    const outerRect = outerRectOf(layout);
    const nodeBoundsPoints: Array<IRPosition> = [
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    ];
    frame.boundsSink.push({ boundsPoints: nodeBoundsPoints, shadow: properties.shadow });
    frame.boundsSink.push({ boundsPoints: labelExtentPoints(layout) });
    pushAllocation(frame.allocationSink, nodeBoundsPoints, frame.allocationBoundary);
    const alignmentGuides = alignmentGuidesOfNode(layout, runtime.context.round);
    if (alignmentGuides !== undefined) {
      frame.alignmentGuideSink.push(...cloneAlignmentGuides(alignmentGuides, `Node '${nodeIrPath}'`));
    }

    layoutSink.push(layout);
  };

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
  const registerCoordinateChild = (
    child: CoordinateChild,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
  ): void => {
    const { scopeChain, locatorPrefix, layoutSink } = frame;
    const coordinateIrPath = formatCompileChildPath(locatorPrefix, index, 'coordinate');
    const localCenter = resolvePosition(child.position, positionContextOf(scopeChain))?.localPoint;
    if (localCenter === undefined) {
      throw createLayoutProbeRecoverableError(
        `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
      );
    }

    const globalCenter = scopeChain.length === 0 ? localCenter : scopeTransformsContext.apply(localCenter, scopeChain);
    publishKernelObservation({ kind: 'coordinate' }, occurrence, frame, () => ({
      id: child.id,
      position: localCenter,
    }));
    const localCoordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: localCenter[0], y: localCenter[1], width: 0, height: 0, rotate: 0 } },
      { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
    );
    const coordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
      { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
    );
    runtime.state.namespaceStack.register(child.id, coordinateLayout, `${coordinateIrPath}.id`);
    frame.publicationSink.push(coordinateLayout);
    pushAllocation(frame.allocationSink, [localCenter], frame.allocationBoundary);
    layoutSink.push(localCoordinateLayout);
  };

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
  const queuePathChild = (
    child: PathChild,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    semanticOwner?: CompileSemanticOwner,
  ): void => {
    const { scopeChain, primitiveSink, locatorPrefix, pathSink, scopeDefaults } = frame;
    const pathIrPath = formatCompileChildPath(locatorPrefix, index, 'path');
    const placeholder = makePathPlaceholder();
    primitiveSink.push(placeholder);
    const pending: PendingPathEmission = {
      ancestors: frame.ancestors,
      path: {
        ...child,
        animations: filterAnimations(child.animations, {
          target: 'element',
          onWarn: runtime.context.onWarn,
          irPath: pathIrPath,
        }),
      },
      irPath: pathIrPath,
      scopeChain,
      boundsSink: frame.boundsSink,
      allocationSink: frame.allocationSink,
      ...(frame.allocationBoundary === undefined ? {} : { allocationBoundary: frame.allocationBoundary }),
      placeholderSlot: { primitiveSink, placeholder },
      occurrence,
      observationSink: frame.compileObservationSink,
      theme: frame.theme,
      scopeDefaults,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      zIndex: child.zIndex,
    };
    runtime.state.placeholderBalance++;
    pathSink.push(pending);
  };

  /** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
  const registerScopeLayoutPlaceholder = (
    child: ScopeChild,
    input: ScopeLayoutPlaceholderContext,
  ): ScopeLayoutPlaceholder => {
    const { index, frame } = input;
    const { locatorPrefix } = frame;
    const scopeIrPath = formatCompileChildPath(locatorPrefix, index, 'scope');
    const parentFrameDepth = runtime.state.namespaceStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = createScopePlaceholderLayout(child.id, frame.scopeChain, {
      shapes: runtime.context.shapes,
      boundaries: runtime.context.boundaries,
    });
    runtime.state.namespaceStack.register(child.id, placeholderLayout, `${scopeIrPath}.id`, 'scope-placeholder');

    return { parentFrameDepth, placeholderLayout };
  };

  /** 在需要可见输出时 emit scope group，并挂载 transform、clip 和动画 */
  const emitScopeGroup = (child: ScopeChild, input: EmitScopeGroupContext): string | undefined => {
    const { index, scopeTransforms, scopePrimitiveSink, frame, resolvedClipPath, semanticOwner } = input;
    const { primitiveSink, locatorPrefix } = frame;
    const scopeIrPath = formatCompileChildPath(locatorPrefix, index, 'scope');
    const hasScopeTransforms = scopeTransforms.length > 0;
    const isPrunable =
      scopePrimitiveSink.length === 0 && !hasScopeTransforms && child.id === undefined && child.clip === undefined;
    if (isPrunable) return;

    const group: GroupPrimitive = {
      type: 'group',
      children: stableSortByZIndex(sealSink(scopePrimitiveSink), runtime.state.zIndexOf),
    };
    if (child.id !== undefined) group.id = child.id;
    if (child.meta !== undefined) group.meta = child.meta;
    const scopeAnimations = filterAnimations(child.animations, {
      target: 'element',
      onWarn: runtime.context.onWarn,
      irPath: scopeIrPath,
    });
    if (scopeAnimations !== undefined) group.animations = scopeAnimations;
    if (hasScopeTransforms) group.transforms = [...scopeTransforms];
    if (resolvedClipPath !== undefined) {
      group.clipRef = runtime.context.clip.importPath(resolvedClipPath);
    } else if (child.clip !== undefined) {
      group.clipRef = runtime.context.clip.register(
        resolveClipValue(child.clip, { clips: runtime.context.clips, irPath: `${scopeIrPath}.clip` }),
      );
    }

    primitiveSink.push(group);
    if (semanticOwner !== undefined) runtime.state.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
    recordPrimitiveZIndex(runtime.state.zIndexOf, group, child.zIndex);

    return group.clipRef;
  };

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
  const compileScopeChild = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
    generatedOccurrence?: CompileOccurrenceLocator,
    compositeDepth = options.compositeDepth ?? 0,
    semanticOwner?: CompileSemanticOwner,
    compileNested?: (scopeFrame: TraversalFrame, preliminaryTransforms: ReadonlyArray<Transform> | undefined) => void,
    preResolvedClipPath?: SceneClipPath,
  ): void => {
    const { locatorPrefix, scopeDefaults } = frame;
    const scopeOccurrence = generatedOccurrence ?? {
      sourcePath: formatCompileChildPath(locatorPrefix, index, 'scope'),
      expansionPath: [],
    };
    const scopeAncestors: TraversalFrame['ancestors'] = [
      ...frame.ancestors,
      { owner: { kind: 'scope' }, occurrence: scopeOccurrence },
    ];
    const themePath =
      generatedOccurrence === undefined
        ? `${formatCompileChildPath(locatorPrefix, index, 'scope')}.theme`
        : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
    const theme = resolveTheme(frame.theme, child.theme, themePath, context.themeDefinitions);
    const scopeGeometryContext = {
      positionContext: positionContextOf(frame.scopeChain),
      irPath: formatCompileChildPath(locatorPrefix, index, 'scope'),
      onWarn: runtime.context.onWarn,
    };
    const positionTarget = resolveScopePositionTarget(child, scopeGeometryContext);

    // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
    // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 publication/observation
    const preliminaryTransforms = resolvePreliminaryScopeTransforms(child, scopeGeometryContext);
    const preliminaryScopeChain =
      preliminaryTransforms === undefined
        ? frame.scopeChain
        : scopeTransformsContext.append(frame.scopeChain, preliminaryTransforms);
    const layoutPlaceholder = registerScopeLayoutPlaceholder(child, { index, frame });
    if (layoutPlaceholder.placeholderLayout !== undefined) {
      runtime.state.namespaceStack.enterScope(layoutPlaceholder.placeholderLayout, child.id!);
    }

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) {
      runtime.state.namespaceStack.pushFrame();
      runtime.state.provenanceTracker?.pushNamespaceFrame();
    }

    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<NodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    const scopePublications: Array<NodeLayout> = [];
    const scopeBounds: TraversalFrame['boundsSink'] = [];
    const scopeAllocations: TraversalFrame['allocationSink'] = [];
    const scopeAlignmentGuides: TraversalFrame['alignmentGuideSink'] = [];
    const scopeObservations: TraversalFrame['observationSink'] = [];
    const scopeArtifacts: TraversalFrame['artifactSink'] = [];
    const scopeCompileObservations: TraversalFrame['compileObservationSink'] = [];
    const scopeSpatialHandles: TraversalFrame['spatialHandleSink'] = [];
    let scopeTransforms: Array<Transform> = [];

    try {
      const scopeFrame: TraversalFrame = {
        runtimeInputs: frame.runtimeInputs,
        ancestors: scopeAncestors,
        childProposal: frame.childProposal,
        scopeChain: preliminaryScopeChain,
        primitiveSink: scopePrimitiveSink,
        locatorPrefix: `${formatCompileChildPath(locatorPrefix, index, 'scope')}.`,
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        scopeDefaults: resolveScopeDefaults(child, scopeDefaults),
        theme,
        publicationSink: scopePublications,
        boundsSink: scopeBounds,
        allocationSink: scopeAllocations,
        alignmentGuideSink: scopeAlignmentGuides,
        ...(frame.allocationBoundary === undefined ? {} : { allocationBoundary: frame.allocationBoundary }),
        observationSink: scopeObservations,
        artifactSink: scopeArtifacts,
        compileObservationSink: scopeCompileObservations,
        spatialHandleSink: scopeSpatialHandles,
        spatialOwnerPath: frame.spatialOwnerPath,
        ...(semanticOwner === undefined ? {} : { semanticOwner }),
      };
      if (compileNested === undefined) {
        compileChildren(child.children, scopeFrame, false, generatedOccurrence, compositeDepth);
      } else {
        compileNested(scopeFrame, preliminaryTransforms);
      }

      const intrinsicLayout = createIntrinsicScopeLayout(child, scopeLayouts, runtime.context);

      scopeTransforms = resolveFinalScopeTransforms(
        child,
        scopeGeometryContext,
        intrinsicLayout,
        positionTarget,
        preliminaryTransforms,
      );
      publishKernelObservation(
        { kind: 'scope' },
        scopeOccurrence,
        {
          ...scopeFrame,
          ancestors: frame.ancestors,
          scopeChain: scopeTransformsContext.append(frame.scopeChain, scopeTransforms),
          compileObservationSink: frame.compileObservationSink,
        },
        () => ({
          envelope:
            scopeLayouts.length === 0
              ? null
              : {
                  shape: child.boundingShape === ScopeBoundingShape.Circle ? 'circle' : 'rectangle',
                  rect: intrinsicLayout.geometry.rect,
                },
        }),
      );

      const postTransforms =
        preliminaryTransforms === undefined
          ? scopeTransforms
          : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);

      for (const layout of scopePublications) {
        const projected = projectPublishedCompileLayout(layout, frame.scopeChain, postTransforms);
        runtime.state.namespaceStack.replacePublishedLayout(layout, projected);
        frame.publicationSink.push(projected);
      }

      for (const observation of scopeObservations) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
        frame.observationSink.push(observation);
      }

      frame.artifactSink.push(...scopeArtifacts);

      for (const observation of scopeCompileObservations) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
      }

      for (const spatialHandle of scopeSpatialHandles) {
        spatialHandle.scopeChain = scopeTransformsContext.insert(
          spatialHandle.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
        frame.spatialHandleSink.push(spatialHandle);
      }

      for (const pendingPath of scopePendingPaths) {
        pendingPath.scopeChain = scopeTransformsContext.insert(
          pendingPath.scopeChain,
          frame.scopeChain.length,
          postTransforms,
        );
      }

      const finalEnvelope =
        scopeTransforms.length === 0
          ? intrinsicLayout
          : scopeTransformsContext.project(intrinsicLayout, scopeTransforms);
      frame.layoutSink.push(...projectScopeCompileLayouts(child, intrinsicLayout, scopeLayouts, scopeTransforms));
      if (child.id !== undefined) {
        const globalEnvelope = scopeTransformsContext.project(finalEnvelope, frame.scopeChain);
        runtime.state.namespaceStack.replaceLayout(
          child.id,
          globalEnvelope,
          layoutPlaceholder.parentFrameDepth,
          layoutPlaceholder.placeholderLayout,
        );
        frame.publicationSink.push(globalEnvelope);
      }

      flushPendingPathEmissions(scopePendingPaths);
      options.captureScopeTargets?.(
        child,
        runtime.state.namespaceStack,
        scopeTransformsContext.append(frame.scopeChain, scopeTransforms),
      );
      frame.compileObservationSink.push(...scopeCompileObservations);

      for (const contribution of effectiveAllocations(scopeAllocations)) {
        pushAllocation(
          frame.allocationSink,
          contribution.boundsPoints.map(point => scopeTransformsContext.apply(point, scopeTransforms)),
          frame.allocationBoundary,
        );
      }

      const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
      const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
      if (transformedGuides !== undefined) frame.alignmentGuideSink.push(...transformedGuides);
    } finally {
      if (layoutPlaceholder.placeholderLayout !== undefined) runtime.state.namespaceStack.leaveScope();
      if (didPushNamespaceFrame) {
        runtime.state.namespaceStack.popFrame();
        runtime.state.provenanceTracker?.popNamespaceFrame();
      }
    }

    const clipRef = emitScopeGroup(child, {
      index,
      scopeTransforms,
      scopePrimitiveSink,
      frame,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      ...(preResolvedClipPath === undefined ? {} : { resolvedClipPath: preResolvedClipPath }),
    });

    for (const contribution of scopeBounds) {
      if (contribution.decoration === true) {
        const bounds = collectLayoutBounds(undefined, contribution.boundsPoints);
        if (bounds === undefined) continue;

        const rectangle = boundsToRect(bounds);
        const projected = optionalVisualBoundsOfPrimitives(
          [
            {
              type: 'group',
              transforms: scopeTransforms,
              ...(clipRef === undefined ? {} : { clipRef }),
              children: [{ type: 'rect', ...rectangle, fill: 'black' }],
            },
          ],
          context.clip.resources(),
        );
        if (projected !== undefined)
          frame.boundsSink.push({ boundsPoints: allocationPointsOf(projected), decoration: true });
      } else {
        frame.boundsSink.push({
          boundsPoints: contribution.boundsPoints.map(point => scopeTransformsContext.apply(point, scopeTransforms)),
          shadow: contribution.shadow,
        });
      }
    }

    publishClipObservation(clipRef, scopeOccurrence, {
      ...frame,
      ancestors: scopeAncestors,
      theme,
      scopeDefaults: resolveScopeDefaults(child, scopeDefaults),
      scopeChain: scopeTransformsContext.append(frame.scopeChain, scopeTransforms),
    });
  };

  const emptyBounds = (): Readonly<BoundsRect> => canonicalizeBoundsRect({ x: 0, y: 0, width: 0, height: 0 });

  const boundsRectOf = (result: TraversalResult): Readonly<BoundsRect> =>
    (() => {
      const allocation = effectiveAllocations(result.allocations).reduce(
        (current, contribution) => collectLayoutBounds(current, contribution.boundsPoints),
        undefined as TraversalResult['layoutBounds'],
      );
      return allocation === undefined ? emptyBounds() : canonicalizeBoundsRect(boundsToRect(allocation));
    })();

  /** 把矩形转换为父 allocation collector 使用的四角点 */
  const allocationPointsOf = (bounds: Readonly<BoundsRect>): Array<IRPosition> => [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];

  /** 验证 layout-aware composite 显式声明的 container allocation */
  const validateAllocationBounds = (
    bounds: unknown,
    compositeKey: string,
    occurrence: CompileOccurrenceLocator,
  ): Readonly<BoundsRect> => {
    if (bounds === null || typeof bounds !== 'object' || Array.isArray(bounds)) {
      throw createCompositeContractError(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned an invalid allocationBounds.`,
      );
    }

    const input = bounds as Record<string, unknown>;
    const unsupportedKeys = Object.keys(input).filter(key => !['x', 'y', 'width', 'height'].includes(key));
    const [x, y, width, height] = [input.x, input.y, input.width, input.height];
    if (
      unsupportedKeys.length > 0 ||
      ![x, y, width, height].every(value => typeof value === 'number' && Number.isFinite(value)) ||
      (width as number) < 0 ||
      (height as number) < 0
    ) {
      throw createCompositeContractError(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned invalid allocationBounds; x/y must be finite and width/height must be finite non-negative numbers.`,
      );
    }

    const right = (x as number) + (width as number);
    const bottom = (y as number) + (height as number);
    if (!Number.isFinite(right) || !Number.isFinite(bottom)) {
      throw createCompositeContractError(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned invalid allocationBounds; derived edges must remain finite.`,
      );
    }

    return Object.freeze({
      x: Object.is(x, -0) ? 0 : (x as number),
      y: Object.is(y, -0) ? 0 : (y as number),
      width: Object.is(width, -0) ? 0 : (width as number),
      height: Object.is(height, -0) ? 0 : (height as number),
    });
  };

  const replayOccurrence = (
    parent: CompileOccurrenceLocator,
    index: number,
    origin: CompileOccurrenceLocator,
    child: CompileOccurrenceLocator,
  ): CompileOccurrenceLocator => ({
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: CompileExpansionKind.Replay, index },
      ...child.expansionPath.slice(origin.expansionPath.length),
    ],
  });

  type PreparedReplay = Readonly<{
    transaction: CompositeReplayTransaction;
    wrapperClipPath?: SceneClipPath;
  }>;

  /** replay transaction 捕获的 primitive resource ref 必须在提交前完整可解析 */
  const validateReplayResourceRefs = (transaction: CompositeReplayTransaction): void => {
    const replayResourceIds = new Set(transaction.resources.map(resource => resource.id));

    const visit = (primitive: ScenePrimitive): void => {
      if (primitive.type === 'group') {
        if (primitive.clipRef !== undefined && !replayResourceIds.has(primitive.clipRef)) {
          throw createCompileInvariantError(`internal: replay clip resource '${primitive.clipRef}' was not captured`);
        }

        primitive.children.forEach(visit);

        return;
      }

      if (primitive.type === 'text') return;

      for (const paint of [primitive.fill, primitive.stroke]) {
        if (paint !== undefined && typeof paint === 'object' && paint.kind !== 'contextStroke') {
          if (!replayResourceIds.has(paint.id)) {
            throw createCompileInvariantError(`internal: replay paint resource '${paint.id}' was not captured`);
          }
        }
      }
    };

    transaction.primitives.forEach(visit);
  };

  const commitReplay = (
    token: CompositeReplay,
    wrapper: CompositeReplayWrapper | undefined,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    outputIndex: number,
    preparedReplays: ReadonlyMap<CompositeReplay, PreparedReplay>,
    semanticOwner?: CompileSemanticOwner,
    authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
  ): void => {
    const prepared = preparedReplays.get(token);
    if (prepared === undefined) throw createCompileInvariantError('internal: replay was not preflighted before commit');

    const { wrapperClipPath } = prepared;
    const transaction =
      prepared.transaction.materialize !== undefined &&
      (prepared.transaction.styleFingerprint !== replayStyleFingerprint(frame.scopeDefaults) ||
        prepared.transaction.themeFingerprint !== replayThemeFingerprint(frame.theme))
        ? prepared.transaction.materialize({
            scopeChain: frame.scopeChain,
            scopeDefaults: frame.scopeDefaults,
            theme: frame.theme,
          })
        : prepared.transaction;
    validateReplayResourceRefs(transaction);

    const transforms = wrapper?.transforms;
    const authoredPreliminary = transaction.scopeChainApplied ? undefined : authoredPreliminaryTransforms;
    const resourceIds = importSceneResources(transaction.resources, runtime.context.paint, runtime.context.clip);

    const wrapperClipRef = wrapperClipPath === undefined ? undefined : runtime.context.clip.importPath(wrapperClipPath);
    publishClipObservation(
      wrapperClipRef,
      replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, transaction.originOccurrence),
      frame,
    );
    const replayedPrimitives = transaction.primitives.map(primitive => remapPrimitiveResources(primitive, resourceIds));
    const committedPrimitives: Array<ScenePrimitive> = [];
    if ((transforms === undefined || transforms.length === 0) && wrapperClipRef === undefined) {
      replayedPrimitives.forEach((primitive, index) => {
        frame.primitiveSink.push(primitive);
        committedPrimitives.push(primitive);
        recordPrimitiveZIndex(runtime.state.zIndexOf, primitive, transaction.primitiveZIndices[index]);
      });
    } else {
      replayedPrimitives.forEach((primitive, index) => {
        const placed: ScenePrimitive =
          transforms === undefined || transforms.length === 0
            ? primitive
            : { type: 'group', transforms: [...transforms], children: [primitive] };
        const wrapped: GroupPrimitive =
          wrapperClipRef === undefined
            ? (placed as GroupPrimitive)
            : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
        frame.primitiveSink.push(wrapped);
        committedPrimitives.push(wrapped);
        recordPrimitiveZIndex(runtime.state.zIndexOf, wrapped, transaction.primitiveZIndices[index]);
      });
    }

    if (semanticOwner !== undefined) {
      runtime.state.provenanceTracker?.recordPrimitives(committedPrimitives, semanticOwner, 'composite-replay');
      transaction.topologyIdentityIds.forEach(id =>
        runtime.state.provenanceTracker?.registerGeneratedIdentity(id, semanticOwner),
      );
    }

    const suppressedNamespaceWarnings = new Set<CompileWarningInput>();
    const namespaceParentChain =
      authoredPreliminary === undefined
        ? frame.scopeChain
        : frame.scopeChain.slice(0, frame.scopeChain.length - authoredPreliminary.length);
    const namespaceTransforms = [...(authoredPreliminary ?? []), ...(transforms ?? [])];
    const publishedLayouts = new Map<NodeLayout, NodeLayout>();

    for (const [changeIndex, change] of transaction.namespaceChanges.entries()) {
      const previousLayout = change.entry.layout;
      const alreadyPublished = publishedLayouts.get(previousLayout);
      const projectedLayout =
        alreadyPublished ?? projectPublishedCompileLayout(previousLayout, namespaceParentChain, namespaceTransforms);
      const projectedChange = { ...change, entry: { ...change.entry, layout: projectedLayout } };

      const changeOccurrence = transaction.namespaceChangeOccurrences[changeIndex] ?? occurrence;
      const committedAgainstBaseline = withWarningOccurrence(
        replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
        () => runtime.state.namespaceStack.commitForkChange(projectedChange),
      );
      if (change.overwroteBaseline && !committedAgainstBaseline) {
        const baselineWarning = transaction.namespaceBaselineWarnings.find(candidate => candidate.id === change.id);
        if (baselineWarning !== undefined) suppressedNamespaceWarnings.add(baselineWarning.warning);
      }

      if (alreadyPublished === undefined) frame.publicationSink.push(projectedLayout);
      publishedLayouts.set(previousLayout, projectedLayout);
    }

    for (const layout of transaction.layouts) {
      frame.layoutSink.push(
        transforms === undefined || transforms.length === 0
          ? layout
          : scopeTransformsContext.project(layout, transforms),
      );
    }

    if (wrapperClipRef === undefined) {
      for (const contribution of transaction.bounds) {
        frame.boundsSink.push({
          boundsPoints:
            transforms === undefined || transforms.length === 0
              ? contribution.boundsPoints
              : contribution.boundsPoints.map(point => scopeTransformsContext.apply(point, transforms)),
          shadow: contribution.shadow,
          ...(contribution.decoration === undefined ? {} : { decoration: contribution.decoration }),
        });
      }
    } else {
      const visualBounds = optionalVisualBoundsOfPrimitives(committedPrimitives, [
        ...runtime.context.paint.resources(),
        ...runtime.context.clip.resources(),
      ]);
      if (visualBounds !== undefined)
        frame.boundsSink.push({
          boundsPoints: allocationPointsOf(visualBounds),
          ...(transaction.bounds.some(contribution => contribution.decoration === true) ? { decoration: true } : {}),
        });
    }

    for (const contribution of effectiveAllocations(transaction.allocations)) {
      pushAllocation(
        frame.allocationSink,
        transforms === undefined || transforms.length === 0
          ? contribution.boundsPoints
          : contribution.boundsPoints.map(point => scopeTransformsContext.apply(point, transforms)),
        frame.allocationBoundary,
      );
    }

    for (const observation of transaction.observations) {
      if (authoredPreliminary !== undefined && authoredPreliminary.length > 0) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length - authoredPreliminary.length,
          authoredPreliminary,
        );
      }

      if (transforms !== undefined && transforms.length > 0) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length,
          transforms,
        );
      }

      frame.observationSink.push({
        ...observation,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, observation.occurrence),
      });
    }

    for (const warning of transaction.warnings) {
      if (!suppressedNamespaceWarnings.has(warning)) {
        runtime.context.onWarn(
          replaceCompileWarningOccurrence(
            warning,
            replayOccurrence(
              occurrence,
              outputIndex,
              transaction.originOccurrence,
              compileWarningOccurrenceOf(warning),
            ),
          ),
        );
      }
    }

    for (const artifact of transaction.artifacts) {
      frame.artifactSink.push(
        freezeCompileArtifact({
          ...artifact,
          occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, artifact.occurrence),
        }),
      );
    }

    for (const pending of transaction.spatialHandles) {
      const spatialHandle = replayPendingSpatialHandle(pending, occurrence, outputIndex, transaction.originOccurrence);
      if (authoredPreliminary !== undefined && authoredPreliminary.length > 0) {
        spatialHandle.scopeChain = scopeTransformsContext.insert(
          spatialHandle.scopeChain,
          frame.scopeChain.length - authoredPreliminary.length,
          authoredPreliminary,
        );
      }

      if (transforms !== undefined && transforms.length > 0) {
        spatialHandle.scopeChain = scopeTransformsContext.insert(
          spatialHandle.scopeChain,
          frame.scopeChain.length,
          transforms,
        );
      }

      frame.spatialHandleSink.push(spatialHandle);
    }

    for (const observation of transaction.compileObservations) {
      if (authoredPreliminary !== undefined && authoredPreliminary.length > 0) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length - authoredPreliminary.length,
          authoredPreliminary,
        );
      }

      if (transforms !== undefined && transforms.length > 0) {
        observation.scopeChain = scopeTransformsContext.insert(
          observation.scopeChain,
          frame.scopeChain.length,
          transforms,
        );
      }

      frame.compileObservationSink.push({
        ...observation,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, observation.occurrence),
        ancestors: [
          ...frame.ancestors,
          ...observation.ancestors
            .filter(
              ancestor =>
                ancestor.occurrence.sourcePath === transaction.originOccurrence.sourcePath &&
                ancestor.occurrence.expansionPath.length >= transaction.originOccurrence.expansionPath.length &&
                transaction.originOccurrence.expansionPath.every(
                  (segment, index) =>
                    segment.kind === ancestor.occurrence.expansionPath[index]?.kind &&
                    segment.index === ancestor.occurrence.expansionPath[index]?.index,
                ),
            )
            .map(ancestor => ({
              ...ancestor,
              occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, ancestor.occurrence),
            })),
        ],
      });
    }
  };

  /** opaque handle 只由当前 compile session 的 identity table 识别 */
  const isCompositeOutputHandle = (output: unknown): output is CompositeCompileChild | CompositeBoundChild =>
    output !== null && typeof output === 'object' && runtime.context.session.outputChildren.has(output);

  type PreparedRuntimeOutput = Readonly<{
    output: CompositeRuntimeOutputChild;
    scopeClipPath?: SceneClipPath;
  }>;

  type PreparedCompositeOutputs = Readonly<{
    outputs: ReadonlyMap<object, PreparedRuntimeOutput>;
    replays: ReadonlyMap<CompositeReplay, PreparedReplay>;
  }>;

  /** 递归预检完整 runtime output tree；成功后统一消费 handle 与 replay token */
  const preflightCompositeOutputs = (
    outputs: ReadonlyArray<unknown>,
    owner: CompositeCompileOwner,
  ): PreparedCompositeOutputs => {
    const preparedOutputs = new Map<object, PreparedRuntimeOutput>();
    const preparedReplays = new Map<CompositeReplay, PreparedReplay>();
    const reachableSpatialHandleIds = new Set<string>();
    const entriesToConsume: Array<{ used: boolean }> = [];
    const transactionsToConsume: Array<CompositeReplayTransaction> = [];

    const visitHandle = (handle: unknown): void => {
      if (handle === null || typeof handle !== 'object') {
        throw createCompositeContractError(`${owner.label} received an invalid or forged output child.`);
      }

      const entry = runtime.context.session.outputChildren.get(handle);
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
        for (const declaration of entry.child.spatialHandles ?? []) {
          for (const id of [declaration.id, ...(declaration.aliasIds ?? [])]) {
            if (reachableSpatialHandleIds.has(id)) {
              throw createCompositeContractError(
                `${owner.label} declared duplicate spatial handle id '${id}' across reachable runtime Scopes.`,
              );
            }

            reachableSpatialHandleIds.add(id);
          }
        }

        const scopeClipPath =
          entry.child.props.clip === undefined
            ? undefined
            : runtime.context.clip.lower(
                resolveClipValue(entry.child.props.clip, { clips: runtime.context.clips, irPath: 'clip' }),
              );
        preparedOutputs.set(handle, {
          output: entry.child,
          ...(scopeClipPath === undefined ? {} : { scopeClipPath }),
        });

        for (const child of entry.child.children) if (isCompositeOutputHandle(child)) visitHandle(child);

        return;
      }

      preparedOutputs.set(handle, { output: entry.child });
      const transaction = runtime.context.session.replayTransactions.get(entry.child.replay);
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
          : runtime.context.clip.lower(
              resolveClipValue(entry.child.wrapper.clip, { clips: runtime.context.clips, irPath: 'clip' }),
            );
      validateReplayResourceRefs(transaction);
      preparedReplays.set(entry.child.replay, {
        transaction,
        ...(wrapperClipPath === undefined ? {} : { wrapperClipPath }),
      });
      transactionsToConsume.push(transaction);
    };

    for (const output of outputs) if (isCompositeOutputHandle(output)) visitHandle(output);
    entriesToConsume.forEach(entry => (entry.used = true));
    transactionsToConsume.forEach(transaction => (transaction.used = true));

    return { outputs: preparedOutputs, replays: preparedReplays };
  };

  /** 把 runtime Scope props 投影到普通 Scope orchestration 接受的结构 child */
  const runtimeScopeChildOf = (props: CompositeCompileScopeProps): ScopeChild => {
    const { transforms, animations, ...rest } = props;
    return {
      type: 'scope',
      ...rest,
      ...(transforms === undefined ? {} : { transforms: [...transforms] }),
      ...(animations === undefined ? {} : { animations: [...animations] }),
      children: [],
    };
  };

  /** 递归提交当前 callback 的 runtime output child */
  const compileRuntimeOutputChild = (
    output: CompositeRuntimeOutputChild,
    index: number,
    frame: TraversalFrame,
    parentOccurrence: CompileOccurrenceLocator,
    ownerOccurrence: CompileOccurrenceLocator,
    scopeSegment:
      | typeof CompileExpansionKind.Output
      | typeof CompileExpansionKind.ScopeChild
      | typeof CompileExpansionKind.Output,
    compositeDepth: number,
    owner: CompositeCompileOwner,
    prepared: PreparedCompositeOutputs,
    semanticOwner?: CompileSemanticOwner,
    preparedScopeClipPath?: SceneClipPath,
    authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
  ): void => {
    if (output.kind === 'bound') {
      const boundOccurrence: CompileOccurrenceLocator = {
        sourcePath: parentOccurrence.sourcePath,
        expansionPath: [...parentOccurrence.expansionPath, { kind: scopeSegment, index }],
      };
      compileChild(
        output.child,
        index,
        { ...frame, runtimeInputs: output.runtimeInputs },
        boundOccurrence,
        compositeDepth,
        true,
        semanticOwner === undefined
          ? undefined
          : runtime.state.provenanceTracker?.createGeneratedOwner(output.child, index, semanticOwner),
      );

      return;
    }

    if (output.kind === 'replay') {
      commitReplay(
        output.replay,
        output.wrapper,
        frame,
        parentOccurrence,
        index,
        prepared.replays,
        semanticOwner,
        authoredPreliminaryTransforms,
      );
      return;
    }

    const runtimeScopeChild = runtimeScopeChildOf(output.props);
    const scopeSemanticOwner =
      semanticOwner === undefined
        ? undefined
        : runtime.state.provenanceTracker?.createGeneratedOwner(runtimeScopeChild, index, semanticOwner);
    const scopeOccurrence: CompileOccurrenceLocator = {
      sourcePath: parentOccurrence.sourcePath,
      expansionPath: [...parentOccurrence.expansionPath, { kind: scopeSegment, index }],
    };
    compileScopeChild(
      runtimeScopeChild,
      index,
      frame,
      scopeOccurrence,
      compositeDepth,
      scopeSemanticOwner,
      (scopeFrame, scopePreliminaryTransforms) => {
        for (const declaration of output.spatialHandles ?? []) {
          scopeFrame.spatialHandleSink.push({
            ownerPath: scopeFrame.spatialOwnerPath,
            declaration,
            finalOccurrence: freezeOccurrence(ownerOccurrence),
            originOccurrence: freezeOccurrence(ownerOccurrence),
            scopeChain: scopeFrame.scopeChain,
          });
        }

        for (const [childIndex, child] of output.children.entries()) {
          if (!isCompositeOutputHandle(child)) {
            const childOccurrence: CompileOccurrenceLocator = {
              sourcePath: scopeOccurrence.sourcePath,
              expansionPath: [
                ...scopeOccurrence.expansionPath,
                { kind: CompileExpansionKind.ScopeChild, index: childIndex },
              ],
            };
            compileChild(
              child,
              childIndex,
              { ...scopeFrame, runtimeInputs: undefined },
              childOccurrence,
              compositeDepth,
              true,
              scopeSemanticOwner === undefined
                ? undefined
                : runtime.state.provenanceTracker?.createGeneratedOwner(child, childIndex, scopeSemanticOwner),
            );
            continue;
          }

          const preparedChild = prepared.outputs.get(child);
          if (preparedChild === undefined) {
            throw createCompileInvariantError('internal: runtime Scope output child was not preflighted');
          }

          compileRuntimeOutputChild(
            preparedChild.output,
            childIndex,
            scopeFrame,
            scopeOccurrence,
            ownerOccurrence,
            'scopeChild',
            compositeDepth,
            owner,
            prepared,
            scopeSemanticOwner,
            preparedChild.scopeClipPath,
            scopePreliminaryTransforms,
          );
        }
      },
      preparedScopeClipPath,
    );
  };

  const compileCompositeChild = (
    child: Extract<IRChild, { namespace: string }>,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    semanticOwner?: CompileSemanticOwner,
  ): void => {
    const compositeIrPath = formatCompileChildPath(frame.locatorPrefix, index);
    const binding = bindComposite(child, runtime.context.composites);
    const { key } = binding;
    if (binding.kind === 'unregistered') {
      if (options.probe === true) {
        throw createLayoutProbeRecoverableError(
          `No composite registered for '${key}' at ${formatCompileOccurrence(occurrence)}`,
          { providerKey: key, occurrence },
        );
      }

      runtime.context.onWarn({
        code: BuiltinCompileWarningCode.CompositeNotRegistered,
        message: `No composite registered for '${key}'; the node is skipped.`,
        path: compositeIrPath,
      });

      return;
    }

    if (compositeDepth >= runtime.context.maxCompositeDepth) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `COMPOSITE_NEST_TOO_DEEP: composite expansion exceeded ${runtime.context.maxCompositeDepth} levels at ${occurrence.sourcePath}`,
      );
    }

    const resolution = resolveComposite(binding, occurrence.sourcePath);
    const owner: CompositeCompileOwner = {
      label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
    };

    const sourceInputs = frame.runtimeInputs ?? { source: child, bindings: [] };
    const authoredChildren = new Map<string, CompositeBoundChild>();
    const runtimeInputContext: CompositeRuntimeInputContext = Object.freeze({
      runtimeInput: sourceInputs.bindings.find(input => input.path.length === 0)?.input,
      selectSourceChild: path => {
        const pathKey = JSON.stringify(path);
        const existing = authoredChildren.get(pathKey);
        if (existing !== undefined) return existing;

        const selected = createCompositeBoundChild(
          runtime.context.session,
          owner,
          selectCompositeInputScope(sourceInputs, path),
        );
        authoredChildren.set(pathKey, selected);

        return selected;
      },
      bindChild: (nextChild, inputs) =>
        createCompositeBoundChild(runtime.context.session, owner, captureCompositeInputScope(nextChild, inputs)),
    });

    const parsedId = (resolution.node as Record<string, unknown>).id;
    const spatialOwner: SpatialHandleOwner = Object.freeze({
      namespace: child.namespace,
      type: child.type,
      ...(typeof parsedId === 'string' ? { instanceId: parsedId } : {}),
      occurrence: freezeOccurrence(occurrence),
    });
    const spatialOwnerPath = Object.freeze([...frame.spatialOwnerPath, spatialOwner]);
    const observationOwner = Object.freeze({
      kind: 'composite' as const,
      namespace: child.namespace,
      type: child.type,
    });

    const childAncestors: TraversalFrame['ancestors'] = [...frame.ancestors, { owner: observationOwner, occurrence }];
    const callable = resolution;
    const observerKeys =
      callable.artifactSchema === undefined || runtime.context.observation === undefined
        ? []
        : runtime.context.observation.select(
            Object.freeze({ owner: observationOwner, sourcePath: occurrence.sourcePath }),
          );
    let callbackResult: unknown;
    let layoutProbeIndex = 0;
    // 回调内只保留查询事实，不持有可消费的 replay 或目标解析游标
    const queryEnvironments = new Map<
      string,
      Readonly<{ namespaceStack: NamespaceStack; scopeChain: ReadonlyArray<Transform> }>
    >();
    let queryNamespaceIdentity = runtime.state.namespaceStack.measurementIdentity;

    const evaluateLayoutChild = (
      clonedChild: IRChild,
      clonedProposal: LayoutProposal,
      probeOccurrence: CompileOccurrenceLocator,
      probeScopeChain: ReadonlyArray<Transform>,
      probeScopeDefaults: TraversalFrame['scopeDefaults'],
      probeTheme: TraversalFrame['theme'],
      scopeChainApplied = false,
      probeInputs?: CompositeRuntimeInputScope,
      captureScopeTargets?: TraversalCompileOptions['captureScopeTargets'],
      measurementAxis?: LayoutMeasurementAxis,
    ) => {
      const warnings: Array<CompileWarningInput> = [];
      const namespaceBaselineWarnings: Array<{ id: string; warning: CompileWarningInput }> = [];

      const captureWarning = (warning: CompileWarningInput): void => {
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

        warnings.push(warning);
      };

      const paint = createPaintRegistry(context.round);
      const clip = createClipRegistry(context.round, context.maxClipDepth);
      const probeProvenanceTracker =
        runtime.state.provenanceTracker === undefined ? undefined : createCompileProvenanceTracker();
      let probeWarningOccurrence = probeOccurrence;
      const registrationOccurrences = new Map<string, CompileOccurrenceLocator>();
      const registrationKey = (frameDepth: number, id: string): string => `${frameDepth}\u0000${id}`;
      const namespaceBaseline = runtime.state.namespaceStack.fork();
      const namespaceStack = namespaceBaseline.fork({
        onDuplicate: info => {
          const warning = withCompileWarningOccurrence(createDuplicateWarning(info), probeWarningOccurrence);
          captureWarning(warning);
          if (info.overwroteForkBaseline) namespaceBaselineWarnings.push({ id: info.id, warning });
        },
        onRegister: info =>
          registrationOccurrences.set(
            registrationKey(info.frameDepth, info.id),
            freezeOccurrence(probeWarningOccurrence),
          ),
      });

      const sandboxContext: CompileContext = {
        ...context,
        onWarn: captureWarning,
        paint,
        clip,
      };

      const laid = compileChildrenToPrimitives([clonedChild], sandboxContext, {
        ancestors: childAncestors,
        namespaceStack,
        scopeChain: probeScopeChain,
        scopeDefaults: probeScopeDefaults,
        theme: probeTheme,
        occurrence: probeOccurrence,
        compositeDepth: compositeDepth + 1,
        generated: true,
        probe: true,
        proposal: clonedProposal,
        ...(measurementAxis === undefined ? {} : { measurementAxis }),
        session: runtime.context.session,
        runtimeInputs: probeInputs ?? { source: clonedChild, bindings: [] },
        ...(captureScopeTargets === undefined ? {} : { captureScopeTargets }),
        spatialOwnerPath,
        ...(probeProvenanceTracker === undefined ? {} : { provenanceTracker: probeProvenanceTracker }),
        observeWarningOccurrence: current => {
          probeWarningOccurrence = current ?? probeOccurrence;
        },
      });

      return {
        laid,
        paint,
        clip,
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

    const probeLayoutChild = (
      clonedChild: IRChild,
      clonedProposal: LayoutProposal,
      probeOccurrence: CompileOccurrenceLocator,
      probeScopeChain: ReadonlyArray<Transform>,
      probeScopeDefaults: TraversalFrame['scopeDefaults'],
      probeTheme: TraversalFrame['theme'],
      scopeChainApplied = false,
      probeInputs?: CompositeRuntimeInputScope,
      captureScopeTargets?: TraversalCompileOptions['captureScopeTargets'],
    ): Readonly<{
      layoutResult: LayoutChildResult;
      transaction: CompositeReplayTransaction;
      namespaceStack: NamespaceStack;
    }> => {
      const {
        laid,
        paint,
        clip,
        namespaceStack,
        namespaceBaseline,
        registrationOccurrences,
        registrationKey,
        namespaceBaselineWarnings,
        warnings,
        probeProvenanceTracker,
      } = evaluateLayoutChild(
        clonedChild,
        clonedProposal,
        probeOccurrence,
        probeScopeChain,
        probeScopeDefaults,
        probeTheme,
        scopeChainApplied,
        probeInputs,
        captureScopeTargets,
      );
      const token = Object.freeze({}) as CompositeReplay;
      const resources: Array<SceneResource> = [...paint.resources(), ...clip.resources()];
      const namespaceChanges = namespaceStack.diffTopFrame(namespaceBaseline);
      const probeFrameDepth = namespaceStack.depth - 1;
      const allocationBounds = validateAllocationBounds(boundsRectOf(laid), key, probeOccurrence);
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
        observations: laid.observations,
        namespaceChanges,
        namespaceChangeOccurrences: namespaceChanges.map(
          change => registrationOccurrences.get(registrationKey(probeFrameDepth, change.id)) ?? probeOccurrence,
        ),
        topologyIdentityIds: [...(probeProvenanceTracker?.rootIdentityRegistrations() ?? [])],
        namespaceBaselineWarnings,
        resources,
        warnings,
        artifacts: laid.artifacts,
        compileObservations: laid.compileObservations,
        spatialHandles: laid.spatialHandles,
        styleFingerprint: replayStyleFingerprint(probeScopeDefaults),
        themeFingerprint: replayThemeFingerprint(probeTheme),
        ...(scopeChainApplied ? { scopeChainApplied: true } : {}),
      };

      return { layoutResult, transaction, namespaceStack };
    };

    try {
      const createLayoutContext = (theme: TraversalFrame['theme']): CompositeCompileContext => ({
        ...runtimeInputContext,
        theme,
        withTheme: override =>
          createLayoutContext(resolveTheme(theme, override, `${compositeIrPath}.theme`, context.themeDefinitions)),
        proposal: cloneLayoutProposal(frame.childProposal ?? NaturalLayoutProposal, key, occurrence),
        evaluation:
          options.measurementAxis !== undefined && child === rootChildren[0]
            ? { kind: 'contribution', axis: options.measurementAxis }
            : { kind: 'layout' },
        measureChild: (nextChild, proposal, axis) => {
          const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
          const inputEntry = session.outputChildren.get(nextChild);
          if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
            throw createCompositeContractError(`${owner.label} measureChild requires a child from this callback`);
          const inputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
          const clonedChild = withProviderOutputValidationBoundary(owner.label, () =>
            snapshotCompositeLayoutChild(
              owner.label,
              inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
              layoutProbeIndex,
            ),
          );
          const probeOccurrence = freezeOccurrence({
            sourcePath: occurrence.sourcePath,
            expansionPath: [
              ...occurrence.expansionPath,
              { kind: CompileExpansionKind.Probe, index: layoutProbeIndex++ },
            ],
          });
          const identityOf = (dependency: unknown): string | number => {
            if ((typeof dependency !== 'object' || dependency === null) && typeof dependency !== 'function') {
              const existing = session.measurementPrimitiveIdentities.get(dependency);
              if (existing !== undefined) return existing;
              const identity = session.nextMeasurementIdentity++;
              if (session.measurementPrimitiveIdentities.size >= 4096) session.measurementPrimitiveIdentities.clear();
              session.measurementPrimitiveIdentities.set(dependency, identity);
              return identity;
            }
            const existing = session.measurementIdentities.get(dependency);
            if (existing !== undefined) return existing;
            const identity = session.nextMeasurementIdentity++;
            session.measurementIdentities.set(dependency, identity);
            return identity;
          };
          const cacheKey = JSON.stringify([
            identityOf(inputs?.source ?? nextChild),
            inputs === undefined ? identityOf(owner) : null,
            inputs?.sourcePath,
            clonedChild,
            axis,
            clonedProposal,
            frame.scopeDefaults,
            theme,
            frame.scopeChain,
            inputs?.bindings.map(input => [input.path, identityOf(input.input)]),
            identityOf(runtime.state.namespaceStack.measurementIdentity),
            compositeDepth,
          ]);
          const cached = session.measurements.get(cacheKey);
          if (cached !== undefined) {
            session.measurements.delete(cacheKey);
            session.measurements.set(cacheKey, cached);
            return { kind: 'resolved', result: cached };
          }
          try {
            const { laid } = evaluateLayoutChild(
              clonedChild,
              clonedProposal,
              probeOccurrence,
              frame.scopeChain,
              frame.scopeDefaults,
              theme,
              false,
              inputs,
              undefined,
              axis,
            );
            const allocation = laid.contribution ?? contributionOfBounds(axis, boundsRectOf(laid));
            const result = projectContribution(allocation, clonedProposal);
            session.measurements.set(cacheKey, result);
            if (session.measurements.size > 4096)
              session.measurements.delete(session.measurements.keys().next().value!);
            return { kind: 'resolved', result };
          } catch (thrown) {
            if (isFatalProbeError(thrown)) throw thrown;
            const failure = createLayoutChildFailure(
              session.failures,
              owner,
              normalizeLayoutProbeError(thrown),
              'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type,
              probeOccurrence,
            );
            return { kind: 'failed', failure };
          }
        },
        resolvePathTargets: query => {
          const queryChild = snapshotCompositeLayoutChild(owner.label, query.child, layoutProbeIndex++);
          const namespaceIdentity = runtime.state.namespaceStack.measurementIdentity;
          if (queryNamespaceIdentity !== namespaceIdentity) {
            queryEnvironments.clear();
            queryNamespaceIdentity = namespaceIdentity;
          }
          // Definition、测量器、绑定所有者与递归预算在当前回调内固定；派生 theme 按值区分
          const queryKey = JSON.stringify([queryChild, theme, frame.scopeDefaults, frame.scopeChain]);
          let environment = queryEnvironments.get(queryKey);
          if (environment === undefined) {
            let queryNamespace: NamespaceStack | undefined;
            let queryChain = frame.scopeChain;
            const probe = probeLayoutChild(
              queryChild,
              NaturalLayoutProposal,
              occurrence,
              frame.scopeChain,
              frame.scopeDefaults,
              theme,
              false,
              undefined,
              (scope, namespace, chain) => {
                if (scope !== queryChild) return;
                queryNamespace = namespace.fork();
                // 查询者位于被测子项之外；保留真正的祖先，但不把子项自身视为查询者的祖先
                if (scope.id !== undefined) queryNamespace.leaveScope();
                queryChain = chain;
              },
            );
            environment = { namespaceStack: queryNamespace ?? probe.namespaceStack, scopeChain: queryChain };
            queryEnvironments.set(queryKey, environment);
            if (queryEnvironments.size > 64) queryEnvironments.delete(queryEnvironments.keys().next().value!);
          } else {
            queryEnvironments.delete(queryKey);
            queryEnvironments.set(queryKey, environment);
          }
          // fork 隔离 resolving phase 与引用解析状态，缓存快照始终只读
          const targetNamespace = environment.namespaceStack.fork();
          const queryChain = environment.scopeChain;
          const positionContext = createPositionResolveContext({
            geometryContext: runtime.context.nodeGeometry,
            lookupReference: id => targetNamespace.lookupReference(id),
            nodeDistance: context.nodeDistance,
            scopeChain: queryChain,
            resolveExplicitBoundary,
          });
          targetNamespace.enterResolvingPhase();

          try {
            const bindingOf = (target: IRTarget) => {
              try {
                return bindPathTarget(target, positionContext);
              } catch (cause) {
                if (isFatalProbeError(cause)) throw cause;
                const pointIndex = query.points.indexOf(target);
                const field = target === query.source ? 'source' : `points[${pointIndex}]`;
                throw new RetikzCoreError({
                  code: RetikzCoreErrorCode.Compile,
                  message: `Path target query could not resolve ${field}.`,
                  details: { path: field },
                  cause,
                });
              }
            };

            const queryResolution = resolvePathValue(
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: query.source },
                  { type: 'step', kind: 'smooth', points: [...query.points] },
                ],
              },
              {
                mode: theme.mode,
                scopeChain: queryChain,
                targetResolver: {
                  pointOfTarget: target => bindingOf(target)?.point ?? null,
                  bindTarget: target => bindingOf(target),
                },
                paths: context.paths,
                arrows: context.arrows,
                marks: context.marks,
                patterns: context.patterns,
                round: context.round,
                irPath: 'query',
              },
            );

            const pointAt = (locator: string, field: string): IRPosition => {
              const point = queryResolution.targets.get(locator)?.point;
              if (point === undefined || point === null || !point.every(Number.isFinite))
                throw new RetikzCoreError({
                  code: RetikzCoreErrorCode.Compile,
                  message: `Path target query could not resolve ${field}.`,
                  details: { path: field },
                });

              return [point[0], point[1]];
            };

            return {
              source: pointAt('query.children[0].to', 'source'),
              points: query.points.map((_point, pointIndex) =>
                pointAt(`query.children[1].points[${pointIndex}]`, `points[${pointIndex}]`),
              ),
            };
          } finally {
            targetNamespace.exitResolvingPhase();
          }
        },
        warn: (code, message, subPath) =>
          runtime.context.onWarn({
            code,
            message,
            path: subPath === undefined || subPath.length === 0 ? compositeIrPath : `${compositeIrPath}.${subPath}`,
          }),
        layoutChild: (nextChild, proposal) => {
          const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
          const inputEntry = runtime.context.session.outputChildren.get(nextChild);
          if (inputEntry !== undefined && (inputEntry.owner !== owner || inputEntry.child.kind !== 'bound'))
            throw createCompositeContractError(
              `${owner.label} layoutChild requires an authored or bound child from this callback`,
            );

          const probeInputs = inputEntry?.child.kind === 'bound' ? inputEntry.child.runtimeInputs : undefined;
          const clonedChild = withProviderOutputValidationBoundary(owner.label, () =>
            snapshotCompositeLayoutChild(
              owner.label,
              inputEntry?.child.kind === 'bound' ? inputEntry.child.child : nextChild,
              layoutProbeIndex,
            ),
          );
          const probeOccurrence = freezeOccurrence({
            sourcePath: occurrence.sourcePath,
            expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Probe, index: layoutProbeIndex }],
          });
          layoutProbeIndex += 1;

          try {
            const probed = probeLayoutChild(
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
              probeLayoutChild(
                clonedChild,
                clonedProposal,
                probeOccurrence,
                scopeChain,
                scopeDefaults,
                replayTheme,
                true,
                probeInputs,
              ).transaction;
            runtime.context.session.replayTransactions.set(layoutResult.replay, transaction);
            runtime.context.session.layoutResults.set(layoutResult, { owner, replay: layoutResult.replay });

            return Object.freeze({ kind: LayoutChildProbeKind.Resolved, result: layoutResult });
          } catch (thrown) {
            if (isFatalProbeError(thrown)) throw thrown;

            const error = normalizeLayoutProbeError(thrown);
            const fallbackProviderKey =
              'namespace' in clonedChild ? `${clonedChild.namespace}.${clonedChild.type}` : clonedChild.type;
            const failure = createLayoutChildFailure(
              runtime.context.session.failures,
              owner,
              error,
              fallbackProviderKey,
              probeOccurrence,
            );

            return Object.freeze({ kind: LayoutChildProbeKind.Failed, failure });
          }
        },
        replay: (layoutResult, wrapper) =>
          createCompositeReplayChild(runtime.context.session, owner, layoutResult, wrapper),
        raise: failure => raiseLayoutChildFailure(runtime.context.session.failures, owner, failure),
        createScope: (props, children, spatialHandles) =>
          createCompositeScopeChild(runtime.context.session, owner, props, children, spatialHandles),
      });

      callbackResult = callable.compile(callable.node, createLayoutContext(frame.theme));
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

      throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Composite callback threw a non-Error value'), {
        cause: thrown,
        providerKey: key,
        occurrence,
      });
    } finally {
      queryEnvironments.clear();
    }

    const handledContribution = withProviderOutputValidationBoundary(owner.label, () => {
      if (
        callbackResult !== null &&
        typeof callbackResult === 'object' &&
        'kind' in callbackResult &&
        callbackResult.kind === 'contribution'
      ) {
        if (options.measurementAxis === undefined || child !== rootChildren[0])
          throw createCompositeContractError(`${owner.label} returned a contribution during full layout`);
        const candidate = callbackResult as CompositeContributionResult;
        const contribution = candidate.contribution;
        if (contribution.axis !== options.measurementAxis)
          throw createCompositeContractError(`${owner.label} returned a different contribution axis`);
        const dimensions =
          contribution.axis === 'x'
            ? [contribution.width]
            : contribution.axis === 'y'
              ? [contribution.height]
              : [contribution.width, contribution.height];
        if (dimensions.some(dimension => !Number.isFinite(dimension) || dimension < 0))
          throw createCompositeContractError(`${owner.label} returned an invalid contribution size`);
        rootContribution = Object.freeze({ ...contribution });
        return true;
      }

      return false;
    });
    if (handledContribution) return;

    const validatedResult = withProviderOutputValidationBoundary(owner.label, () => {
      if (
        callbackResult === null ||
        typeof callbackResult !== 'object' ||
        Array.isArray(callbackResult) ||
        !('children' in callbackResult)
      ) {
        throw createCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }

      const result = callbackResult as CompositeCompileResult<JsonValue>;
      const resultChildren = result.children;
      const resultAllocationBounds = result.allocationBounds;
      const resultAlignmentGuides = result.alignmentGuides;
      const resultArtifact = result.artifact;
      if (!Array.isArray(resultChildren)) {
        throw createCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }

      const children = Array.from(
        resultChildren,
        (output, outputIndex): IRChild | CompositeCompileChild | CompositeBoundChild => {
          if (isCompositeOutputHandle(output)) return output;
          return snapshotCompositeOutputChild(owner.label, output, outputIndex);
        },
      );

      const spatialHandles = validateCompositeSpatialOutput(
        owner.label,
        result.spatialHandles,
        children
          .map(output => {
            if (!isCompositeOutputHandle(output)) return output;
            const entry = runtime.context.session.outputChildren.get(output);
            return entry?.child.kind === 'bound' ? entry.child.child : undefined;
          })
          .filter((outputChild): outputChild is IRChild => outputChild !== undefined),
      );

      const explicitAllocation =
        resultAllocationBounds === undefined
          ? undefined
          : validateAllocationBounds(resultAllocationBounds, key, occurrence);
      const explicitAlignmentGuides =
        resultAlignmentGuides === undefined
          ? undefined
          : cloneAlignmentGuides(resultAlignmentGuides, `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`);

      let compositeArtifact: CompositeCompileArtifact | undefined;
      if (resultArtifact !== undefined) {
        if (callable.artifactSchema === undefined) {
          throw createCompositeContractError(`Composite '${key}' returned artifact without artifactSchema.`);
        }

        let frozenArtifact: JsonValue;

        try {
          frozenArtifact = cloneAndFreezeJson(resultArtifact, `Composite '${key}' artifact`);
        } catch (cause) {
          const detail = safeThrownDetail(cause);
          throw createCompositeContractError(`${owner.label} returned a non-JSON artifact: ${detail}`, { cause });
        }

        compositeArtifact = freezeCompileArtifact({
          kind: 'composite',
          namespace: callable.namespace,
          type: callable.type,
          occurrence,
          value: frozenArtifact,
        });
      }

      return { children, spatialHandles, explicitAllocation, explicitAlignmentGuides, compositeArtifact };
    });

    const { children, spatialHandles, explicitAllocation, explicitAlignmentGuides, compositeArtifact } =
      validatedResult;
    if (observerKeys.length > 0) {
      if (compositeArtifact === undefined) {
        throw createCompositeContractError(
          `Composite '${key}' at ${formatCompileOccurrence(occurrence)} was selected for observation but returned no artifact.`,
        );
      }

      frame.compileObservationSink.push({
        owner: observationOwner,
        ancestors: frame.ancestors,
        occurrence: freezeOccurrence(occurrence),
        origin: freezeOccurrence(occurrence),
        scopeChain: frame.scopeChain,
        value: compositeArtifact.value,
        observerKeys,
        theme: frame.theme,
        scopeDefaults: frame.scopeDefaults,
      });
    }

    const outputFrame: TraversalFrame = {
      ...frame,
      runtimeInputs: undefined,
      ancestors: childAncestors,
      alignmentGuideSink: [],
      spatialOwnerPath,
      ...(explicitAllocation === undefined ? {} : { allocationBoundary: {} }),
    };
    const preparedOutputs = preflightCompositeOutputs(children, owner);
    if (compositeArtifact !== undefined) frame.artifactSink.push(compositeArtifact);
    for (const declaration of spatialHandles ?? []) {
      frame.spatialHandleSink.push({
        ownerPath: spatialOwnerPath,
        declaration,
        finalOccurrence: freezeOccurrence(occurrence),
        originOccurrence: freezeOccurrence(occurrence),
        scopeChain: frame.scopeChain,
      });
    }

    for (const [outputIndex, output] of children.entries()) {
      if (!isCompositeOutputHandle(output)) {
        const outputOccurrence: CompileOccurrenceLocator = {
          sourcePath: occurrence.sourcePath,
          expansionPath: [...occurrence.expansionPath, { kind: CompileExpansionKind.Output, index: outputIndex }],
        };
        compileChild(
          output,
          outputIndex,
          outputFrame,
          outputOccurrence,
          compositeDepth + 1,
          true,
          semanticOwner === undefined
            ? undefined
            : runtime.state.provenanceTracker?.createGeneratedOwner(output, outputIndex, semanticOwner),
        );
        continue;
      }

      compileRuntimeOutputChild(
        preparedOutputs.outputs.get(output)?.output ??
          (() => {
            throw createCompileInvariantError('internal: composite output child was not preflighted');
          })(),
        outputIndex,
        outputFrame,
        occurrence,
        occurrence,
        'output',
        compositeDepth + 1,
        owner,
        preparedOutputs,
        semanticOwner,
        preparedOutputs.outputs.get(output)?.scopeClipPath,
      );
    }

    if (explicitAllocation !== undefined) {
      pushAllocation(frame.allocationSink, allocationPointsOf(explicitAllocation), frame.allocationBoundary);
    }

    if (explicitAlignmentGuides !== undefined) frame.alignmentGuideSink.push(...explicitAlignmentGuides);
  };

  const compileChild = (
    child: IRChild,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
    semanticOwner?: CompileSemanticOwner,
  ): void => {
    try {
      withWarningOccurrence(occurrence, () => {
        if ('namespace' in child) {
          compileCompositeChild(child, index, frame, occurrence, compositeDepth, semanticOwner);
          return;
        }

        switch (child.type) {
          case 'node':
            emitNodeChild(child, index, frame, occurrence, semanticOwner);
            break;
          case 'coordinate':
            registerCoordinateChild(child, index, frame, occurrence);
            break;
          case 'scope':
            compileScopeChild(child, index, frame, generated ? occurrence : undefined, compositeDepth, semanticOwner);
            break;
          default:
            queuePathChild(child, index, frame, occurrence, semanticOwner);
        }
      });
    } catch (thrown) {
      const entityPath = formatCompileChildPath(frame.locatorPrefix, index);
      options.observeFailurePath?.('namespace' in child ? entityPath : `${entityPath}.${child.type}`);
      if (isFatalProbeError(thrown)) throw thrown;

      const providerKey = 'namespace' in child ? `${child.namespace}.${child.type}` : child.type;
      if (isLayoutProbeRecoverableError(thrown)) {
        throw enrichLayoutProbeError(thrown, providerKey, occurrence);
      }

      throw createLayoutProbeRecoverableError(safeErrorMessage(thrown, 'Child compilation threw a non-Error value'), {
        cause: thrown,
        providerKey,
        occurrence,
      });
    }
  };

  const compileChildren = (
    children: ReadonlyArray<IRChild>,
    frame: TraversalFrame,
    useProvidedOccurrence = false,
    generatedScopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = options.compositeDepth ?? 0,
  ): void => {
    const generated =
      generatedScopeOccurrence !== undefined || (useProvidedOccurrence ? (options.generated ?? false) : false);
    const semanticOwners =
      runtime.state.provenanceTracker === undefined || frame.semanticOwner === undefined
        ? undefined
        : runtime.state.provenanceTracker.createChildOwners(children, frame.semanticOwner, generated);

    for (const [i, child] of children.entries()) {
      const entityPath = formatCompileChildPath(frame.locatorPrefix, i);
      const occurrence = generatedScopeOccurrence
        ? {
            sourcePath: generatedScopeOccurrence.sourcePath,
            expansionPath: [
              ...generatedScopeOccurrence.expansionPath,
              { kind: CompileExpansionKind.ScopeChild, index: i },
            ],
          }
        : useProvidedOccurrence && options.occurrence !== undefined && children.length === 1
          ? options.occurrence
          : {
              sourcePath: 'namespace' in child ? entityPath : `${entityPath}.${child.type}`,
              expansionPath: [],
            };
      const runtimeInputs =
        useProvidedOccurrence && options.occurrence !== undefined && children.length === 1
          ? options.runtimeInputs
          : frame.runtimeInputs === undefined
            ? undefined
            : selectCompositeInputScope(frame.runtimeInputs, ['children', i]);
      compileChild(child, i, { ...frame, runtimeInputs }, occurrence, compositeDepth, generated, semanticOwners?.[i]);
    }
  };

  const rootPendingPaths: Array<PendingPathEmission> = [];
  const rootBounds: TraversalFrame['boundsSink'] = [];
  const rootAllocations: TraversalFrame['allocationSink'] = [];
  const rootObservations: TraversalFrame['observationSink'] = [];
  const rootLayouts: TraversalFrame['layoutSink'] = [];
  const rootArtifacts: TraversalFrame['artifactSink'] = [];
  const rootCompileObservations: TraversalFrame['compileObservationSink'] = [];
  const rootSpatialHandles: TraversalFrame['spatialHandleSink'] = [];
  const rootAlignmentGuides: TraversalFrame['alignmentGuideSink'] = [];

  compileChildren(
    rootChildren,
    {
      childProposal: options.proposal ?? NaturalLayoutProposal,
      runtimeInputs: options.runtimeInputs ?? context.runtimeInputs,
      ancestors: options.ancestors ?? [],
      scopeChain: options.scopeChain ?? [],
      primitiveSink: runtime.state.primitives,
      locatorPrefix: '',
      layoutSink: rootLayouts,
      pathSink: rootPendingPaths,
      scopeDefaults: options.scopeDefaults ?? {},
      theme: options.theme ?? context.theme,
      publicationSink: [],
      boundsSink: rootBounds,
      allocationSink: rootAllocations,
      alignmentGuideSink: rootAlignmentGuides,
      observationSink: rootObservations,
      artifactSink: rootArtifacts,
      compileObservationSink: rootCompileObservations,
      spatialHandleSink: rootSpatialHandles,
      spatialOwnerPath: options.spatialOwnerPath ?? [],
      ...(options.semanticOwner === undefined && runtime.state.provenanceTracker === undefined
        ? {}
        : { semanticOwner: options.semanticOwner ?? runtime.state.provenanceTracker?.root }),
    },
    true,
  );

  flushPendingPathEmissions(rootPendingPaths);

  for (const contribution of rootBounds) {
    runtime.state.layoutBounds = collectLayoutBounds(
      runtime.state.layoutBounds,
      contribution.boundsPoints,
      contribution.shadow,
    );
  }

  if (options.session === undefined && runtime.context.artifacts?.nodeLayouts === true) {
    for (const observation of rootObservations) {
      rootArtifacts.push(
        freezeCompileArtifact({
          kind: 'nodeLayout',
          occurrence: observation.occurrence,
          value: cloneAndFreezeJson(
            projectNodeLayoutObservation(
              observation.layout,
              observation.scopeChain,
              scopeTransformsContext.resolve(observation.scopeChain),
              observation.id,
            ),
            'Node layout artifact',
          ),
        }),
      );
    }
  }

  if (runtime.state.placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(runtime.state.primitives).join(', ')}`
        : '';
    throw createCompileInvariantError(
      `internal: ${runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
    );
  }

  const primitives = stableSortByZIndex(sealSink(runtime.state.primitives), runtime.state.zIndexOf);
  const alignmentGuides = resolveStructuralAlignmentGuides(rootAlignmentGuides);

  return {
    primitives,
    primitiveZIndices: primitives.map(primitive => runtime.state.zIndexOf.get(primitive)),
    ...(rootContribution === undefined ? {} : { contribution: rootContribution }),
    layoutBounds: runtime.state.layoutBounds,
    layouts: rootLayouts,
    bounds: rootBounds,
    allocations: effectiveAllocations(rootAllocations),
    observations: rootObservations,
    artifacts: orderCompileArtifacts(rootArtifacts),
    compileObservations: rootCompileObservations,
    spatialHandles: rootSpatialHandles,
    ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
  };
};
