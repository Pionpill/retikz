import { boundsCorners, boundsOf, expandBounds } from '@retikz/math';

import type {
  GroupPrim,
  PathKindCompileResult,
  ScenePrimitive,
  Transform,
} from '../../contract';
import type { IRChild, IRPathBase, IRPosition, IRTransform, ResolvedDropShadow } from '../../schemas';
import type { CompileWarning } from '../constant';
import type { DuplicateRegisterInfo } from '../namespace';
import type { NodeLayout } from '../node';
import type { StyleFrame } from '../style';
import type { CompileContext } from './context';
import type { InternalScenePrimitive, PathPlaceholder, PrimitiveZIndexTable } from './primitive';

import { providerDefinitionOf } from '../../providers/registry';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
import { filterAnimations } from '../animation';
import { CompileWarningCode } from '../constant';
import { NamespaceStack } from '../namespace';
import { emitNodePrimitives, labelExtentPoints, layoutNode, outerRectOf } from '../node';
import { emitPathPrimitive, refPointOfTarget } from '../path';
import { emitRibbonPrimitive } from '../path/ribbon';
import { resolvePosition } from '../position';
import {
  applyTransformChain,
  collectScopeCornerPoints,
  computeScopeBoundingBox,
  createSyntheticRectangleLayout,
  lowerScopeTransforms,
  projectLayoutToGlobal,
  registerScopeAsLayout,
  registerScopeCircleLayout,
  registerScopePlaceholderLayout,
} from '../scope';
import { createStyleFrame, resolveEffectivePath, resolveLabelDefault, resolveNodeStyle, resolveShadow } from '../style';
import {
  collectPlaceholderLocators,
  makePathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';

/** 返回点集受 shadow 影响后的外溢角点。 */
const shadowOverflowPoints = (
  boundsPoints: ReadonlyArray<IRPosition>,
  shadow: ResolvedDropShadow | undefined,
): Array<IRPosition> => {
  if (shadow === undefined || boundsPoints.length === 0) return [];

  const dx = shadow.offsetX;
  const dy = shadow.offsetY;
  const blur = shadow.blur ?? 0;
  const bounds = boundsOf(boundsPoints);
  if (bounds === undefined) return [];
  return boundsCorners(
    expandBounds(bounds, {
      left: blur + Math.max(0, -dx),
      right: blur + Math.max(0, dx),
      top: blur + Math.max(0, -dy),
      bottom: blur + Math.max(0, dy),
    }),
  );
};

/** 将几何点及其 shadow 外溢点加入自动 layout 候选集。 */
const pushBoundsPoints = (
  target: Array<IRPosition>,
  boundsPoints: ReadonlyArray<IRPosition>,
  shadow?: ResolvedDropShadow,
): void => {
  for (const p of boundsPoints) target.push(p);
  for (const p of shadowOverflowPoints(boundsPoints, shadow)) target.push(p);
};

/** 等待命名引用完成注册后再 emit 的 path 任务。 */
type PendingPathEmission = {
  /** 已合并样式和动画过滤后的 path IR。 */
  item: IRPathBase;
  /** warning 与诊断使用的 IR locator。 */
  irPath: string;
  /** path 所在 scope 的累计 transform。 */
  scopeChain: ReadonlyArray<Transform>;
  /** 顶层原位回填用的占位槽；scope 内 path 走 hoist，不占位。 */
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
  /** 编译期排序用 zIndex，不写入 Scene primitive。 */
  zIndex?: number;
};

/** 按 transform 失败来源选择 warning code。 */
const transformWarnCode = (failed: IRTransform | undefined): CompileWarning['code'] => {
  switch (failed?.kind) {
    case 'offset-translate':
      return CompileWarningCode.OffsetBaseUnresolved;
    case 'at-translate':
      return CompileWarningCode.AtTargetUnresolved;
    case 'polar-translate':
      return CompileWarningCode.PolarOriginUnresolved;
    default:
      return CompileWarningCode.UnresolvedNodeReference;
  }
};

/** 格式化重复 id warning。 */
const formatDuplicateWarning = (info: DuplicateRegisterInfo): CompileWarning => {
  const frameNote =
    info.frameDepth === 0
      ? 'frame depth: 0 (root namespace)'
      : `frame depth: ${info.frameDepth} (under <Scope localNamespace>)`;
  const firstLoc = info.firstIrPath ?? '(unknown earlier location)';
  const secondLoc = info.secondIrPath ?? '(unknown current location)';
  return {
    code: CompileWarningCode.DuplicateNodeId,
    message: `Duplicate id '${info.id}' registered in the same namespace frame (${frameNote}); first defined at ${firstLoc}, redefined at ${secondLoc}. The later definition overrides the earlier one (last-wins).`,
    path: secondLoc,
  };
};

/** child 遍历编译后的 primitive 与自动 layout 候选点。 */
export type TraversalResult = {
  /** 已完成排序和占位回填的 Scene primitive。 */
  primitives: Array<ScenePrimitive>;
  /** 自动 layout 使用的全局 bbox 候选点。 */
  boundsPoints: Array<IRPosition>;
};

/** 整棵 child 树遍历期间共享的可变状态。 */
type TraversalState = {
  /** 顶层 primitive sink，path 占位会在返回前回填。 */
  primitives: Array<InternalScenePrimitive>;
  /** 自动 layout 使用的全局 bbox 候选点。 */
  boundsPoints: Array<IRPosition>;
  /** id 注册与查找栈。 */
  namespaceStack: NamespaceStack;
  /** primitive 的编译期 zIndex 旁路表。 */
  zIndexOf: PrimitiveZIndexTable;
  /** 尚未回填的 path 占位数量。 */
  placeholderBalance: number;
};

/** child 遍历期间使用的 compile 依赖。 */
type TraversalContext = Pick<
  CompileContext,
  | 'measureText'
  | 'lowerTex'
  | 'onWarn'
  | 'round'
  | 'nodeDistance'
  | 'shapes'
  | 'boundaries'
  | 'arrows'
  | 'pathGenerators'
  | 'pathKinds'
  | 'ribbonWidthProfiles'
  | 'paint'
  | 'clip'
>;

/** child 遍历期间共享的运行时对象。 */
type TraversalRuntime = {
  /** 遍历可变状态。 */
  state: TraversalState;
  /** compile 只读依赖。 */
  context: TraversalContext;
};

/** 递归处理一层 child 时的上下文。 */
type TraversalFrame = {
  /** 当前 scope 累计 transform。 */
  chain: ReadonlyArray<Transform>;
  /** 当前层 primitive sink。 */
  sink: Array<InternalScenePrimitive>;
  /** 当前层 IR locator 前缀。 */
  locatorPrefix: string;
  /** 向父 scope 汇报 bbox 输入 layout。 */
  layoutsAccumulator: Array<NodeLayout>;
  /** 当前层延迟 emit 的 path 任务。 */
  pathsAccumulator: Array<PendingPathEmission>;
  /** 当前层样式继承栈。 */
  styleStack: ReadonlyArray<StyleFrame>;
};

type NodeChild = Extract<IRChild, { type: 'node' }>;
type CoordinateChild = Extract<IRChild, { type: 'coordinate' }>;
type ScopeChild = Extract<IRChild, { type: 'scope' }>;
type PathChild = Extract<IRChild, { type: 'path' | 'ribbon' }>;

/** scope transforms 解析结果。 */
type ScopeTransformResolution = {
  /** 当前 scope 自身的 Scene transforms。 */
  ownTransforms: ReadonlyArray<Transform>;
  /** 子树使用的累计 transform chain。 */
  innerChain: ReadonlyArray<Transform>;
};

/** scope.id 占位注册结果。 */
type ScopePlaceholderResolution = {
  /** scope.id 所在父 namespace frame 深度。 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在。 */
  placeholderLayout?: NodeLayout;
};

export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
): TraversalResult => {
  const runtime: TraversalRuntime = {
    context: {
      measureText: context.measureText,
      lowerTex: context.lowerTex,
      onWarn: context.onWarn,
      round: context.round,
      nodeDistance: context.nodeDistance,
      shapes: context.shapes,
      boundaries: context.boundaries,
      arrows: context.arrows,
      pathGenerators: context.pathGenerators,
      pathKinds: context.pathKinds,
      ribbonWidthProfiles: context.ribbonWidthProfiles,
      paint: context.paint,
      clip: context.clip,
    },
    state: {
      primitives: [],
      boundsPoints: [],
      namespaceStack: new NamespaceStack({
        onDuplicate: info => context.onWarn(formatDuplicateWarning(info)),
      }),
      zIndexOf: new WeakMap(),
      placeholderBalance: 0,
    },
  };

  const emitStrokePath = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null =>
    emitPathPrimitive(path, runtime.state.namespaceStack, runtime.context.round, runtime.context.measureText, {
      onWarn: runtime.context.onWarn,
      irPath,
      scopeChain,
      resolvePaint: runtime.context.paint.resolve,
      resolvedArrows: runtime.context.arrows,
      effectivePathGenerators: runtime.context.pathGenerators,
      lowerTex: runtime.context.lowerTex,
    });

  const emitRibbonPath = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null =>
    emitRibbonPrimitive(path, runtime.state.namespaceStack, runtime.context.round, runtime.context.measureText, {
      onWarn: runtime.context.onWarn,
      irPath,
      scopeChain,
      resolvePaint: runtime.context.paint.resolve,
      resolvedArrows: runtime.context.arrows,
      effectivePathGenerators: runtime.context.pathGenerators,
      lowerTex: runtime.context.lowerTex,
      ribbonWidthProfiles: runtime.context.ribbonWidthProfiles,
    });

  const emitPathKindPrimitive = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null => {
    const kind = path.kind ?? 'stroke';
    const definition = providerDefinitionOf(runtime.context.pathKinds, kind, { capability: 'path kind', optionName: 'pathKinds' });
    const optionsValue = definition.optionsSchema
      ? definition.optionsSchema.parse(path.kindOptions ?? {})
      : path.kindOptions ?? {};
    return definition.compile({
      path,
      options: optionsValue,
      emitStroke: nextPath => emitStrokePath(nextPath ?? path, irPath, scopeChain),
      emitRibbon: nextPath => emitRibbonPath(nextPath ?? path, irPath, scopeChain),
    });
  };

  const resolvePendingPathEmissions = (pending: ReadonlyArray<PendingPathEmission>): void => {
    if (pending.length === 0) return;
    runtime.state.namespaceStack.enterLookupPhase();
    try {
      for (const item of pending) {
        const result = emitPathKindPrimitive(item.item, item.irPath, item.scopeChain);
        if (item.slot) {
          const idx = item.slot.sink.indexOf(item.slot.placeholder);
          if (idx === -1) {
            throw new Error('internal: path placeholder missing from its sink');
          }
          const real = result?.primitives ?? [];
          item.slot.sink.splice(idx, 1, ...real);
          if (item.zIndex !== undefined) {
            for (const prim of real) recordPrimitiveZIndex(runtime.state.zIndexOf, prim, item.zIndex);
          }
          runtime.state.placeholderBalance--;
        } else if (result) {
          for (const prim of result.primitives) {
            runtime.state.primitives.push(prim);
            recordPrimitiveZIndex(runtime.state.zIndexOf, prim, item.zIndex);
          }
        }
        if (result) {
          pushBoundsPoints(runtime.state.boundsPoints, result.boundsPoints, resolveShadow(item.item.shadow));
        }
      }
    } finally {
      runtime.state.namespaceStack.exitLookupPhase();
    }
  };

  const emitNodeChild = (child: NodeChild, index: number, frame: TraversalFrame): void => {
    const { chain, sink, locatorPrefix, layoutsAccumulator, styleStack } = frame;
    const effectiveNode = resolveNodeStyle(child, styleStack);
    const layout = layoutNode(
      {
        ...effectiveNode,
        animations: filterAnimations(
          effectiveNode.animations,
          'element',
          runtime.context.onWarn,
          `${locatorPrefix}children[${index}].node`,
        ),
      },
      runtime.context.measureText,
      runtime.state.namespaceStack,
      runtime.context.nodeDistance,
      chain,
      resolveLabelDefault(styleStack),
      runtime.context.shapes,
      runtime.context.boundaries,
      refPointOfTarget,
      {
        lowerTex: runtime.context.lowerTex,
        warn: (code, message) => runtime.context.onWarn({ code, message, path: `${locatorPrefix}children[${index}].node` }),
      },
    );
    const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
    if (child.id) {
      runtime.state.namespaceStack.register(child.id, globalLayout, `${locatorPrefix}children[${index}].node.id`);
    }
    for (const prim of emitNodePrimitives(layout, runtime.context.round, runtime.context.paint.resolve)) {
      sink.push(prim);
      recordPrimitiveZIndex(runtime.state.zIndexOf, prim, child.zIndex);
    }
    const outerRect = outerRectOf(globalLayout);
    const nodePoints: Array<IRPosition> = [
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    ];
    pushBoundsPoints(runtime.state.boundsPoints, nodePoints, globalLayout.shadow);
    for (const p of labelExtentPoints(globalLayout)) runtime.state.boundsPoints.push(p);
    layoutsAccumulator.push(globalLayout);
  };

  const registerCoordinateChild = (child: CoordinateChild, index: number, frame: TraversalFrame): void => {
    const { chain, locatorPrefix, layoutsAccumulator } = frame;
    const localCenter = resolvePosition(child.position, runtime.state.namespaceStack, runtime.context.nodeDistance, chain, refPointOfTarget);
    if (!localCenter) {
      throw new Error(
        `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
      );
    }
    const globalCenter = chain.length === 0 ? localCenter : applyTransformChain(localCenter, chain);
    const coordLayout = createSyntheticRectangleLayout(child.id, globalCenter, 0, 0, runtime.context.shapes, runtime.context.boundaries);
    runtime.state.namespaceStack.register(child.id, coordLayout, `${locatorPrefix}children[${index}].coordinate.id`);
    layoutsAccumulator.push(coordLayout);
  };

  const queuePathChild = (child: PathChild, index: number, frame: TraversalFrame): void => {
    const { chain, sink, locatorPrefix, pathsAccumulator, styleStack } = frame;
    const effectivePath = resolveEffectivePath(child, styleStack);
    const pending: PendingPathEmission = {
      item: {
        ...effectivePath,
        animations: filterAnimations(
          effectivePath.animations,
          'element',
          runtime.context.onWarn,
          `${locatorPrefix}children[${index}].path`,
        ),
      },
      irPath: `${locatorPrefix}children[${index}].path`,
      scopeChain: chain,
      zIndex: child.zIndex,
    };
    if (chain.length === 0) {
      const placeholder = makePathPlaceholder();
      sink.push(placeholder);
      pending.slot = { sink, placeholder };
      runtime.state.placeholderBalance++;
    }
    pathsAccumulator.push(pending);
  };

  const resolveScopeTransforms = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
  ): ScopeTransformResolution => {
    const { chain, locatorPrefix } = frame;
    const rawTransforms = child.transforms ?? [];
    let failedTransform: IRTransform | undefined;
    const loweredOwn = lowerScopeTransforms(rawTransforms, runtime.state.namespaceStack, runtime.context.nodeDistance, refPointOfTarget, t => {
      failedTransform = t;
    });
    if (loweredOwn === null) {
      runtime.context.onWarn({
        code: transformWarnCode(failedTransform),
        message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
        path: `${locatorPrefix}children[${index}].scope.transforms`,
      });
    }
    const ownTransforms: ReadonlyArray<Transform> = loweredOwn ?? [];
    return { ownTransforms, innerChain: [...chain, ...ownTransforms] };
  };

  const registerScopePlaceholder = (
    child: ScopeChild,
    index: number,
    innerChain: ReadonlyArray<Transform>,
    frame: TraversalFrame,
  ): ScopePlaceholderResolution => {
    const { locatorPrefix } = frame;
    const parentFrameDepth = runtime.state.namespaceStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = registerScopePlaceholderLayout(child.id, innerChain, runtime.context.shapes, runtime.context.boundaries);
    runtime.state.namespaceStack.register(child.id, placeholderLayout, `${locatorPrefix}children[${index}].scope.id`);
    return { parentFrameDepth, placeholderLayout };
  };

  const resolveScopeBBoxLayout = (
    child: ScopeChild,
    innerChain: ReadonlyArray<Transform>,
    innerLayouts: ReadonlyArray<NodeLayout>,
    placeholder: ScopePlaceholderResolution,
    frame: TraversalFrame,
  ): void => {
    const { layoutsAccumulator } = frame;
    if (child.id === undefined) {
      for (const innerLayout of innerLayouts) layoutsAccumulator.push(innerLayout);
      return;
    }

    const fallbackOrigin: IRPosition = innerChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], innerChain);
    const bboxLayout =
      child.boundingShape === ScopeBoundingShape.Circle
        ? registerScopeCircleLayout(
            child.id,
            collectScopeCornerPoints(innerLayouts),
            fallbackOrigin,
            runtime.context.shapes,
            runtime.context.boundaries,
          )
        : registerScopeAsLayout(
            child.id,
            computeScopeBoundingBox(innerLayouts),
            fallbackOrigin,
            runtime.context.shapes,
            runtime.context.boundaries,
          );
    runtime.state.namespaceStack.replaceLayout(child.id, bboxLayout, placeholder.parentFrameDepth, placeholder.placeholderLayout);
    layoutsAccumulator.push(bboxLayout);
  };

  const emitScopeGroup = (
    child: ScopeChild,
    index: number,
    ownTransforms: ReadonlyArray<Transform>,
    innerSink: Array<InternalScenePrimitive>,
    frame: TraversalFrame,
  ): void => {
    const { sink, locatorPrefix } = frame;
    const hasOwnTransforms = ownTransforms.length > 0;
    const isPrunable = innerSink.length === 0 && !hasOwnTransforms && child.id === undefined && child.clip === undefined;
    if (isPrunable) return;

    const group: GroupPrim = {
      type: 'group',
      children: stableSortByZIndex(sealSink(innerSink), runtime.state.zIndexOf),
    };
    if (child.id !== undefined) group.id = child.id;
    if (child.meta !== undefined) group.meta = child.meta;
    const scopeAnimations = filterAnimations(
      child.animations,
      'element',
      runtime.context.onWarn,
      `${locatorPrefix}children[${index}].scope`,
    );
    if (scopeAnimations !== undefined) group.animations = scopeAnimations;
    if (hasOwnTransforms) group.transforms = [...ownTransforms];
    if (child.clip !== undefined) group.clipRef = runtime.context.clip.resolve(child.clip);
    sink.push(group);
    recordPrimitiveZIndex(runtime.state.zIndexOf, group, child.zIndex);
  };

  function processScopeChild(child: ScopeChild, index: number, frame: TraversalFrame): void {
    const { locatorPrefix, styleStack } = frame;
    const { ownTransforms, innerChain } = resolveScopeTransforms(child, index, frame);
    const placeholder = registerScopePlaceholder(child, index, innerChain, frame);

    const pushedFrame = child.localNamespace === true;
    if (pushedFrame) runtime.state.namespaceStack.pushFrame();
    const innerSink: Array<InternalScenePrimitive> = [];
    const innerLayouts: Array<NodeLayout> = [];
    const innerPaths: Array<PendingPathEmission> = [];
    try {
      processChildren(child.children, {
        chain: innerChain,
        sink: innerSink,
        locatorPrefix: `${locatorPrefix}children[${index}].scope.`,
        layoutsAccumulator: innerLayouts,
        pathsAccumulator: innerPaths,
        styleStack: [...styleStack, createStyleFrame(child)],
      });
      resolveScopeBBoxLayout(child, innerChain, innerLayouts, placeholder, frame);
      resolvePendingPathEmissions(innerPaths);
    } finally {
      if (pushedFrame) runtime.state.namespaceStack.popFrame();
    }

    emitScopeGroup(child, index, ownTransforms, innerSink, frame);
  }

  const processChildren = (children: ReadonlyArray<IRChild>, frame: TraversalFrame): void => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if ('namespace' in child) {
        throw new Error(
          `Unexpected composite node '${child.namespace}.${child.type}' reached compile; composites must be lowered via lowerComposites first.`,
        );
      }
      if (child.type === 'node') {
        emitNodeChild(child, i, frame);
      } else if (child.type === 'coordinate') {
        registerCoordinateChild(child, i, frame);
      } else if (child.type === 'scope') {
        processScopeChild(child, i, frame);
      } else {
        queuePathChild(child, i, frame);
      }
    }
  };

  const rootPaths: Array<PendingPathEmission> = [];
  processChildren(rootChildren, {
    chain: [],
    sink: runtime.state.primitives,
    locatorPrefix: '',
    layoutsAccumulator: [],
    pathsAccumulator: rootPaths,
    styleStack: [],
  });
  resolvePendingPathEmissions(rootPaths);

  if (runtime.state.placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(runtime.state.primitives).join(', ')}`
        : '';
    throw new Error(`internal: ${runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`);
  }

  return {
    primitives: stableSortByZIndex(sealSink(runtime.state.primitives), runtime.state.zIndexOf),
    boundsPoints: runtime.state.boundsPoints,
  };
};
