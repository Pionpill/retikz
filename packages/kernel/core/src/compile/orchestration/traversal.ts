import type { BoundsRect } from '@retikz/math';

import { boundsToRect } from '@retikz/math';

import type {
  ClipShape,
  CompileObservationOwner,
  CompileOccurrenceLocator,
  CompileOwnerOutputPublisher,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeExpandResult,
  CompositeReplay,
  CompositeReplayWrapper,
  EmitStroke,
  EmitStrokeOwnerOutputOptions,
  GroupPrim,
  LayoutChildResult,
  LayoutProposal,
  PaintValue,
  PathKindCompileContext,
  PathKindCompileResult,
  PathKindLabelInput,
  PathPrim,
  ResolvedPathKindAppearance,
  ScenePrimitive,
  SceneResource,
  SpatialHandleOwner,
  Transform,
} from '../../contract';
import type { BoundaryReferenceResolver, PathResolution, PathTargetResolver, TargetResolution } from '../../resolve';
import type { PositionTargetResolveContext } from '../../resolve/position';
import type {
  IRChild,
  IRPathBase,
  IRPosition,
  IRScopePlacementTarget,
  IRScopeSelfPoint,
  IRStep,
  IRTarget,
  IRTransform,
  JsonValue,
} from '../../schemas';
import type { NodeLayout } from '../node';
import type { CompositeCompileArtifact } from '../types';
import type { CompileWarningCodeValue, CompileWarningInput } from '../warning';
import type { CompileContext } from './context';
import type { InternalScenePrimitive } from './primitive';
import type {
  CallableLayoutCompositeDefinition,
  CompositeCompileOwner,
  CompositeReplayMaterializeContext,
  CompositeReplayTransaction,
  CompositeRuntimeOutputChild,
  CoordinateChild,
  EmitScopeGroupContext,
  NodeChild,
  PathChild,
  PendingPathEmission,
  RuntimeSemanticOwner,
  ScopeChild,
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  TraversalCompileOptions,
  TraversalFrame,
  TraversalResult,
  TraversalRuntime,
} from './types';

