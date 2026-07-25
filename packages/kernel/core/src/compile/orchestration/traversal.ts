import type { BoundsRect } from '@retikz/math';

import { boundsToRect } from '@retikz/math';

import type {
  ChildLayoutConstraint,
  CompositeReplay,
  CompositeReplayPlacement,
  GroupPrim,
  PaintValue,
  PathKindCompileResult,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import type {
  IRChild,
  IRPathBase,
  IRPosition,
  IRScopePlacementTarget,
  IRScopeSelfPoint,
  IRTransform,
} from '../../schemas';
import type { NodeLayout } from '../node';
import type { CompileOccurrenceLocator } from '../types';
import type { CompileWarning, CompileWarningCodeValue } from '../warning';
import type { CompileContext } from './context';
import type { InternalScenePrimitive } from './primitive';
import type {
  CallableLayoutCompositeDefinition,
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

import { providerDefinitionOf } from '../../providers/registry';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
import { formatCompileOccurrence } from '../artifact';
import { CompileWarningCode } from '../constants';
import { NamespaceStack } from '../namespace';
import {
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
import { resolveNodeTextColor } from '../node';
import { emitPathPrimitive, emitRibbonPrimitive, refPointOfTarget } from '../path';
import { resolvePosition } from '../position';
import { parseProviderPayload } from '../provider-payload';
import { resolveAnchorRefUncached } from '../reference';
import { createClipRegistry, createPaintRegistry } from '../resource';
import { collectScopeCornerPoints, computeScopeBoundingBox, lowerScopeTransforms } from '../scope';
import { createStyleFrame, resolveEffectivePath, resolveLabelDefault, resolveNodeStyle, resolveShadow } from '../style';
import { applyTransformChain, inverseTransformChain, projectLayoutToGlobal } from '../transform';
import { filterAnimations } from './animation';
import { cloneAndFreezeJson, freezeCompileArtifact, orderCompileArtifacts } from './artifact';
import { collectLayoutBounds } from './bounds';
import { createDuplicateWarning, transformWarnCode } from './diagnostics';
import {
  collectPlaceholderLocators,
  makePathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';
import { visualBoundsOfPrimitives } from './visual-bounds';

/** 编译 child 树，完成 namespace 注册、延迟 path 回填、zIndex 排序和自动 layout bbox 收集 */
export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
  options: TraversalCompileOptions = {},
): TraversalResult => {
  const session = options.session ?? { owner: {}, replayTransactions: new WeakMap() };
  /** 编译运行时环境 */
  const runtime: TraversalRuntime = {
    context: {
      measureText: context.measureText,
      lowerTex: context.lowerTex,
      onWarn: context.onWarn,
      round: context.round,
      nodeDistance: context.nodeDistance,
      labelDistance: context.labelDistance,
      rootFontSize: context.rootFontSize,
      shapes: context.shapes,
      boundaries: context.boundaries,
      arrows: context.arrows,
      pathGenerators: context.pathGenerators,
      pathKinds: context.pathKinds,
      ribbonWidthProfiles: context.ribbonWidthProfiles,
      paint: context.paint,
      clip: context.clip,
      composites: context.composites,
      maxCompositeDepth: context.maxCompositeDepth,
      artifacts: context.artifacts,
      constraint: options.constraint ?? { kind: 'intrinsic' },
      session,
    },
    state: {
      primitives: [],
      layoutBounds: undefined,
      namespaceStack:
        options.namespaceStack ??
        new NamespaceStack({
          onDuplicate: info => context.onWarn(createDuplicateWarning(info)),
        }),
      zIndexOf: new WeakMap(),
      placeholderBalance: 0,
    },
  };

  /** 按 path.kind 查找 path kind provider，并提供内置 stroke / ribbon emit 回调 */
  const emitPathKindPrimitive = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null => {
    const kind = path.kind ?? 'stroke';
    const definition = providerDefinitionOf(runtime.context.pathKinds, kind, {
      capability: 'path kind',
      optionName: 'pathKinds',
    });
    const optionsValue = definition.optionsSchema
      ? parseProviderPayload({
          capability: 'path kind',
          providerName: kind,
          irPath: `${irPath}.kindOptions`,
          payloadName: 'options',
          schema: definition.optionsSchema,
          value: path.kindOptions ?? {},
        })
      : (path.kindOptions ?? {});
    const emitOptions = {
      onWarn: runtime.context.onWarn,
      irPath,
      scopeChain,
      resolvePaint: runtime.context.paint.register,
      resolvedArrows: runtime.context.arrows,
      effectivePathGenerators: runtime.context.pathGenerators,
      lowerTex: runtime.context.lowerTex,
      rootFontSize: runtime.context.rootFontSize,
    };
    return definition.compile({
      path,
      options: optionsValue,
      emitStroke: nextPath =>
        emitPathPrimitive(nextPath ?? path, {
          namespaceStack: runtime.state.namespaceStack,
          round: runtime.context.round,
          measureText: runtime.context.measureText,
          options: emitOptions,
        }),
      emitRibbon: nextPath =>
        emitRibbonPrimitive(nextPath ?? path, {
          namespaceStack: runtime.state.namespaceStack,
          round: runtime.context.round,
          measureText: runtime.context.measureText,
          options: {
            ...emitOptions,
            ribbonWidthProfiles: runtime.context.ribbonWidthProfiles,
          },
        }),
    });
  };

  /** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器 */
  const flushPendingPathEmissions = (pendingPaths: ReadonlyArray<PendingPathEmission>): void => {
    if (pendingPaths.length === 0) return;
    runtime.state.namespaceStack.enterResolvingPhase();
    try {
      for (const pendingPath of pendingPaths) {
        const result = emitPathKindPrimitive(pendingPath.path, pendingPath.irPath, pendingPath.scopeChain);
        const primitives = result?.primitives ?? [];
        const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
        if (idx === -1) {
          throw new Error('internal: path placeholder missing from its sink');
        }
        pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
        runtime.state.placeholderBalance--;
        for (const prim of primitives) recordPrimitiveZIndex(runtime.state.zIndexOf, prim, pendingPath.zIndex);
        if (result !== null) {
          pendingPath.boundsSink.push({
            points: [...result.boundsPoints],
            shadow: resolveShadow(pendingPath.path.shadow),
          });
          pendingPath.allocationSink.push({ points: [...result.boundsPoints] });
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
  ): void => {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, styleStack } = frame;
    const nodeIrPath = `${locatorPrefix}children[${index}].node`;
    const effectiveNode = resolveNodeStyle(child, styleStack);
    const labelDefault = resolveLabelDefault(styleStack);
    const warn = (code: CompileWarningCodeValue, message: string): void =>
      runtime.context.onWarn({ code, message, path: nodeIrPath });
    const resolvedNode = resolveNodeTextColor(effectiveNode, labelDefault, warn);
    const layout = layoutNode(
      {
        ...resolvedNode,
        animations: filterAnimations(resolvedNode.animations, {
          target: 'element',
          onWarn: runtime.context.onWarn,
          irPath: nodeIrPath,
        }),
      },
      {
        measureText: runtime.context.measureText,
        namespaceStack: runtime.state.namespaceStack,
        nodeDistance: runtime.context.nodeDistance,
        labelDistance: runtime.context.labelDistance,
        rootFontSize: runtime.context.rootFontSize,
        scopeChain,
        labelDefault,
        shapes: runtime.context.shapes,
        boundaries: runtime.context.boundaries,
        resolveBetweenGlobal: refPointOfTarget,
        irPath: nodeIrPath,
        warn,
        ...(frame.childConstraint?.kind === 'constrained'
          ? { maxAllocationWidth: frame.childConstraint.maxWidth }
          : {}),
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
    for (const prim of emitNodePrimitives(layout, runtime.context.round, runtime.context.paint.register)) {
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
    frame.allocationSink.push({ points: nodeBoundsPoints });
    layoutSink.push(layout);
  };

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用 */
  const registerCoordinateChild = (child: CoordinateChild, index: number, frame: TraversalFrame): void => {
    const { scopeChain, locatorPrefix, layoutSink } = frame;
    const coordinateIrPath = `${locatorPrefix}children[${index}].coordinate`;
    const localCenter = resolvePosition(child.position, {
      namespaceStack: runtime.state.namespaceStack,
      nodeDistance: runtime.context.nodeDistance,
      scopeChain,
      resolveBetweenGlobal: refPointOfTarget,
    });
    if (!localCenter) {
      throw new Error(
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
    frame.allocationSink.push({ points: [localCenter] });
    layoutSink.push(localCoordinateLayout);
  };

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
  const queuePathChild = (child: PathChild, index: number, frame: TraversalFrame): void => {
    const { scopeChain, primitiveSink, locatorPrefix, pathSink, styleStack } = frame;
    const pathIrPath = `${locatorPrefix}children[${index}].path`;
    const effectivePath = resolveEffectivePath(child, styleStack);
    const placeholder = makePathPlaceholder();
    primitiveSink.push(placeholder);
    const pending: PendingPathEmission = {
      path: {
        ...effectivePath,
        animations: filterAnimations(effectivePath.animations, {
          target: 'element',
          onWarn: runtime.context.onWarn,
          irPath: pathIrPath,
        }),
      },
      irPath: pathIrPath,
      scopeChain: [...scopeChain],
      boundsSink: frame.boundsSink,
      allocationSink: frame.allocationSink,
      placeholderSlot: { primitiveSink, placeholder },
      zIndex: child.zIndex,
    };
    runtime.state.placeholderBalance++;
    pathSink.push(pending);
  };

  /** 拒绝非 finite 的 Scope placement 中间结果 */
  const assertFinitePlacementPoint = (point: IRPosition, label: string): IRPosition => {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
      throw new Error(`${label} must resolve to a finite point`);
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
      throw new Error(
        `Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}: self target is not allowed`,
      );
    }
    const entry = runtime.state.namespaceStack.lookupEntry(target.id);
    if (entry === undefined || entry.state !== 'resolved') {
      throw new Error(
        `Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}: target must be defined and fully resolved before this Scope`,
      );
    }
    const world = refPointOfTarget(target, runtime.state.namespaceStack, frame.scopeChain);
    if (world === null) {
      throw new Error(`Cannot resolve scope placement target '${target.id}' at ${scopeIrPath}`);
    }
    const parentPoint = frame.scopeChain.length === 0 ? world : inverseTransformChain(world, frame.scopeChain);
    return assertFinitePlacementPoint(parentPoint, 'scope placement target');
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
        namespaceStack: runtime.state.namespaceStack,
        nodeDistance: runtime.context.nodeDistance,
        scopeChain: frame.scopeChain,
        resolveBetweenGlobal: refPointOfTarget,
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
      namespaceStack: runtime.state.namespaceStack,
      nodeDistance: runtime.context.nodeDistance,
      scopeChain: frame.scopeChain,
      resolveBetweenGlobal: refPointOfTarget,
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
    const { index, scopeTransforms, scopePrimitiveSink, frame } = input;
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
    if (child.clip !== undefined) group.clipRef = runtime.context.clip.register(child.clip);
    primitiveSink.push(group);
    recordPrimitiveZIndex(runtime.state.zIndexOf, group, child.zIndex);
  };

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出 */
  const compileScopeChild = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
    generatedOccurrence?: CompileOccurrenceLocator,
    compositeDepth = options.compositeDepth ?? 0,
  ): void => {
    const { locatorPrefix, styleStack } = frame;
    const placementTarget = resolveScopePlacementTarget(child, index, frame);
    const preliminaryTransforms = resolvePreliminaryScopeTransforms(child, index, frame);
    const preliminaryScopeChain =
      preliminaryTransforms === undefined ? frame.scopeChain : [...frame.scopeChain, ...preliminaryTransforms];
    const layoutPlaceholder = registerScopeLayoutPlaceholder(child, { index, frame });

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) runtime.state.namespaceStack.pushFrame();
    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<NodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    const scopePublications: Array<NodeLayout> = [];
    const scopeBounds: TraversalFrame['boundsSink'] = [];
    const scopeAllocations: TraversalFrame['allocationSink'] = [];
    const scopeObservations: TraversalFrame['observationSink'] = [];
    const scopeArtifacts: TraversalFrame['artifactSink'] = [];
    let scopeTransforms: Array<Transform> = [];
    try {
      compileChildren(
        child.children,
        {
          scopeChain: preliminaryScopeChain,
          primitiveSink: scopePrimitiveSink,
          locatorPrefix: `${locatorPrefix}children[${index}].scope.`,
          layoutSink: scopeLayouts,
          pathSink: scopePendingPaths,
          styleStack: [...styleStack, createStyleFrame(child)],
          publicationSink: scopePublications,
          boundsSink: scopeBounds,
          allocationSink: scopeAllocations,
          observationSink: scopeObservations,
          artifactSink: scopeArtifacts,
        },
        false,
        generatedOccurrence,
        compositeDepth,
      );

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
      for (const contribution of scopeBounds) {
        frame.boundsSink.push({
          points: contribution.points.map(point => applyTransformChain(point, scopeTransforms)),
          shadow: contribution.shadow,
        });
      }
      for (const contribution of scopeAllocations) {
        frame.allocationSink.push({
          points: contribution.points.map(point => applyTransformChain(point, scopeTransforms)),
        });
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
    } finally {
      if (didPushNamespaceFrame) runtime.state.namespaceStack.popFrame();
    }

    emitScopeGroup(child, { index, scopeTransforms, scopePrimitiveSink, frame });
  };

  const emptyBounds = (): Readonly<BoundsRect> => Object.freeze({ x: 0, y: 0, width: 0, height: 0 });

  const boundsRectOf = (result: TraversalResult): Readonly<BoundsRect> =>
    (() => {
      const allocation = result.allocations.reduce(
        (current, contribution) => collectLayoutBounds(current, contribution.points),
        undefined as TraversalResult['layoutBounds'],
      );
      return allocation === undefined ? emptyBounds() : Object.freeze(boundsToRect(allocation));
    })();

  /** 只在 definition schema parse 后恢复 erased layout callback */
  const callableLayoutDefinition = (
    definition: NonNullable<ReturnType<typeof runtime.context.composites.get>>,
  ): CallableLayoutCompositeDefinition => {
    if (definition.compile === undefined) {
      throw new Error('internal: callableLayoutDefinition received an expand composite');
    }
    return definition as unknown as CallableLayoutCompositeDefinition;
  };

  const validateConstraint = (
    constraint: ChildLayoutConstraint,
    compositeKey: string,
    occurrence: CompileOccurrenceLocator,
  ): void => {
    const kind: unknown = constraint.kind;
    if (kind !== 'intrinsic' && kind !== 'constrained') {
      throw new Error(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} called layoutChild with an invalid constraint kind '${String(kind)}'.`,
      );
    }
    const allowedKeys = constraint.kind === 'intrinsic' ? new Set(['kind']) : new Set(['kind', 'maxWidth']);
    const unsupportedKeys = Object.keys(constraint).filter(key => !allowedKeys.has(key));
    if (unsupportedKeys.length > 0) {
      throw new Error(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} called layoutChild with an invalid constraint; unsupported field(s): ${unsupportedKeys.join(', ')}.`,
      );
    }
    if (constraint.kind === 'intrinsic') return;
    if (!Number.isFinite(constraint.maxWidth) || constraint.maxWidth < 0) {
      throw new Error(
        `Composite '${compositeKey}' at ${formatCompileOccurrence(occurrence)} called layoutChild with an invalid constrained maxWidth; expected a finite non-negative number, got ${String(constraint.maxWidth)}.`,
      );
    }
  };

  const remapPaint = (paint: PaintValue | undefined, ids: ReadonlyMap<string, string>): PaintValue | undefined => {
    if (paint === undefined || typeof paint === 'string' || paint.kind === 'contextStroke') return paint;
    const id = ids.get(paint.id);
    if (id === undefined) throw new Error(`internal: replay paint resource '${paint.id}' was not imported`);
    return { kind: 'resourceRef', id };
  };

  const remapPrimitiveResources = (primitive: ScenePrimitive, ids: ReadonlyMap<string, string>): ScenePrimitive => {
    if (primitive.type === 'group') {
      const clipRef = primitive.clipRef === undefined ? undefined : ids.get(primitive.clipRef);
      if (primitive.clipRef !== undefined && clipRef === undefined) {
        throw new Error(`internal: replay clip resource '${primitive.clipRef}' was not imported`);
      }
      return {
        ...primitive,
        ...(clipRef !== undefined ? { clipRef } : {}),
        children: primitive.children.map(child => remapPrimitiveResources(child, ids)),
      };
    }
    if (primitive.type === 'text') return primitive;
    return {
      ...primitive,
      fill: remapPaint(primitive.fill, ids),
      stroke: remapPaint(primitive.stroke, ids),
    };
  };

  const replayOccurrence = (
    parent: CompileOccurrenceLocator,
    index: number,
    child: CompileOccurrenceLocator,
  ): CompileOccurrenceLocator => ({
    sourcePath: parent.sourcePath,
    expansionPath: [
      ...parent.expansionPath,
      { kind: 'replay', index },
      ...child.expansionPath.slice(parent.expansionPath.length),
    ],
  });

  const commitReplay = (
    token: CompositeReplay,
    transforms: ReadonlyArray<Transform> | undefined,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    outputIndex: number,
  ): void => {
    const transaction = runtime.context.session.replayTransactions.get(token);
    if (transaction === undefined) {
      throw new Error('Composite replay token does not belong to this compile or was forged.');
    }
    if (transaction.used) {
      throw new Error('Composite replay token may be placed at most once and was already replayed.');
    }
    transaction.used = true;

    const resourceIds = new Map<string, string>();
    for (const resource of transaction.resources) {
      if (resource.kind === 'paint') {
        const imported = runtime.context.paint.importResolved(resource);
        if (typeof imported !== 'object' || imported.kind !== 'resourceRef') {
          throw new Error('internal: imported paint did not produce a resourceRef');
        }
        resourceIds.set(resource.id, imported.id);
      } else {
        resourceIds.set(resource.id, runtime.context.clip.importResolved(resource.shape));
      }
    }
    const replayedPrimitives = transaction.primitives.map(primitive => remapPrimitiveResources(primitive, resourceIds));
    if (transforms === undefined || transforms.length === 0) {
      replayedPrimitives.forEach((primitive, index) => {
        frame.primitiveSink.push(primitive);
        recordPrimitiveZIndex(runtime.state.zIndexOf, primitive, transaction.primitiveZIndices[index]);
      });
    } else {
      replayedPrimitives.forEach((primitive, index) => {
        const group: GroupPrim = {
          type: 'group',
          transforms: [...transforms],
          children: [primitive],
        };
        frame.primitiveSink.push(group);
        recordPrimitiveZIndex(runtime.state.zIndexOf, group, transaction.primitiveZIndices[index]);
      });
    }

    for (const change of transaction.namespaceChanges) {
      if (transforms !== undefined && transforms.length > 0) {
        applyOwnTransformsToPublishedLayout(change.entry.layout, frame.scopeChain, transforms);
      }
      runtime.state.namespaceStack.commitForkChange(change);
      frame.publicationSink.push(change.entry.layout);
    }
    for (const layout of transaction.layouts) {
      frame.layoutSink.push(
        transforms === undefined || transforms.length === 0 ? layout : projectLayoutToGlobal(layout, transforms),
      );
    }
    for (const contribution of transaction.bounds) {
      frame.boundsSink.push({
        points:
          transforms === undefined || transforms.length === 0
            ? contribution.points
            : contribution.points.map(point => applyTransformChain(point, transforms)),
        shadow: contribution.shadow,
      });
    }
    for (const contribution of transaction.allocations) {
      frame.allocationSink.push({
        points:
          transforms === undefined || transforms.length === 0
            ? contribution.points
            : contribution.points.map(point => applyTransformChain(point, transforms)),
      });
    }
    for (const observation of transaction.observations) {
      if (transforms !== undefined && transforms.length > 0) {
        observation.scopeChain.splice(frame.scopeChain.length, 0, ...transforms);
      }
      frame.observationSink.push({
        ...observation,
        occurrence: replayOccurrence(occurrence, outputIndex, observation.occurrence),
      });
    }
    for (const warning of transaction.warnings) runtime.context.onWarn(warning);
    for (const artifact of transaction.artifacts) {
      frame.artifactSink.push(
        freezeCompileArtifact({
          ...artifact,
          occurrence: replayOccurrence(occurrence, outputIndex, artifact.occurrence),
        }),
      );
    }
  };

  const isReplayPlacement = (output: IRChild | CompositeReplayPlacement): output is CompositeReplayPlacement =>
    !('type' in output);

  const compileCompositeChild = (
    child: Extract<IRChild, { namespace: string }>,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
  ): void => {
    const key = `${child.namespace}.${child.type}`;
    const definition = runtime.context.composites.get(key);
    if (definition === undefined) {
      runtime.context.onWarn({
        code: CompileWarningCode.CompositeNotRegistered,
        message: `No composite registered for '${key}'; the node is skipped.`,
        path: occurrence.sourcePath,
      });
      return;
    }
    if (compositeDepth >= runtime.context.maxCompositeDepth) {
      throw new Error(
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
    if (definition.expand !== undefined) {
      const callable = definition as unknown as {
        expand: (node: unknown) => IRChild | Array<IRChild>;
      };
      const produced = callable.expand(parsed);
      const expanded = Array.isArray(produced) ? produced : [produced];
      for (const [outputIndex, output] of expanded.entries()) {
        compileChild(
          output,
          outputIndex,
          frame,
          {
            sourcePath: occurrence.sourcePath,
            expansionPath: [...occurrence.expansionPath, { kind: 'expand', index: outputIndex }],
          },
          compositeDepth + 1,
          true,
        );
      }
      return;
    }
    const callable = callableLayoutDefinition(definition);
    const result = callable.compile(parsed, {
      constraint: frame.childConstraint ?? { kind: 'intrinsic' },
      layoutChild: (nextChild, constraint) => {
        validateConstraint(constraint, key, occurrence);
        const warnings: Array<CompileWarning> = [];
        const captureWarning = (warning: CompileWarning): void => {
          if (
            warning.code === CompileWarningCode.UnresolvedNodeReference ||
            warning.code === CompileWarningCode.OffsetBaseUnresolved ||
            warning.code === CompileWarningCode.PolarOriginUnresolved ||
            warning.code === CompileWarningCode.AtTargetUnresolved
          ) {
            throw new Error(
              `Composite '${key}' at ${formatCompileOccurrence(occurrence)} cannot layout child with an unresolved reference: ${warning.message}`,
            );
          }
          warnings.push(warning);
        };
        const paint = createPaintRegistry(context.patterns, context.round);
        const clip = createClipRegistry(context.round, context.clips);
        const namespaceStack = runtime.state.namespaceStack.fork({
          onDuplicate: info => warnings.push(createDuplicateWarning(info)),
        });
        const sandboxContext: CompileContext = {
          ...context,
          onWarn: captureWarning,
          paint,
          clip,
        };
        const laid = compileChildrenToPrimitives([nextChild], sandboxContext, {
          namespaceStack,
          scopeChain: frame.scopeChain,
          styleStack: frame.styleStack,
          occurrence,
          compositeDepth: compositeDepth + 1,
          generated: true,
          constraint,
          session: runtime.context.session,
        });
        const token = Object.freeze({}) as CompositeReplay;
        const resources: Array<SceneResource> = [...paint.resources(), ...clip.resources()];
        runtime.context.session.replayTransactions.set(token, {
          used: false,
          primitives: laid.primitives,
          primitiveZIndices: laid.primitiveZIndices,
          layouts: laid.layouts,
          bounds: laid.bounds,
          allocations: laid.allocations,
          observations: laid.observations,
          namespaceChanges: namespaceStack.diffTopFrame(runtime.state.namespaceStack),
          resources,
          warnings,
          artifacts: laid.artifacts,
        });
        const allocationBounds = boundsRectOf(laid);
        return Object.freeze({
          allocationBounds,
          visualBounds: visualBoundsOfPrimitives(laid.primitives, resources),
          replay: token,
        });
      },
    });

    if (result.artifact !== undefined) {
      if (callable.artifactSchema === undefined) {
        throw new Error(`Composite '${key}' returned artifact without artifactSchema.`);
      }
      const parsedArtifact = callable.artifactSchema.parse(result.artifact);
      frame.artifactSink.push(
        freezeCompileArtifact({
          kind: 'composite',
          namespace: definition.namespace,
          type: definition.type,
          occurrence,
          value: cloneAndFreezeJson(parsedArtifact, `Composite '${key}' artifact`),
        }),
      );
    }
    for (const [outputIndex, output] of result.children.entries()) {
      if (isReplayPlacement(output)) {
        commitReplay(output.replay, output.transforms, frame, occurrence, outputIndex);
        continue;
      }
      const outputOccurrence: CompileOccurrenceLocator = {
        sourcePath: occurrence.sourcePath,
        expansionPath: [...occurrence.expansionPath, { kind: 'output', index: outputIndex }],
      };
      compileChild(output, outputIndex, frame, outputOccurrence, compositeDepth + 1, true);
    }
  };

  const compileChild = (
    child: IRChild,
    index: number,
    frame: TraversalFrame,
    occurrence: CompileOccurrenceLocator,
    compositeDepth: number,
    generated: boolean,
  ): void => {
    if ('namespace' in child) {
      compileCompositeChild(child, index, frame, occurrence, compositeDepth);
      return;
    }
    switch (child.type) {
      case 'node':
        emitNodeChild(child, index, frame, occurrence);
        break;
      case 'coordinate':
        registerCoordinateChild(child, index, frame);
        break;
      case 'scope':
        compileScopeChild(child, index, frame, generated ? occurrence : undefined, compositeDepth);
        break;
      default:
        queuePathChild(child, index, frame);
    }
  };

  const compileChildren = (
    children: ReadonlyArray<IRChild>,
    frame: TraversalFrame,
    useProvidedOccurrence = false,
    generatedScopeOccurrence?: CompileOccurrenceLocator,
    compositeDepth = options.compositeDepth ?? 0,
  ): void => {
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
      compileChild(
        child,
        i,
        frame,
        occurrence,
        compositeDepth,
        generatedScopeOccurrence !== undefined || (useProvidedOccurrence ? (options.generated ?? false) : false),
      );
    }
  };

  const rootPendingPaths: Array<PendingPathEmission> = [];
  const rootBounds: TraversalFrame['boundsSink'] = [];
  const rootAllocations: TraversalFrame['allocationSink'] = [];
  const rootObservations: TraversalFrame['observationSink'] = [];
  const rootLayouts: TraversalFrame['layoutSink'] = [];
  const rootArtifacts: TraversalFrame['artifactSink'] = [];
  compileChildren(
    rootChildren,
    {
      childConstraint: options.constraint ?? { kind: 'intrinsic' },
      scopeChain: options.scopeChain ?? [],
      primitiveSink: runtime.state.primitives,
      locatorPrefix: '',
      layoutSink: rootLayouts,
      pathSink: rootPendingPaths,
      styleStack: options.styleStack ?? [],
      publicationSink: [],
      boundsSink: rootBounds,
      allocationSink: rootAllocations,
      observationSink: rootObservations,
      artifactSink: rootArtifacts,
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
          ) as unknown as ReturnType<typeof computeCompiledNodeLayout>,
        }),
      );
    }
  }

  if (runtime.state.placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(runtime.state.primitives).join(', ')}`
        : '';
    throw new Error(
      `internal: ${runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
    );
  }

  const primitives = stableSortByZIndex(sealSink(runtime.state.primitives), runtime.state.zIndexOf);
  return {
    primitives,
    primitiveZIndices: primitives.map(primitive => runtime.state.zIndexOf.get(primitive)),
    layoutBounds: runtime.state.layoutBounds,
    layouts: rootLayouts,
    bounds: rootBounds,
    allocations: rootAllocations,
    observations: rootObservations,
    artifacts: orderCompileArtifacts(rootArtifacts),
  };
};