import { LayoutChildProbeKind, NaturalLayoutProposal } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import {
  createStyleResolveFrame,
  resolveBoundaryReference,
  resolveNode,
  resolvePath as resolvePathValue,
  resolveStrokePathProviders,
  resolveTheme,
} from '../../resolve';
import {
  isFatalProbeError,
  isRetikzLayoutProbeRecoverableError,
  RetikzCompositeContractError,
  RetikzLayoutProbeRecoverableError,
  safeErrorMessage,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { resolvePosition, resolvePositionTargetWorld } from '../../resolve/position';
import { parseProviderPayload } from '../../resolve/provider-payload';
import { resolveClip as resolveClipValue } from '../../resolve/resource';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
import { cloneAndFreezeJson } from '../../shared/json';
import { formatCompileOccurrence } from '../artifact';
import { CompileWarningCode } from '../constants';
import { NamespaceStack } from '../namespace';
import {
  alignmentGuidesOfNode,
  computeCompiledNodeLayout,
  createScopeCircleLayout,
  createScopePlaceholderLayout,
  createScopeRectangleLayout,
  createSyntheticRectangleLayout,
  emitNodePrimitives,
  labelExtentPoints,
  layoutNode,
  outerRectOf,
} from '../node';
import { emitPathPrimitive } from '../path';
import { emitLabelPrimitive } from '../path';
import {
  createLayoutChildFailure,
  enrichLayoutProbeError,
  normalizeLayoutProbeError,
  raiseLayoutChildFailure,
  RetikzCompileInvariantError,
} from '../probe-failure';
import { resolveAnchorRefUncached } from '../reference';
import { createClipRegistry, createPaintRegistry, validateMarkerPrimitives } from '../resource';
import {
  snapshotProviderPosition,
  validateScenePrimitives,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';
import { collectScopeCornerPoints, computeScopeBoundingBox, lowerScopeTransforms } from '../scope';
import { applyTransformChain, inverseTransformChain, projectLayoutToGlobal } from '../transform';
import { cloneAlignmentGuides, resolveStructuralAlignmentGuides, transformAlignmentGuides } from './alignment-guide';
import { filterAnimations } from './animation';
import { freezeCompileArtifact, freezeOccurrence, orderCompileArtifacts } from './artifact';
import { canonicalizeBoundsRect, collectLayoutBounds } from './bounds';
import {
  createCompositeReplayChild,
  createCompositeScopeChild,
  snapshotCompositeLayoutChild,
  snapshotCompositeOutputChild,
  validateExpandCompositeOutput,
} from './composite-output';
import {
  compileWarningOccurrenceOf,
  createDuplicateWarning,
  replaceCompileWarningOccurrence,
  transformWarnCode,
  withCompileWarningOccurrence,
} from './diagnostics';
import { cloneLayoutProposal, resolveLayoutSlotSize } from './layout-proposal';
import { bindPathTarget, pathTargetViewOf, targetKeyOf } from './path-target';
import { createPositionResolveContext } from './position-context';
import {
  collectPlaceholderLocators,
  makePathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';
import { createRuntimeTopologyTracker } from './runtime-topology';
import { replayPendingSpatialHandle } from './spatial-handle';
import { optionalVisualBoundsOfPrimitives, visualBoundsOfPrimitives } from './visual-bounds';

/** 只保留会改变 Scope 样式级联结果的 frame，避免空 Scope frame 触发 replay 重编译 */
const replayStyleFingerprint = (styleStack: TraversalFrame['styleStack']): string => {
  const effectiveFrames = styleStack.filter(frame => {
    const reset = frame.resetStyle;
    return (
      Object.keys(frame.cascade).length > 0 ||
      frame.nodeDefault !== undefined ||
      frame.pathDefault !== undefined ||
      frame.labelDefault !== undefined ||
      frame.arrowDefault !== undefined ||
      (reset !== undefined && reset !== false && (!Array.isArray(reset) || reset.length > 0))
    );
  });
  return JSON.stringify(effectiveFrames);
};

/** 对 resolved Theme 做 compile-local 稳定比较 */
const replayThemeFingerprint = (theme: TraversalFrame['theme']): string => JSON.stringify(theme);

/** 编译 child 树，完成 namespace 注册、延迟 path 回填、zIndex 排序和自动 layout bbox 收集 */
export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
  options: TraversalCompileOptions = {},
): TraversalResult => {
  const session = options.session ?? {
    replayTransactions: new WeakMap(),
    layoutResults: new WeakMap(),
    outputChildren: new WeakMap(),
    failures: new WeakMap(),
  };
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
      nodeDistance: context.nodeDistance,
      labelDistance: context.labelDistance,
      rootFontSize: context.rootFontSize,
      shapes: context.shapes,
      boundaries: context.boundaries,
      clips: context.clips,
      patterns: context.patterns,
      arrows: context.arrows,
      pathGenerators: context.pathGenerators,
      pathKinds: context.pathKinds,
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
      ...(options.identityTracker === undefined ? {} : { identityTracker: options.identityTracker }),
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
      namespaceStack: runtime.state.namespaceStack,
      nodeDistance: runtime.context.nodeDistance,
      scopeChain,
      resolveExplicitBoundary,
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

  /** 校验并脱离 PathKind provider 返回的 primitive 与 bounds point */
  const validatePathKindCompileResult = (
    kind: string,
    value: unknown,
  ): Readonly<{
    result: PathKindCompileResult;
    source: Record<string, unknown>;
  }> | null =>
    withProviderOutputValidationBoundary(`Path kind '${kind}'`, () => {
      if (value === null) return null;
      if (typeof value !== 'object') {
        throw new RetikzCompositeContractError(`Path kind '${kind}' must return a compile result object or null.`);
      }
      const result = value as Record<string, unknown>;
      const primitives = validateScenePrimitives(`Path kind '${kind}'`, result.primitives, validateMarkerPrimitives);
      const rawBoundsPoints = result.boundsPoints;
      if (!Array.isArray(rawBoundsPoints)) {
        throw new RetikzCompositeContractError(`Path kind '${kind}' must return boundsPoints as an array.`);
      }
      const boundsPoints = Array.from(
        rawBoundsPoints,
        (point, index): IRPosition =>
          snapshotProviderPosition(`Path kind '${kind}' bounds point at index ${index}`, point),
      );
      return {
        result: { primitives, boundsPoints },
        source: result,
      };
    });

  /** 为一个 owner site 创建按需产物 publisher，并记录被选中的 observer keys */
  const createOwnerOutputPublisher = (
    owner: CompileObservationOwner,
    sourcePath: string,
    definition: { schema: { parse: (value: unknown) => unknown } } | undefined,
  ): Readonly<{
    keys: ReadonlyArray<string>;
    publisher: CompileOwnerOutputPublisher<JsonValue>;
    hasPublished: () => boolean;
    value: () => JsonValue | undefined;
  }> => {
    const keys =
      definition === undefined || runtime.context.observation === undefined
        ? []
        : runtime.context.observation.select(Object.freeze({ owner, sourcePath }));
    let hasPublished = false;
    let published: JsonValue | undefined;
    const publisher: CompileOwnerOutputPublisher<JsonValue> = Object.freeze({
      requested: keys.length > 0,
      publish: value => {
        if (keys.length === 0) return;
        if (hasPublished) {
          throw new RetikzCompositeContractError(`Owner '${sourcePath}' published its compile output more than once.`);
        }
        if (definition === undefined) {
          throw new RetikzCompileInvariantError('internal: selected owner output has no definition');
        }
        let parsed: unknown;
        try {
          parsed = definition.schema.parse(value);
        } catch (cause) {
          throw new RetikzCompositeContractError(`Owner '${sourcePath}' returned an invalid owner output.`, { cause });
        }
        try {
          published = cloneAndFreezeJson(parsed, `Owner '${sourcePath}' output`) as JsonValue;
        } catch (cause) {
          throw new RetikzCompositeContractError(`Owner '${sourcePath}' returned a non-JSON owner output.`, { cause });
        }
        hasPublished = true;
      },
    });
    return { keys, publisher, hasPublished: () => hasPublished, value: () => published };
  };

  /** 消费 resolve/path 已绑定的 path kind，并提供内置 stroke emit 回调 */
  const emitPathKindPrimitive = (
    pendingPath: PendingPathEmission,
    resolution: PathResolution,
    targetResolver: PathTargetResolver,
  ): PathKindCompileResult | null => {
    const { path, irPath, scopeChain } = pendingPath;
    const targetWarn = (code: string, message: string, node?: { irPath?: string }): void =>
      runtime.context.onWarn({ code, message, path: node?.irPath ?? irPath });
    const targetView = pathTargetViewOf(resolution.targets, targetWarn);
    const { name: kind, definition } = resolution.kind;
    const observationOwner = Object.freeze({ kind: 'pathKind' as const, name: kind });
    const ownerOutput = createOwnerOutputPublisher(
      observationOwner,
      pendingPath.occurrence.sourcePath,
      definition.ownerOutput,
    );
    const emitOptions = {
      onWarn: runtime.context.onWarn,
      irPath,
      scopeChain,
      resolvePaint: runtime.context.paint.register,
      targetView,
      lowerTex: runtime.context.lowerTex,
      rootFontSize: runtime.context.rootFontSize,
    };
    const resolutionOf = (nextPath: IRPathBase): PathResolution =>
      nextPath === path
        ? resolution
        : resolvePathValue(nextPath, {
            styleStack: pendingPath.styleStack,
            scopeChain,
            targetResolver,
            pathKinds: runtime.context.pathKinds,
            pathGenerators: runtime.context.pathGenerators,
            arrows: runtime.context.arrows,
            patterns: runtime.context.patterns,
            round: runtime.context.round,
            irPath,
          });
    const emitStroke = ((nextPath?: IRPathBase, request?: EmitStrokeOwnerOutputOptions) => {
      const source = nextPath ?? path;
      const emittedResolution = resolveStrokePathProviders(resolutionOf(source), {
        pathKinds: runtime.context.pathKinds,
        pathGenerators: runtime.context.pathGenerators,
        arrows: runtime.context.arrows,
        patterns: runtime.context.patterns,
        round: runtime.context.round,
        irPath,
      });
      const strokeColor = emittedResolution.path.color;
      const strokeResolution = {
        ...emittedResolution,
        paint: {
          ...emittedResolution.paint,
          ...(emittedResolution.paint.stroke === undefined && strokeColor !== undefined ? { stroke: strokeColor } : {}),
        },
      };
      const emittedTargetView = pathTargetViewOf(strokeResolution.targets, targetWarn);
      const emitted = emitPathPrimitive(strokeResolution, {
        targetView: emittedTargetView,
        round: runtime.context.round,
        measureText: runtime.context.measureText,
        options: {
          ...emitOptions,
          ...(request === undefined ? {} : { captureOwnerOutput: request.captureOwnerOutput }),
        },
      });
      return emitted;
    }) as EmitStroke;
    const materializePath = (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => {
      const pathWithoutKindOptions = { ...path };
      delete pathWithoutKindOptions.kindOptions;
      const source: IRPathBase = {
        ...pathWithoutKindOptions,
        kind: 'stroke',
        ...(input?.children === undefined ? {} : { children: [...input.children] }),
        label: undefined,
        marks: undefined,
        color: undefined,
        fill: undefined,
        stroke: undefined,
        strokeWidth: undefined,
        rotate: undefined,
        scale: undefined,
      };
      const emittedResolution = resolveStrokePathProviders(resolutionOf(source), {
        pathKinds: runtime.context.pathKinds,
        pathGenerators: runtime.context.pathGenerators,
        arrows: runtime.context.arrows,
        patterns: runtime.context.patterns,
        round: runtime.context.round,
        irPath,
      });
      const emitted = emitPathPrimitive(emittedResolution, {
        targetView: pathTargetViewOf(emittedResolution.targets, targetWarn),
        round: runtime.context.round,
        measureText: runtime.context.measureText,
        options: emitOptions,
      });
      const findPath = (primitives: ReadonlyArray<ScenePrimitive>): PathPrim | undefined => {
        for (const primitive of primitives) {
          if (primitive.type === 'path') return primitive;
          if (primitive.type === 'group') {
            const nested = findPath(primitive.children);
            if (nested !== undefined) return nested;
          }
        }
        return undefined;
      };
      const primitive = emitted === null ? undefined : findPath(emitted.primitives);
      return {
        commands: primitive?.commands ?? [],
        boundsPoints: emitted?.boundsPoints ?? [],
      };
    };
    const resolvedFill =
      resolution.paint.fill === undefined ? undefined : emitOptions.resolvePaint(resolution.paint.fill);
    const resolvedStroke =
      resolution.paint.stroke === undefined ? undefined : emitOptions.resolvePaint(resolution.paint.stroke);
    const appearance: ResolvedPathKindAppearance = Object.freeze({
      ...(resolution.path.color === undefined ? {} : { color: resolution.path.color }),
      ...(resolvedFill === undefined ? {} : { fill: resolvedFill }),
      ...(resolvedStroke === undefined ? {} : { stroke: resolvedStroke }),
      ...(resolution.path.fillRule === undefined ? {} : { fillRule: resolution.path.fillRule }),
      strokeWidth: resolution.style.strokeWidth,
      ...(resolution.path.dashPattern === undefined ? {} : { dashPattern: resolution.path.dashPattern }),
      ...(resolution.path.dashOffset === undefined ? {} : { dashOffset: resolution.path.dashOffset }),
      ...(resolution.path.lineCap === undefined ? {} : { strokeLinecap: resolution.path.lineCap }),
      ...(resolution.path.lineJoin === undefined ? {} : { strokeLinejoin: resolution.path.lineJoin }),
      ...(resolution.path.opacity === undefined ? {} : { opacity: resolution.path.opacity }),
      ...(resolution.path.fillOpacity === undefined ? {} : { fillOpacity: resolution.path.fillOpacity }),
      ...(resolution.path.strokeOpacity === undefined ? {} : { strokeOpacity: resolution.path.strokeOpacity }),
      ...(resolution.path.shadow === undefined ? {} : { shadow: resolution.path.shadow }),
      ...(resolution.path.blendMode === undefined ? {} : { blendMode: resolution.path.blendMode }),
    });
    const hostLabelBoundsPoints: Array<IRPosition> = [];
    const emitHostLabels = (input: PathKindLabelInput): ReadonlyArray<ScenePrimitive> =>
      input.labels.flatMap((label, index) => {
        const sample = input.samples[index];
        const emittedLabel = emitLabelPrimitive(label, sample, {
          measureText: runtime.context.measureText,
          round: runtime.context.round,
          rootFontSize: runtime.context.rootFontSize,
          hostOpacity: path.opacity,
          placement: { boundaryOffset: sample.boundaryOffset },
        });
        hostLabelBoundsPoints.push(...emittedLabel.boundsPoints);
        return [emittedLabel.primitive];
      });
    const compilePathKind = definition.compile as unknown as (context: PathKindCompileContext) => unknown;
    const produced = compilePathKind({
      path: resolution.kind.path,
      ownerOutput: ownerOutput.publisher,
      materializePath,
      emitStroke,
      emitHostLabels,
      appearance,
      round: runtime.context.round,
    });
    const validated = validatePathKindCompileResult(kind, produced);
    if (validated === null) {
      if (ownerOutput.publisher.requested && ownerOutput.hasPublished()) {
        throw new RetikzCompositeContractError(
          `Path kind '${kind}' at ${formatCompileOccurrence(pendingPath.occurrence)} must not publish owner output when it returns null.`,
        );
      }
      return null;
    }
    const value = ownerOutput.value();
    if (ownerOutput.publisher.requested && value === undefined) {
      throw new RetikzCompositeContractError(
        `Path kind '${kind}' at ${formatCompileOccurrence(pendingPath.occurrence)} must publish its owner output exactly once.`,
      );
    }
    if (value !== undefined) {
      pendingPath.observationSink.push({
        owner: observationOwner,
        occurrence: freezeOccurrence(pendingPath.occurrence),
        origin: freezeOccurrence(pendingPath.occurrence),
        scopeChain: [...scopeChain],
        value,
        observerKeys: ownerOutput.keys,
        theme: pendingPath.theme,
        styleStack: [...pendingPath.styleStack],
      });
    }
    return {
      ...validated.result,
      boundsPoints: [...validated.result.boundsPoints, ...hostLabelBoundsPoints],
    };
  };

  /** 把 allocation contribution 绑定到最近的显式 composite allocation boundary */
  const pushAllocation = (
    sink: TraversalFrame['allocationSink'],
    points: Array<IRPosition>,
    allocationBoundary?: object,
  ): void => {
    sink.push({ points, ...(allocationBoundary === undefined ? {} : { allocationBoundary }) });
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
            styleStack: pendingPath.styleStack,
            scopeChain: pendingPath.scopeChain,
            targetResolver,
            pathKinds: runtime.context.pathKinds,
            pathGenerators: runtime.context.pathGenerators,
            arrows: runtime.context.arrows,
            patterns: runtime.context.patterns,
            round: runtime.context.round,
            irPath: pendingPath.irPath,
          });
          const result = withWarningOccurrence(pendingPath.occurrence, () =>
            emitPathKindPrimitive(pendingPath, resolution, targetResolver),
          );
          const rawPrimitives = result?.primitives ?? [];
          const primitives = runtime.state.identityTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
          const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
          if (idx === -1) {
            throw new RetikzCompileInvariantError('internal: path placeholder missing from its sink');
          }
          pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
          if (pendingPath.semanticOwner !== undefined) {
            runtime.state.identityTracker?.recordPrimitives(primitives, pendingPath.semanticOwner, 'path');
          }
          runtime.state.placeholderBalance--;
          for (const prim of primitives) recordPrimitiveZIndex(runtime.state.zIndexOf, prim, pendingPath.zIndex);
          if (result !== null) {
            pendingPath.boundsSink.push({
              points: [...result.boundsPoints],
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
    semanticOwner?: RuntimeSemanticOwner,
  ): void => {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, styleStack } = frame;
    const nodeIrPath = `${locatorPrefix}children[${index}].node`;
    const warn = (code: CompileWarningCodeValue, message: string): void =>
      runtime.context.onWarn({ code, message, path: nodeIrPath });
    const resolvedNode = resolveNode(child, {
      styleFrames: styleStack,
      shapes: runtime.context.shapes,
      boundaries: runtime.context.boundaries,
      patterns: runtime.context.patterns,
      round: runtime.context.round,
      irPath: nodeIrPath,
      warn,
    });
    const canonicalNode = {
      ...resolvedNode.node,
      animations: filterAnimations(resolvedNode.node.animations, {
        target: 'element',
        onWarn: runtime.context.onWarn,
        irPath: nodeIrPath,
      }),
    };
    const layout = layoutNode(
      { ...resolvedNode, node: canonicalNode },
      {
        measureText: runtime.context.measureText,
        positionContext: positionContextOf(scopeChain),
        labelDistance: runtime.context.labelDistance,
        rootFontSize: runtime.context.rootFontSize,
        scopeChain,
        warn,
        ...(frame.childProposal?.x === undefined ? {} : { allocationWidthProposal: frame.childProposal.x }),
        texLowering: {
          lowerTex: runtime.context.lowerTex,
          warn: (code, message) => runtime.context.onWarn({ code, message, path: nodeIrPath }),
        },
      },
    );
    const globalLayout = projectLayoutToGlobal(layout, scopeChain);
    if (child.id) {
      runtime.state.namespaceStack.register(child.id, globalLayout, `${nodeIrPath}.id`);
    }
    frame.publicationSink.push(globalLayout);
    frame.observationSink.push({
      layout,
      scopeChain: [...scopeChain],
      occurrence:
        occurrence ??
        Object.freeze({
          sourcePath: nodeIrPath,
          expansionPath: Object.freeze([]),
        }),
    });
    const rawPrimitives = emitNodePrimitives(layout, runtime.context.round, runtime.context.paint.register);
    const emittedPrimitives = runtime.state.identityTracker?.materializePrimitives(rawPrimitives) ?? rawPrimitives;
    if (semanticOwner !== undefined) {
      runtime.state.identityTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
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
    frame.boundsSink.push({ points: nodeBoundsPoints, shadow: layout.shadow });
    frame.boundsSink.push({ points: labelExtentPoints(layout) });
    pushAllocation(frame.allocationSink, nodeBoundsPoints, frame.allocationBoundary);
    const alignmentGuides = alignmentGuidesOfNode(layout, runtime.context.round);
    if (alignmentGuides !== undefined) {
      frame.alignmentGuideSink.push(...cloneAlignmentGuides(alignmentGuides, `Node '${nodeIrPath}'`));
    }
    layoutSink.push(layout);
  };

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
  const registerCoordinateChild = (child: CoordinateChild, index: number, frame: TraversalFrame): void => {
    const { scopeChain, locatorPrefix, layoutSink } = frame;
    const coordinateIrPath = `${locatorPrefix}children[${index}].coordinate`;
    const localCenter = resolvePosition(child.position, positionContextOf(scopeChain))?.localPoint;
    if (localCenter === undefined) {
      throw new RetikzLayoutProbeRecoverableError(
        `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
      );
    }
    const globalCenter = scopeChain.length === 0 ? localCenter : applyTransformChain(localCenter, scopeChain);
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
    semanticOwner?: RuntimeSemanticOwner,
  ): void => {
    const { scopeChain, primitiveSink, locatorPrefix, pathSink, styleStack } = frame;
    const pathIrPath = `${locatorPrefix}children[${index}].path`;
    const placeholder = makePathPlaceholder();
    primitiveSink.push(placeholder);
    const pending: PendingPathEmission = {
      path: {
        ...child,
        animations: filterAnimations(child.animations, {
          target: 'element',
          onWarn: runtime.context.onWarn,
          irPath: pathIrPath,
        }),
      },
      irPath: pathIrPath,
      scopeChain: [...scopeChain],
      boundsSink: frame.boundsSink,
      allocationSink: frame.allocationSink,
      ...(frame.allocationBoundary === undefined ? {} : { allocationBoundary: frame.allocationBoundary }),
      placeholderSlot: { primitiveSink, placeholder },
      occurrence,
      observationSink: frame.compileObservationSink,
      theme: frame.theme,
      styleStack: [...styleStack],
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      zIndex: child.zIndex,
    };
    runtime.state.placeholderBalance++;
    pathSink.push(pending);
  };

  /** 拒绝非 finite 的 Scope placement 中间结果 */
  const assertFinitePlacementPoint = (point: IRPosition, label: string): IRPosition => {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
    }
    return point;
  };

  /**
   * 在 children 编译前冻结 Scope placement target
   * @description 只允许父 frame 显式坐标或此前已完成的 namespace entry，避免 descendant / self / placeholder cycle
   */
  const resolveScopePlacementTarget = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
  ): IRPosition | undefined => {
    const target: IRScopePlacementTarget | undefined = child.placement?.target;
    if (target === undefined) return undefined;
    if (Array.isArray(target)) {
      return assertFinitePlacementPoint([target[0], target[1]], 'scope placement target');
    }
    const scopeIrPath = `${frame.locatorPrefix}children[${index}].scope`;
    if (target.id === child.id) {
      throw new RetikzLayoutProbeRecoverableError(
        `Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}: self target is not allowed`,
      );
    }
    const positionContext = positionContextOf(frame.scopeChain);
    const reference = positionContext.lookupReference(target.id);
    if (reference === undefined || reference.state !== 'resolved') {
      throw new RetikzLayoutProbeRecoverableError(
        `Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}: target must be defined and fully resolved before this Scope`,
      );
    }
    const resolution = resolvePositionTargetWorld(target, positionContext);
    if (resolution.referencePoint === null) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}`,
      );
    }
    return assertFinitePlacementPoint(positionContext.toLocal(resolution.referencePoint), 'scope placement target');
  };

  /** 从当前 Scope 的固有 child layouts 创建 rectangle / circle synthetic envelope */
  const createIntrinsicScopeLayout = (child: ScopeChild, scopeLayouts: ReadonlyArray<NodeLayout>): NodeLayout => {
    const id = child.id ?? '__anonymous_scope__';
    return child.boundingShape === ScopeBoundingShape.Circle
      ? createScopeCircleLayout(
          { id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin: [0, 0] },
          { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
        )
      : createScopeRectangleLayout(
          { id, bbox: computeScopeBoundingBox(scopeLayouts), fallbackOrigin: [0, 0] },
          { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
        );
  };

  /** 将已按 parent ancestor chain 发布的 layout 原位插入当前 Scope own chain */
  const applyOwnTransformsToPublishedLayout = (
    layout: NodeLayout,
    parentChain: ReadonlyArray<Transform>,
    ownChain: ReadonlyArray<Transform>,
  ): void => {
    if (ownChain.length === 0) return;
    const projectAcrossParent = (point: IRPosition): IRPosition => {
      const parentPoint = parentChain.length === 0 ? point : inverseTransformChain(point, parentChain);
      const transformedParent = applyTransformChain(parentPoint, ownChain);
      return parentChain.length === 0 ? transformedParent : applyTransformChain(transformedParent, parentChain);
    };
    const [x, y] = projectAcrossParent([layout.rect.x, layout.rect.y]);
    const [contentX, contentY] = projectAcrossParent(layout.contentCenter);
    let rotateDegrees = 0;
    let scaleX = 1;
    let scaleY = 1;
    for (const transform of ownChain) {
      if (transform.kind === 'rotate') rotateDegrees += transform.degrees;
      if (transform.kind === 'scale') {
        scaleX *= transform.x;
        scaleY *= transform.y ?? transform.x;
      }
    }
    layout.rect = {
      ...layout.rect,
      x,
      y,
      rotate: (layout.rect.rotate ?? 0) + (rotateDegrees * Math.PI) / 180,
      width: layout.rect.width * Math.abs(scaleX),
      height: layout.rect.height * Math.abs(scaleY),
    };
    layout.contentCenter = [contentX, contentY];
    layout.rotateDeg += rotateDegrees;
    layout.margin = {
      top: layout.margin.top * Math.abs(scaleY),
      right: layout.margin.right * Math.abs(scaleX),
      bottom: layout.margin.bottom * Math.abs(scaleY),
      left: layout.margin.left * Math.abs(scaleX),
    };
  };

  /** placement self point：anchor 在 transformed envelope 上解析；origin / 显式点先按 own chain 投影 */
  const resolveTransformedSelfPoint = (
    point: IRScopeSelfPoint,
    intrinsicLayout: NodeLayout,
    transformedLayout: NodeLayout,
    scopeTransforms: ReadonlyArray<Transform>,
  ): IRPosition => {
    if (point === 'origin' || Array.isArray(point)) {
      const intrinsicPoint: IRPosition = point === 'origin' ? [0, 0] : [point[0], point[1]];
      return assertFinitePlacementPoint(
        applyTransformChain(intrinsicPoint, scopeTransforms),
        'scope placement selfAnchor',
      );
    }
    return assertFinitePlacementPoint(resolveAnchorRefUncached(transformedLayout, point), 'scope placement selfAnchor');
  };

  /** children intrinsic layout 完成后解析 pivot，并生成最终 own chain */
  const resolveFinalScopeTransforms = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
    intrinsicLayout: NodeLayout,
    placementTarget: IRPosition | undefined,
    preliminaryTransforms: Array<Transform> | undefined,
  ): Array<Transform> => {
    const scopeIrPath = `${frame.locatorPrefix}children[${index}].scope`;
    let failedTransform: IRTransform | undefined;
    const loweredOwn =
      preliminaryTransforms ??
      lowerScopeTransforms(child.transforms ?? [], {
        positionContext: positionContextOf(frame.scopeChain),
        intrinsicLayout,
        onUnresolved: transform => {
          failedTransform = transform;
        },
      });
    if (loweredOwn === null) {
      runtime.context.onWarn({
        code: transformWarnCode(failedTransform),
        message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
        path: `${scopeIrPath}.transforms`,
      });
    }
    const scopeTransforms = loweredOwn ?? [];
    if (placementTarget === undefined) return scopeTransforms;

    const transformedLayout =
      scopeTransforms.length === 0 ? intrinsicLayout : projectLayoutToGlobal(intrinsicLayout, scopeTransforms);
    const selfPoint = resolveTransformedSelfPoint(
      child.placement?.selfAnchor ?? 'center',
      intrinsicLayout,
      transformedLayout,
      scopeTransforms,
    );
    const placement: Transform = {
      kind: 'translate',
      x: placementTarget[0] - selfPoint[0],
      y: placementTarget[1] - selfPoint[1],
    };
    assertFinitePlacementPoint([placement.x, placement.y], 'scope placement');
    return [placement, ...scopeTransforms];
  };

  /**
   * 不依赖 intrinsic envelope 的既有 transform 可在 children 前冻结
   * @description 保持 v0.4 Scope transform 下跨 frame relative 定位语义；anchor pivot 才进入完整两阶段收尾
   */
  const resolvePreliminaryScopeTransforms = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
  ): Array<Transform> | undefined => {
    const needsIntrinsicEnvelope = (child.transforms ?? []).some(transform => {
      if (transform.kind !== 'rotate' && transform.kind !== 'scale') return false;
      const pivot = transform.pivot;
      return pivot !== undefined && pivot !== 'origin' && !Array.isArray(pivot);
    });
    if (needsIntrinsicEnvelope) return undefined;

    let failedTransform: IRTransform | undefined;
    const transforms = lowerScopeTransforms(child.transforms ?? [], {
      positionContext: positionContextOf(frame.scopeChain),
      onUnresolved: transform => {
        failedTransform = transform;
      },
    });
    if (transforms !== null) return transforms;
    runtime.context.onWarn({
      code: transformWarnCode(failedTransform),
      message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
      path: `${frame.locatorPrefix}children[${index}].scope.transforms`,
    });
    return [];
  };

  /** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
  const registerScopeLayoutPlaceholder = (
    child: ScopeChild,
    input: ScopeLayoutPlaceholderContext,
  ): ScopeLayoutPlaceholder => {
    const { index, frame } = input;
    const { locatorPrefix } = frame;
    const scopeIrPath = `${locatorPrefix}children[${index}].scope`;
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
  const emitScopeGroup = (child: ScopeChild, input: EmitScopeGroupContext): void => {
    const { index, scopeTransforms, scopePrimitiveSink, frame, resolvedClipShape, semanticOwner } = input;
    const { primitiveSink, locatorPrefix } = frame;
    const scopeIrPath = `${locatorPrefix}children[${index}].scope`;
    const hasScopeTransforms = scopeTransforms.length > 0;
    const isPrunable =
      scopePrimitiveSink.length === 0 && !hasScopeTransforms && child.id === undefined && child.clip === undefined;
    if (isPrunable) return;

    const group: GroupPrim = {
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
    if (resolvedClipShape !== undefined) {
      group.clipRef = runtime.context.clip.importResolved(resolvedClipShape);
    } else if (child.clip !== undefined) {
      group.clipRef = runtime.context.clip.register(
        resolveClipValue(child.clip, { clips: runtime.context.clips, irPath: `${scopeIrPath}.clip` }),
      );
    }
    primitiveSink.push(group);
    if (semanticOwner !== undefined) runtime.state.identityTracker?.recordPrimitives([group], semanticOwner, 'scope');
    recordPrimitiveZIndex(runtime.state.zIndexOf, group, child.zIndex);
  };

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
  const compileScopeChild = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
    generatedOccurrence?: CompileOccurrenceLocator,
    compositeDepth = options.compositeDepth ?? 0,
    semanticOwner?: RuntimeSemanticOwner,
    compileNested?: (scopeFrame: TraversalFrame, preliminaryTransforms: ReadonlyArray<Transform> | undefined) => void,
    preResolvedClipShape?: ClipShape,
  ): void => {
    const { locatorPrefix, styleStack } = frame;
    const themePath =
      generatedOccurrence === undefined
        ? `${locatorPrefix}children[${index}].scope.theme`
        : `${formatCompileOccurrence(generatedOccurrence)}.scope.theme`;
    const theme = resolveTheme(frame.theme, child.theme, themePath, context.themeStyles);
    const placementTarget = resolveScopePlacementTarget(child, index, frame);
    // runtime Scope 可能包住在当前 frame 外完成的 replay probe，因此它的数值 transform
    // 必须在 Scope 收尾时统一投影到普通 child 与 replay 导入的 publication/observation
    const preliminaryTransforms = resolvePreliminaryScopeTransforms(child, index, frame);
    const preliminaryScopeChain =
      preliminaryTransforms === undefined ? frame.scopeChain : [...frame.scopeChain, ...preliminaryTransforms];
    const layoutPlaceholder = registerScopeLayoutPlaceholder(child, { index, frame });

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) {
      runtime.state.namespaceStack.pushFrame();
      runtime.state.identityTracker?.pushNamespaceFrame();
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
        scopeChain: preliminaryScopeChain,
        primitiveSink: scopePrimitiveSink,
        locatorPrefix: `${locatorPrefix}children[${index}].scope.`,
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        styleStack: [...styleStack, createStyleResolveFrame(child)],
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

      const intrinsicLayout = createIntrinsicScopeLayout(child, scopeLayouts);
      scopeTransforms = resolveFinalScopeTransforms(
        child,
        index,
        frame,
        intrinsicLayout,
        placementTarget,
        preliminaryTransforms,
      );
      const postTransforms =
        preliminaryTransforms === undefined
          ? scopeTransforms
          : scopeTransforms.slice(0, scopeTransforms.length - preliminaryTransforms.length);
      for (const layout of scopePublications) {
        applyOwnTransformsToPublishedLayout(layout, frame.scopeChain, postTransforms);
        frame.publicationSink.push(layout);
      }
      for (const observation of scopeObservations) {
        observation.scopeChain.splice(frame.scopeChain.length, 0, ...postTransforms);
        frame.observationSink.push(observation);
      }
      frame.artifactSink.push(...scopeArtifacts);
      for (const observation of scopeCompileObservations) {
        observation.scopeChain.splice(frame.scopeChain.length, 0, ...postTransforms);
      }
      for (const spatialHandle of scopeSpatialHandles) {
        spatialHandle.scopeChain.splice(frame.scopeChain.length, 0, ...postTransforms);
        frame.spatialHandleSink.push(spatialHandle);
      }
      for (const pendingPath of scopePendingPaths) {
        pendingPath.scopeChain.splice(frame.scopeChain.length, 0, ...postTransforms);
      }

      const finalEnvelope =
        scopeTransforms.length === 0 ? intrinsicLayout : projectLayoutToGlobal(intrinsicLayout, scopeTransforms);
      if (child.id === undefined) {
        for (const scopeLayout of scopeLayouts) {
          frame.layoutSink.push(
            scopeTransforms.length === 0 ? scopeLayout : projectLayoutToGlobal(scopeLayout, scopeTransforms),
          );
        }
      } else {
        const globalEnvelope = projectLayoutToGlobal(finalEnvelope, frame.scopeChain);
        runtime.state.namespaceStack.replaceLayout(
          child.id,
          globalEnvelope,
          layoutPlaceholder.parentFrameDepth,
          layoutPlaceholder.placeholderLayout,
        );
        frame.layoutSink.push(finalEnvelope);
        frame.publicationSink.push(globalEnvelope);
      }
      flushPendingPathEmissions(scopePendingPaths);
      frame.compileObservationSink.push(...scopeCompileObservations);
      for (const contribution of scopeBounds) {
        frame.boundsSink.push({
          points: contribution.points.map(point => applyTransformChain(point, scopeTransforms)),
          shadow: contribution.shadow,
        });
      }
      for (const contribution of effectiveAllocations(scopeAllocations)) {
        pushAllocation(
          frame.allocationSink,
          contribution.points.map(point => applyTransformChain(point, scopeTransforms)),
          frame.allocationBoundary,
        );
      }
      const structuralGuides = resolveStructuralAlignmentGuides(scopeAlignmentGuides);
      const transformedGuides = transformAlignmentGuides(structuralGuides, scopeTransforms);
      if (transformedGuides !== undefined) frame.alignmentGuideSink.push(...transformedGuides);
    } finally {
      if (didPushNamespaceFrame) {
        runtime.state.namespaceStack.popFrame();
        runtime.state.identityTracker?.popNamespaceFrame();
      }
    }

    emitScopeGroup(child, {
      index,
      scopeTransforms,
      scopePrimitiveSink,
      frame,
      ...(semanticOwner === undefined ? {} : { semanticOwner }),
      ...(preResolvedClipShape === undefined ? {} : { resolvedClipShape: preResolvedClipShape }),
    });
  };

  const emptyBounds = (): Readonly<BoundsRect> => canonicalizeBoundsRect({ x: 0, y: 0, width: 0, height: 0 });

  const boundsRectOf = (result: TraversalResult): Readonly<BoundsRect> =>
    (() => {
      const allocation = effectiveAllocations(result.allocations).reduce(
        (current, contribution) => collectLayoutBounds(current, contribution.points),
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
      throw new RetikzCompositeContractError(
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
      throw new RetikzCompositeContractError(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} returned invalid allocationBounds; x/y must be finite and width/height must be finite non-negative numbers.`,
      );
    }
    const right = (x as number) + (width as number);
    const bottom = (y as number) + (height as number);
    if (!Number.isFinite(right) || !Number.isFinite(bottom)) {
      throw new RetikzCompositeContractError(
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

  /** 只在 definition schema parse 后恢复 erased layout callback */
  const callableLayoutDefinition = (
    definition: NonNullable<ReturnType<typeof runtime.context.composites.get>>,
  ): CallableLayoutCompositeDefinition => {
    if (definition.compile === undefined) {
      throw new RetikzCompileInvariantError('internal: callableLayoutDefinition received an expand composite');
    }
    return definition as unknown as CallableLayoutCompositeDefinition;
  };

  const remapPaint = (paint: PaintValue | undefined, ids: ReadonlyMap<string, string>): PaintValue | undefined => {
    if (paint === undefined || typeof paint === 'string' || paint.kind === 'contextStroke') return paint;
    const id = ids.get(paint.id);
    if (id === undefined)
      throw new RetikzCompileInvariantError(`internal: replay paint resource '${paint.id}' was not imported`);
    return { kind: 'resourceRef', id };
  };

  const remapPrimitiveResources = (primitive: ScenePrimitive, ids: ReadonlyMap<string, string>): ScenePrimitive => {
    if (primitive.type === 'group') {
      const clipRef = primitive.clipRef === undefined ? undefined : ids.get(primitive.clipRef);
      if (primitive.clipRef !== undefined && clipRef === undefined) {
        throw new RetikzCompileInvariantError(`internal: replay clip resource '${primitive.clipRef}' was not imported`);
      }
      return {
        ...primitive,
        ...(clipRef !== undefined ? { clipRef } : {}),
        children: primitive.children.map(child => remapPrimitiveResources(child, ids)),
      };
    }
    if (primitive.type === 'text') return { ...primitive };
    return {
      ...primitive,
      fill: remapPaint(primitive.fill, ids),
      stroke: remapPaint(primitive.stroke, ids),
    };
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
      { kind: 'replay', index },
      ...child.expansionPath.slice(origin.expansionPath.length),
    ],
  });

  type PreparedReplay = Readonly<{
    transaction: CompositeReplayTransaction;
    wrapperClipShape?: ClipShape;
  }>;

  /** replay transaction 捕获的 primitive resource ref 必须在提交前完整可解析 */
  const validateReplayResourceRefs = (transaction: CompositeReplayTransaction): void => {
    const replayResourceIds = new Set(transaction.resources.map(resource => resource.id));
    const visit = (primitive: ScenePrimitive): void => {
      if (primitive.type === 'group') {
        if (primitive.clipRef !== undefined && !replayResourceIds.has(primitive.clipRef)) {
          throw new RetikzCompileInvariantError(
            `internal: replay clip resource '${primitive.clipRef}' was not captured`,
          );
        }
        primitive.children.forEach(visit);
        return;
      }
      if (primitive.type === 'text') return;
      for (const paint of [primitive.fill, primitive.stroke]) {
        if (paint !== undefined && typeof paint === 'object' && paint.kind !== 'contextStroke') {
          if (!replayResourceIds.has(paint.id)) {
            throw new RetikzCompileInvariantError(`internal: replay paint resource '${paint.id}' was not captured`);
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
    semanticOwner?: RuntimeSemanticOwner,
    authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
  ): void => {
    const prepared = preparedReplays.get(token);
    if (prepared === undefined)
      throw new RetikzCompileInvariantError('internal: replay was not preflighted before commit');
    const { wrapperClipShape } = prepared;
    const transaction =
      prepared.transaction.materialize !== undefined &&
      (prepared.transaction.styleFingerprint !== replayStyleFingerprint(frame.styleStack) ||
        prepared.transaction.themeFingerprint !== replayThemeFingerprint(frame.theme))
        ? prepared.transaction.materialize({
            scopeChain: frame.scopeChain,
            styleStack: frame.styleStack,
            theme: frame.theme,
          })
        : prepared.transaction;
    validateReplayResourceRefs(transaction);

    const transforms = wrapper?.transforms;
    const authoredPreliminary = transaction.scopeChainApplied ? undefined : authoredPreliminaryTransforms;
    const resourceIds = new Map<string, string>();
    for (const resource of transaction.resources) {
      if (resource.kind === 'paint') {
        const imported = runtime.context.paint.importResolved(resource);
        if (typeof imported !== 'object' || imported.kind !== 'resourceRef') {
          throw new RetikzCompileInvariantError('internal: imported paint did not produce a resourceRef');
        }
        resourceIds.set(resource.id, imported.id);
      } else {
        resourceIds.set(resource.id, runtime.context.clip.importPath(resource.path));
      }
    }
    const wrapperClipRef =
      wrapperClipShape === undefined ? undefined : runtime.context.clip.importResolved(wrapperClipShape);
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
        const wrapped: GroupPrim =
          wrapperClipRef === undefined
            ? (placed as GroupPrim)
            : { type: 'group', clipRef: wrapperClipRef, children: [placed] };
        frame.primitiveSink.push(wrapped);
        committedPrimitives.push(wrapped);
        recordPrimitiveZIndex(runtime.state.zIndexOf, wrapped, transaction.primitiveZIndices[index]);
      });
    }
    if (semanticOwner !== undefined) {
      runtime.state.identityTracker?.recordPrimitives(committedPrimitives, semanticOwner, 'composite-replay');
      transaction.topologyIdentityIds.forEach(id =>
        runtime.state.identityTracker?.registerGeneratedIdentity(id, semanticOwner),
      );
    }

    const suppressedNamespaceWarnings = new Set<CompileWarningInput>();
    const namespaceParentChain =
      authoredPreliminary === undefined
        ? frame.scopeChain
        : frame.scopeChain.slice(0, frame.scopeChain.length - authoredPreliminary.length);
    const namespaceTransforms = [...(authoredPreliminary ?? []), ...(transforms ?? [])];
    for (const [changeIndex, change] of transaction.namespaceChanges.entries()) {
      if (namespaceTransforms.length > 0) {
        applyOwnTransformsToPublishedLayout(change.entry.layout, namespaceParentChain, namespaceTransforms);
      }
      const changeOccurrence = transaction.namespaceChangeOccurrences[changeIndex] ?? occurrence;
      const committedAgainstBaseline = withWarningOccurrence(
        replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, changeOccurrence),
        () => runtime.state.namespaceStack.commitForkChange(change),
      );
      if (change.overwroteBaseline && !committedAgainstBaseline) {
        const baselineWarning = transaction.namespaceBaselineWarnings.find(candidate => candidate.id === change.id);
        if (baselineWarning !== undefined) suppressedNamespaceWarnings.add(baselineWarning.warning);
      }
      frame.publicationSink.push(change.entry.layout);
    }
    for (const layout of transaction.layouts) {
      frame.layoutSink.push(
        transforms === undefined || transforms.length === 0 ? layout : projectLayoutToGlobal(layout, transforms),
      );
    }
    if (wrapperClipRef === undefined) {
      for (const contribution of transaction.bounds) {
        frame.boundsSink.push({
          points:
            transforms === undefined || transforms.length === 0
              ? contribution.points
              : contribution.points.map(point => applyTransformChain(point, transforms)),
          shadow: contribution.shadow,
        });
      }
    } else {
      const visualBounds = optionalVisualBoundsOfPrimitives(committedPrimitives, [
        ...runtime.context.paint.resources(),
        ...runtime.context.clip.resources(),
      ]);
      if (visualBounds !== undefined) frame.boundsSink.push({ points: allocationPointsOf(visualBounds) });
    }
    for (const contribution of effectiveAllocations(transaction.allocations)) {
      pushAllocation(
        frame.allocationSink,
        transforms === undefined || transforms.length === 0
          ? contribution.points
          : contribution.points.map(point => applyTransformChain(point, transforms)),
        frame.allocationBoundary,
      );
    }
    for (const observation of transaction.observations) {
      if (authoredPreliminary !== undefined && authoredPreliminary.length > 0) {
        observation.scopeChain.splice(frame.scopeChain.length - authoredPreliminary.length, 0, ...authoredPreliminary);
      }
      if (transforms !== undefined && transforms.length > 0) {
        observation.scopeChain.splice(frame.scopeChain.length, 0, ...transforms);
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
        spatialHandle.scopeChain.splice(
          frame.scopeChain.length - authoredPreliminary.length,
          0,
          ...authoredPreliminary,
        );
      }
      if (transforms !== undefined && transforms.length > 0) {
        spatialHandle.scopeChain.splice(frame.scopeChain.length, 0, ...transforms);
      }
      frame.spatialHandleSink.push(spatialHandle);
    }
    for (const observation of transaction.compileObservations) {
      if (authoredPreliminary !== undefined && authoredPreliminary.length > 0) {
        observation.scopeChain.splice(frame.scopeChain.length - authoredPreliminary.length, 0, ...authoredPreliminary);
      }
      if (transforms !== undefined && transforms.length > 0) {
        observation.scopeChain.splice(frame.scopeChain.length, 0, ...transforms);
      }
      frame.compileObservationSink.push({
        ...observation,
        occurrence: replayOccurrence(occurrence, outputIndex, transaction.originOccurrence, observation.occurrence),
      });
    }
  };

  /** opaque handle 只由当前 compile session 的 identity table 识别 */
  const isCompositeOutputHandle = (output: unknown): output is CompositeCompileChild =>
    output !== null && typeof output === 'object' && runtime.context.session.outputChildren.has(output);

  type PreparedRuntimeOutput = Readonly<{
    output: CompositeRuntimeOutputChild;
    scopeClipShape?: ClipShape;
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
    const reachableSpatialHandleKeys = new Set<string>();
    const entriesToConsume: Array<{ used: boolean }> = [];
    const transactionsToConsume: Array<CompositeReplayTransaction> = [];
    const visitHandle = (handle: unknown): void => {
      if (handle === null || typeof handle !== 'object') {
        throw new RetikzCompositeContractError(`${owner.label} received an invalid or forged output child.`);
      }
      const entry = runtime.context.session.outputChildren.get(handle);
      if (entry === undefined) {
        throw new RetikzCompositeContractError(
          `${owner.label} received an output child that does not belong to this compile or was forged.`,
        );
      }
      if (entry.owner !== owner) {
        throw new RetikzCompositeContractError(
          `${owner.label} received an output child that does not belong to this composite callback.`,
        );
      }
      if (entry.used) {
        throw new RetikzCompositeContractError(`${owner.label} received an output child that was already consumed.`);
      }
      if (preparedOutputs.has(handle)) {
        throw new RetikzCompositeContractError(`${owner.label} received the same output child more than once.`);
      }
      entriesToConsume.push(entry);
      if (entry.child.kind === 'scope') {
        for (const declaration of entry.child.spatialHandles ?? []) {
          if (reachableSpatialHandleKeys.has(declaration.key)) {
            throw new RetikzCompositeContractError(
              `${owner.label} declared duplicate spatial handle key '${declaration.key}' across reachable runtime Scopes.`,
            );
          }
          reachableSpatialHandleKeys.add(declaration.key);
        }
        const scopeClipShape =
          entry.child.props.clip === undefined
            ? undefined
            : runtime.context.clip.resolve(
                resolveClipValue(entry.child.props.clip, { clips: runtime.context.clips, irPath: 'clip' }),
              );
        preparedOutputs.set(handle, {
          output: entry.child,
          ...(scopeClipShape === undefined ? {} : { scopeClipShape }),
        });
        for (const child of entry.child.children) if (isCompositeOutputHandle(child)) visitHandle(child);
        return;
      }
      preparedOutputs.set(handle, { output: entry.child });
      const transaction = runtime.context.session.replayTransactions.get(entry.child.replay);
      if (transaction === undefined) {
        throw new RetikzCompositeContractError(
          `${owner.label} received a replay token that does not belong to this compile or was forged.`,
        );
      }
      if (transaction.owner !== owner) {
        throw new RetikzCompositeContractError(
          `${owner.label} received a replay token that does not belong to this composite callback.`,
        );
      }
      if (transaction.used) {
        throw new RetikzCompositeContractError(
          `${transaction.owner.label} replay token may be placed at most once and was already replayed.`,
        );
      }
      if (preparedReplays.has(entry.child.replay)) {
        throw new RetikzCompositeContractError(
          `${owner.label} received the same replay token more than once and it was already replayed.`,
        );
      }
      const wrapperClipShape =
        entry.child.wrapper?.clip === undefined
          ? undefined
          : runtime.context.clip.resolve(
              resolveClipValue(entry.child.wrapper.clip, { clips: runtime.context.clips, irPath: 'clip' }),
            );
      validateReplayResourceRefs(transaction);
      preparedReplays.set(entry.child.replay, {
        transaction,
        ...(wrapperClipShape === undefined ? {} : { wrapperClipShape }),
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
    scopeSegment: 'output' | 'scopeChild',
    compositeDepth: number,
    owner: CompositeCompileOwner,
    prepared: PreparedCompositeOutputs,
    semanticOwner?: RuntimeSemanticOwner,
    preparedScopeClipShape?: ClipShape,
    authoredPreliminaryTransforms?: ReadonlyArray<Transform>,
  ): void => {
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
        : runtime.state.identityTracker?.createGeneratedOwner(runtimeScopeChild, index, semanticOwner);
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
            scopeChain: [...scopeFrame.scopeChain],
          });
        }
        for (const [childIndex, child] of output.children.entries()) {
          if (!isCompositeOutputHandle(child)) {
            const childOccurrence: CompileOccurrenceLocator = {
              sourcePath: scopeOccurrence.sourcePath,
              expansionPath: [...scopeOccurrence.expansionPath, { kind: 'scopeChild' as const, index: childIndex }],
            };
            compileChild(
              child,
              childIndex,
              scopeFrame,
              childOccurrence,
              compositeDepth,
              true,
              scopeSemanticOwner === undefined
                ? undefined
                : runtime.state.identityTracker?.createGeneratedOwner(child, childIndex, scopeSemanticOwner),
            );
            continue;
          }
          const preparedChild = prepared.outputs.get(child);
          if (preparedChild === undefined) {
            throw new RetikzCompileInvariantError('internal: runtime Scope output child was not preflighted');
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
            preparedChild.scopeClipShape,
            scopePreliminaryTransforms,
          );
        }
      },
      preparedScopeClipShape,
    );
  };

  const compileCompositeChild = (
    child: Extract<IRChild, { namespace: string }>,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    semanticOwner?: RuntimeSemanticOwner,
  ): void => {
    const key = `${child.namespace}.${child.type}`;
    const compositeIrPath = `${frame.locatorPrefix}children[${index}]`;
    const definition = runtime.context.composites.get(key);
    if (definition === undefined) {
      if (options.probe === true) {
        throw new RetikzLayoutProbeRecoverableError(
          `No composite registered for '${key}' at ${formatCompileOccurrence(occurrence)}`,
          { providerKey: key, occurrence },
        );
      }
      runtime.context.onWarn({
        code: CompileWarningCode.CompositeNotRegistered,
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
    const parsed = parseProviderPayload({
      capability: 'composite',
      providerName: key,
      irPath: occurrence.sourcePath,
      payloadName: 'payload',
      schema: definition.schema,
      value: child,
    });
    const parsedId = (parsed as Record<string, unknown>).id;
    const spatialOwner: SpatialHandleOwner = Object.freeze({
      namespace: child.namespace,
      type: child.type,
      ...(typeof parsedId === 'string' ? { instanceId: parsedId } : {}),
      occurrence: freezeOccurrence(occurrence),
    });
    const spatialOwnerPath = Object.freeze([...frame.spatialOwnerPath, spatialOwner]);
    if (definition.expand !== undefined) {
      const callable = definition as unknown as {
        expand: (node: unknown, context: Readonly<{ theme: TraversalFrame['theme'] }>) => CompositeExpandResult;
      };
      const produced = callable.expand(parsed, Object.freeze({ theme: frame.theme }));
      const expanded = validateExpandCompositeOutput(`Composite '${key}'`, produced);
      for (const declaration of expanded.spatialHandles ?? []) {
        frame.spatialHandleSink.push({
          ownerPath: spatialOwnerPath,
          declaration,
          finalOccurrence: freezeOccurrence(occurrence),
          originOccurrence: freezeOccurrence(occurrence),
          scopeChain: [...frame.scopeChain],
        });
      }
      const expandedFrame: TraversalFrame = { ...frame, spatialOwnerPath };
      for (const [outputIndex, output] of expanded.children.entries()) {
        compileChild(
          output,
          outputIndex,
          expandedFrame,
          {
            sourcePath: occurrence.sourcePath,
            expansionPath: [...occurrence.expansionPath, { kind: 'expand', index: outputIndex }],
          },
          compositeDepth + 1,
          true,
          semanticOwner === undefined
            ? undefined
            : runtime.state.identityTracker?.createGeneratedOwner(output, outputIndex, semanticOwner),
        );
      }
      return;
    }
    const callable = callableLayoutDefinition(definition);
    const observationOwner = Object.freeze({
      kind: 'composite' as const,
      namespace: child.namespace,
      type: child.type,
    });
    const observerKeys =
      callable.artifactSchema === undefined || runtime.context.observation === undefined
        ? []
        : runtime.context.observation.select(
            Object.freeze({ owner: observationOwner, sourcePath: occurrence.sourcePath }),
          );
    const owner: CompositeCompileOwner = {
      label: `Composite '${key}' at ${formatCompileOccurrence(occurrence)}`,
    };
    let callbackResult: unknown;
    let layoutProbeIndex = 0;

    const probeLayoutChild = (
      clonedChild: IRChild,
      clonedProposal: LayoutProposal,
      probeOccurrence: CompileOccurrenceLocator,
      probeScopeChain: ReadonlyArray<Transform>,
      probeStyleStack: TraversalFrame['styleStack'],
      probeTheme: TraversalFrame['theme'],
      scopeChainApplied = false,
    ): Readonly<{ layoutResult: LayoutChildResult; transaction: CompositeReplayTransaction }> => {
      const warnings: Array<CompileWarningInput> = [];
      const namespaceBaselineWarnings: Array<{ id: string; warning: CompileWarningInput }> = [];
      const captureWarning = (warning: CompileWarningInput): void => {
        if (
          warning.code === CompileWarningCode.UnresolvedNodeReference ||
          warning.code === CompileWarningCode.OffsetBaseUnresolved ||
          warning.code === CompileWarningCode.PolarOriginUnresolved ||
          warning.code === CompileWarningCode.AtTargetUnresolved
        ) {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            `Composite '${key}' at ${formatCompileOccurrence(occurrence)} cannot layout child with an unresolved reference: ${warning.message}`,
          );
        }
        warnings.push(warning);
      };
      const paint = createPaintRegistry(context.round);
      const clip = createClipRegistry(context.round, context.clips, context.maxClipDepth);
      const probeIdentityTracker =
        runtime.state.identityTracker === undefined
          ? undefined
          : createRuntimeTopologyTracker(runtime.state.identityTracker.revision);
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
        namespaceStack,
        scopeChain: probeScopeChain,
        styleStack: probeStyleStack,
        theme: probeTheme,
        occurrence: probeOccurrence,
        compositeDepth: compositeDepth + 1,
        generated: true,
        probe: true,
        proposal: clonedProposal,
        session: runtime.context.session,
        spatialOwnerPath,
        ...(probeIdentityTracker === undefined ? {} : { identityTracker: probeIdentityTracker }),
        observeWarningOccurrence: current => {
          probeWarningOccurrence = current ?? probeOccurrence;
        },
      });
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
        topologyIdentityIds: [...(probeIdentityTracker?.rootIdentityRegistrations() ?? [])],
        namespaceBaselineWarnings,
        resources,
        warnings,
        artifacts: laid.artifacts,
        compileObservations: laid.compileObservations,
        spatialHandles: laid.spatialHandles,
        styleFingerprint: replayStyleFingerprint(probeStyleStack),
        themeFingerprint: replayThemeFingerprint(probeTheme),
        ...(scopeChainApplied ? { scopeChainApplied: true } : {}),
      };
      return { layoutResult, transaction };
    };

    try {
      callbackResult = callable.compile(parsed, {
        theme: frame.theme,
        proposal: cloneLayoutProposal(frame.childProposal ?? NaturalLayoutProposal, key, occurrence),
        layoutChild: (nextChild, proposal) => {
          const clonedProposal = cloneLayoutProposal(proposal, key, occurrence);
          const clonedChild = withProviderOutputValidationBoundary(owner.label, () =>
            snapshotCompositeLayoutChild(owner.label, nextChild, layoutProbeIndex),
          );
          const probeOccurrence = freezeOccurrence({
            sourcePath: occurrence.sourcePath,
            expansionPath: [...occurrence.expansionPath, { kind: 'probe', index: layoutProbeIndex }],
          });
          layoutProbeIndex += 1;
          try {
            const probed = probeLayoutChild(
              clonedChild,
              clonedProposal,
              probeOccurrence,
              frame.scopeChain,
              frame.styleStack,
              frame.theme,
            );
            const { layoutResult, transaction } = probed;
            transaction.materialize = ({ scopeChain, styleStack, theme }: CompositeReplayMaterializeContext) =>
              probeLayoutChild(clonedChild, clonedProposal, probeOccurrence, scopeChain, styleStack, theme, true)
                .transaction;
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
        scope: (props, children, spatialHandles) =>
          createCompositeScopeChild(runtime.context.session, owner, props, children, spatialHandles),
      });
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isRetikzLayoutProbeRecoverableError(thrown)) throw thrown;
      throw new RetikzLayoutProbeRecoverableError(
        safeErrorMessage(thrown, 'Composite callback threw a non-Error value'),
        {
          cause: thrown,
          providerKey: key,
          occurrence,
        },
      );
    }

    const validatedResult = withProviderOutputValidationBoundary(owner.label, () => {
      if (
        callbackResult === null ||
        typeof callbackResult !== 'object' ||
        Array.isArray(callbackResult) ||
        !('children' in callbackResult)
      ) {
        throw new RetikzCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }
      const result = callbackResult as ReturnType<CallableLayoutCompositeDefinition['compile']>;
      const resultChildren = result.children;
      const resultAllocationBounds = result.allocationBounds;
      const resultAlignmentGuides = result.alignmentGuides;
      const resultArtifact = result.artifact;
      if ('spatialHandles' in callbackResult) {
        throw new RetikzCompositeContractError(
          `${owner.label} returned unsupported compile result field 'spatialHandles'.`,
        );
      }
      if (!Array.isArray(resultChildren)) {
        throw new RetikzCompositeContractError(
          `${owner.label} returned an invalid compile result; children must be an array.`,
        );
      }
      const children = Array.from(resultChildren, (output, outputIndex): IRChild | CompositeCompileChild => {
        if (isCompositeOutputHandle(output)) return output;
        return snapshotCompositeOutputChild(owner.label, output, outputIndex);
      });
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
          throw new RetikzCompositeContractError(`Composite '${key}' returned artifact without artifactSchema.`);
        }
        let parsedArtifact: JsonValue;
        try {
          parsedArtifact = callable.artifactSchema.parse(resultArtifact);
        } catch (cause) {
          throw new RetikzCompositeContractError(`${owner.label} returned an invalid artifact.`, { cause });
        }
        let frozenArtifact: JsonValue;
        try {
          frozenArtifact = cloneAndFreezeJson(parsedArtifact, `Composite '${key}' artifact`);
        } catch (cause) {
          const detail = safeThrownDetail(cause);
          throw new RetikzCompositeContractError(`${owner.label} returned a non-JSON artifact: ${detail}`, { cause });
        }
        compositeArtifact = freezeCompileArtifact({
          kind: 'composite',
          namespace: definition.namespace,
          type: definition.type,
          occurrence,
          value: frozenArtifact,
        });
      }
      return { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact };
    });
    const { children, explicitAllocation, explicitAlignmentGuides, compositeArtifact } = validatedResult;
    if (observerKeys.length > 0) {
      if (compositeArtifact === undefined) {
        throw new RetikzCompositeContractError(
          `Composite '${key}' at ${formatCompileOccurrence(occurrence)} was selected for observation but returned no artifact.`,
        );
      }
      frame.compileObservationSink.push({
        owner: observationOwner,
        occurrence: freezeOccurrence(occurrence),
        origin: freezeOccurrence(occurrence),
        scopeChain: [...frame.scopeChain],
        value: compositeArtifact.value,
        observerKeys,
        theme: frame.theme,
        styleStack: [...frame.styleStack],
      });
    }
    const outputFrame: TraversalFrame = {
      ...frame,
      alignmentGuideSink: [],
      spatialOwnerPath,
      ...(explicitAllocation === undefined ? {} : { allocationBoundary: {} }),
    };
    const preparedOutputs = preflightCompositeOutputs(children, owner);
    if (compositeArtifact !== undefined) frame.artifactSink.push(compositeArtifact);
    for (const [outputIndex, output] of children.entries()) {
      if (!isCompositeOutputHandle(output)) {
        const outputOccurrence: CompileOccurrenceLocator = {
          sourcePath: occurrence.sourcePath,
          expansionPath: [...occurrence.expansionPath, { kind: 'output', index: outputIndex }],
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
            : runtime.state.identityTracker?.createGeneratedOwner(output, outputIndex, semanticOwner),
        );
        continue;
      }
      compileRuntimeOutputChild(
        preparedOutputs.outputs.get(output)?.output ??
          (() => {
            throw new RetikzCompileInvariantError('internal: composite output child was not preflighted');
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
        preparedOutputs.outputs.get(output)?.scopeClipShape,
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
    semanticOwner?: RuntimeSemanticOwner,
  ): void => {
    try {
      withWarningOccurrence(occurrence, () => {
        if (context.trace !== undefined) context.trace.visited += 1;
        if ('namespace' in child) {
          compileCompositeChild(child, index, frame, occurrence, compositeDepth, semanticOwner);
          return;
        }
        switch (child.type) {
          case 'node':
            emitNodeChild(child, index, frame, occurrence, semanticOwner);
            break;
          case 'coordinate':
            registerCoordinateChild(child, index, frame);
            break;
          case 'scope':
            compileScopeChild(child, index, frame, generated ? occurrence : undefined, compositeDepth, semanticOwner);
            break;
          default:
            queuePathChild(child, index, frame, occurrence, semanticOwner);
        }
      });
    } catch (thrown) {
      const entityPath = `${frame.locatorPrefix}children[${index}]`;
      options.observeFailurePath?.('namespace' in child ? entityPath : `${entityPath}.${child.type}`);
      if (isFatalProbeError(thrown)) throw thrown;
      const providerKey = 'namespace' in child ? `${child.namespace}.${child.type}` : child.type;
      if (isRetikzLayoutProbeRecoverableError(thrown)) {
        throw enrichLayoutProbeError(thrown, providerKey, occurrence);
      }
      throw new RetikzLayoutProbeRecoverableError(
        safeErrorMessage(thrown, 'Child compilation threw a non-Error value'),
        {
          cause: thrown,
          providerKey,
          occurrence,
        },
      );
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
      runtime.state.identityTracker === undefined || frame.semanticOwner === undefined
        ? undefined
        : runtime.state.identityTracker.createChildOwners(children, frame.semanticOwner, generated);
    for (const [i, child] of children.entries()) {
      const entityPath = `${frame.locatorPrefix}children[${i}]`;
      const occurrence = generatedScopeOccurrence
        ? {
            sourcePath: generatedScopeOccurrence.sourcePath,
            expansionPath: [...generatedScopeOccurrence.expansionPath, { kind: 'scopeChild' as const, index: i }],
          }
        : useProvidedOccurrence && options.occurrence !== undefined && children.length === 1
          ? options.occurrence
          : {
              sourcePath: 'namespace' in child ? entityPath : `${entityPath}.${child.type}`,
              expansionPath: [],
            };
      compileChild(child, i, frame, occurrence, compositeDepth, generated, semanticOwners?.[i]);
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
      scopeChain: options.scopeChain ?? [],
      primitiveSink: runtime.state.primitives,
      locatorPrefix: '',
      layoutSink: rootLayouts,
      pathSink: rootPendingPaths,
      styleStack: options.styleStack ?? [],
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
      ...(options.semanticOwner === undefined && runtime.state.identityTracker === undefined
        ? {}
        : { semanticOwner: options.semanticOwner ?? runtime.state.identityTracker?.root }),
    },
    true,
  );
  flushPendingPathEmissions(rootPendingPaths);
  for (const contribution of rootBounds) {
    runtime.state.layoutBounds = collectLayoutBounds(
      runtime.state.layoutBounds,
      contribution.points,
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
            computeCompiledNodeLayout(observation.layout, observation.scopeChain),
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
    throw new RetikzCompileInvariantError(
      `internal: ${runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
    );
  }

  const primitives = stableSortByZIndex(sealSink(runtime.state.primitives), runtime.state.zIndexOf);
  const alignmentGuides = resolveStructuralAlignmentGuides(rootAlignmentGuides);
  return {
    primitives,
    primitiveZIndices: primitives.map(primitive => runtime.state.zIndexOf.get(primitive)),
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
