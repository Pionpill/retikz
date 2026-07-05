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
import {
  createSyntheticRectangleLayout,
  emitNodePrimitives,
  labelExtentPoints,
  layoutNode,
  outerRectOf,
  registerScopeAsLayout,
  registerScopeCircleLayout,
  registerScopePlaceholderLayout,
} from '../node';
import { emitPathPrimitive, emitRibbonPrimitive, refPointOfTarget } from '../path';
import { resolvePosition } from '../position';
import { collectScopeCornerPoints, computeScopeBoundingBox, lowerScopeTransforms } from '../scope';
import { createStyleFrame, resolveEffectivePath, resolveLabelDefault, resolveNodeStyle, resolveShadow } from '../style';
import { applyTransformChain, projectLayoutToGlobal } from '../transform';
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
  path: IRPathBase;
  /** warning 与诊断使用的 IR locator。 */
  irPath: string;
  /** path 所在 scope 的累计 transform。 */
  scopeChain: ReadonlyArray<Transform>;
  /** 顶层原位回填用的占位槽；scope 内 path 走 hoist，不占位。 */
  placeholderSlot?: { primitiveSink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
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
  /** 顶层 primitive 输出容器，path 占位会在返回前回填。 */
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
  scopeChain: ReadonlyArray<Transform>;
  /** 当前层 primitive 输出容器。 */
  primitiveSink: Array<InternalScenePrimitive>;
  /** 当前层 IR locator 前缀。 */
  locatorPrefix: string;
  /** 向父 scope 汇报 bbox 输入 layout。 */
  layoutSink: Array<NodeLayout>;
  /** 当前层延迟 emit 的 path 任务。 */
  pathSink: Array<PendingPathEmission>;
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
  scopeTransforms: ReadonlyArray<Transform>;
  /** 子树使用的累计 scopeChain。 */
  childScopeChain: ReadonlyArray<Transform>;
};

/** scope.id layout 占位注册结果。 */
type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度。 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在。 */
  placeholderLayout?: NodeLayout;
};

type ScopeLayoutPlaceholderContext = {
  index: number;
  childScopeChain: ReadonlyArray<Transform>;
  frame: TraversalFrame;
};

type ResolveScopeLayoutContext = {
  childScopeChain: ReadonlyArray<Transform>;
  scopeLayouts: ReadonlyArray<NodeLayout>;
  layoutPlaceholder: ScopeLayoutPlaceholder;
  frame: TraversalFrame;
};

type EmitScopeGroupContext = {
  index: number;
  scopeTransforms: ReadonlyArray<Transform>;
  scopePrimitiveSink: Array<InternalScenePrimitive>;
  frame: TraversalFrame;
};

export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
): TraversalResult => {
  /** 编译运行时环境 */
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

  /** 按 path.kind 查找 path kind provider，并提供内置 stroke / ribbon emit 回调。 */
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
    const emitOptions = {
      onWarn: runtime.context.onWarn,
      irPath,
      scopeChain,
      resolvePaint: runtime.context.paint.resolve,
      resolvedArrows: runtime.context.arrows,
      effectivePathGenerators: runtime.context.pathGenerators,
      lowerTex: runtime.context.lowerTex,
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

  /** 在命名引用可查阶段 emit 延迟 path，并把结果回填到对应输出容器。 */
  const resolvePendingPathEmissions = (pendingPaths: ReadonlyArray<PendingPathEmission>): void => {
    if (pendingPaths.length === 0) return;
    runtime.state.namespaceStack.enterResolvingPhase();
    try {
      for (const pendingPath of pendingPaths) {
        const result = emitPathKindPrimitive(pendingPath.path, pendingPath.irPath, pendingPath.scopeChain);
        const primitives = result?.primitives ?? [];
        if (pendingPath.placeholderSlot !== undefined) {
          const idx = pendingPath.placeholderSlot.primitiveSink.indexOf(pendingPath.placeholderSlot.placeholder);
          if (idx === -1) {
            throw new Error('internal: path placeholder missing from its sink');
          }
          pendingPath.placeholderSlot.primitiveSink.splice(idx, 1, ...primitives);
          runtime.state.placeholderBalance--;
        } else {
          runtime.state.primitives.push(...primitives);
        }
        for (const prim of primitives) recordPrimitiveZIndex(runtime.state.zIndexOf, prim, pendingPath.zIndex);
        if (result !== null) {
          pushBoundsPoints(runtime.state.boundsPoints, result.boundsPoints, resolveShadow(pendingPath.path.shadow));
        }
      }
    } finally {
      runtime.state.namespaceStack.exitResolvingPhase();
    }
  };

  /** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入。 */
  const emitNodeChild = (child: NodeChild, index: number, frame: TraversalFrame): void => {
    const { scopeChain, primitiveSink, locatorPrefix, layoutSink, styleStack } = frame;
    const nodeIrPath = `${locatorPrefix}children[${index}].node`;
    const effectiveNode = resolveNodeStyle(child, styleStack);
    const layout = layoutNode(
      {
        ...effectiveNode,
        animations: filterAnimations(effectiveNode.animations, {
          target: 'element',
          onWarn: runtime.context.onWarn,
          irPath: nodeIrPath,
        }),
      },
      {
        measureText: runtime.context.measureText,
        namespaceStack: runtime.state.namespaceStack,
        nodeDistance: runtime.context.nodeDistance,
        scopeChain,
        labelDefault: resolveLabelDefault(styleStack),
        shapes: runtime.context.shapes,
        boundaries: runtime.context.boundaries,
        resolveBetweenGlobal: refPointOfTarget,
        texLowering: {
          lowerTex: runtime.context.lowerTex,
          warn: (code, message) => runtime.context.onWarn({ code, message, path: nodeIrPath }),
        },
      },
    );
    const globalLayout = scopeChain.length === 0 ? layout : projectLayoutToGlobal(layout, scopeChain);
    if (child.id) {
      runtime.state.namespaceStack.register(child.id, globalLayout, `${nodeIrPath}.id`);
    }
    for (const prim of emitNodePrimitives(layout, runtime.context.round, runtime.context.paint.resolve)) {
      primitiveSink.push(prim);
      recordPrimitiveZIndex(runtime.state.zIndexOf, prim, child.zIndex);
    }
    const outerRect = outerRectOf(globalLayout);
    const nodeBoundsPoints: Array<IRPosition> = [
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    ];
    pushBoundsPoints(runtime.state.boundsPoints, nodeBoundsPoints, globalLayout.shadow);
    for (const p of labelExtentPoints(globalLayout)) runtime.state.boundsPoints.push(p);
    layoutSink.push(globalLayout);
  };

  /** 解析 coordinate 位置并注册为零尺寸 layout，供后续命名引用使用。 */
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
    const coordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
      { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
    );
    runtime.state.namespaceStack.register(child.id, coordinateLayout, `${coordinateIrPath}.id`);
    layoutSink.push(coordinateLayout);
  };

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位。 */
  const queuePathChild = (child: PathChild, index: number, frame: TraversalFrame): void => {
    const { scopeChain, primitiveSink, locatorPrefix, pathSink, styleStack } = frame;
    const pathIrPath = `${locatorPrefix}children[${index}].path`;
    const effectivePath = resolveEffectivePath(child, styleStack);
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
      scopeChain,
      zIndex: child.zIndex,
    };
    if (scopeChain.length === 0) {
      const placeholder = makePathPlaceholder();
      primitiveSink.push(placeholder);
      pending.placeholderSlot = { primitiveSink, placeholder };
      runtime.state.placeholderBalance++;
    }
    pathSink.push(pending);
  };

  /** 解析 scope 自身 transforms，并生成子树继续使用的累积 scopeChain。 */
  const resolveScopeTransforms = (
    child: ScopeChild,
    index: number,
    frame: TraversalFrame,
  ): ScopeTransformResolution => {
    const { scopeChain, locatorPrefix } = frame;
    const scopeIrPath = `${locatorPrefix}children[${index}].scope`;
    const rawTransforms = child.transforms ?? [];
    let failedTransform: IRTransform | undefined;
    const loweredOwn = lowerScopeTransforms(rawTransforms, {
      namespaceStack: runtime.state.namespaceStack,
      nodeDistance: runtime.context.nodeDistance,
      resolveBetweenGlobal: refPointOfTarget,
      onUnresolved: t => {
        failedTransform = t;
      },
    });
    if (loweredOwn === null) {
      runtime.context.onWarn({
        code: transformWarnCode(failedTransform),
        message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
        path: `${scopeIrPath}.transforms`,
      });
    }
    const scopeTransforms: ReadonlyArray<Transform> = loweredOwn ?? [];
    return { scopeTransforms, childScopeChain: [...scopeChain, ...scopeTransforms] };
  };

  /** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换。 */
  const registerScopeLayoutPlaceholder = (
    child: ScopeChild,
    input: ScopeLayoutPlaceholderContext,
  ): ScopeLayoutPlaceholder => {
    const { index, childScopeChain, frame } = input;
    const { locatorPrefix } = frame;
    const scopeIrPath = `${locatorPrefix}children[${index}].scope`;
    const parentFrameDepth = runtime.state.namespaceStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = registerScopePlaceholderLayout(child.id, childScopeChain, {
      shapes: runtime.context.shapes,
      boundaries: runtime.context.boundaries,
    });
    runtime.state.namespaceStack.register(child.id, placeholderLayout, `${scopeIrPath}.id`);
    return { parentFrameDepth, placeholderLayout };
  };

  /** 根据子 layout 计算 scope 的最终命名 layout，并回填 scope.id 注册结果。 */
  const resolveScopeLayout = (
    child: ScopeChild,
    input: ResolveScopeLayoutContext,
  ): void => {
    const { childScopeChain, scopeLayouts, layoutPlaceholder, frame } = input;
    const { layoutSink } = frame;
    if (child.id === undefined) {
      for (const scopeLayout of scopeLayouts) layoutSink.push(scopeLayout);
      return;
    }

    const fallbackOrigin: IRPosition = childScopeChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], childScopeChain);
    const bboxLayout =
      child.boundingShape === ScopeBoundingShape.Circle
        ? registerScopeCircleLayout(
            { id: child.id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin },
            { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
          )
        : registerScopeAsLayout(
            { id: child.id, bbox: computeScopeBoundingBox(scopeLayouts), fallbackOrigin },
            { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
          );
    runtime.state.namespaceStack.replaceLayout(
      child.id,
      bboxLayout,
      layoutPlaceholder.parentFrameDepth,
      layoutPlaceholder.placeholderLayout,
    );
    layoutSink.push(bboxLayout);
  };

  /** 在需要可见输出时 emit scope group，并挂载 transform、clip 和动画。 */
  const emitScopeGroup = (
    child: ScopeChild,
    input: EmitScopeGroupContext,
  ): void => {
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
    if (child.clip !== undefined) group.clipRef = runtime.context.clip.resolve(child.clip);
    primitiveSink.push(group);
    recordPrimitiveZIndex(runtime.state.zIndexOf, group, child.zIndex);
  };

  /** 编排单个 scope 子树，处理命名空间、局部输出容器、延迟 path 和 scope group 输出。 */
  const processScopeChild = (child: ScopeChild, index: number, frame: TraversalFrame): void => {
    const { locatorPrefix, styleStack } = frame;
    const { scopeTransforms, childScopeChain } = resolveScopeTransforms(child, index, frame);
    const layoutPlaceholder = registerScopeLayoutPlaceholder(child, { index, childScopeChain, frame });

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) runtime.state.namespaceStack.pushFrame();
    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<NodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    try {
      processChildren(child.children, {
        scopeChain: childScopeChain,
        primitiveSink: scopePrimitiveSink,
        locatorPrefix: `${locatorPrefix}children[${index}].scope.`,
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        styleStack: [...styleStack, createStyleFrame(child)],
      });
      resolveScopeLayout(child, { childScopeChain, scopeLayouts, layoutPlaceholder, frame });
      resolvePendingPathEmissions(scopePendingPaths);
    } finally {
      if (didPushNamespaceFrame) runtime.state.namespaceStack.popFrame();
    }

    emitScopeGroup(child, { index, scopeTransforms, scopePrimitiveSink, frame });
  };

  const processChildren = (children: ReadonlyArray<IRChild>, frame: TraversalFrame): void => {
    for (const [i, child] of children.entries()) {
      if ('namespace' in child) {
        throw new Error(
          `Unexpected composite node '${child.namespace}.${child.type}' reached compile; composites must be lowered via lowerComposites first.`,
        );
      }
      switch (child.type) {
        case 'node':
          emitNodeChild(child, i, frame);
          break;
        case 'coordinate':
          registerCoordinateChild(child, i, frame);
          break;
        case 'scope':
          processScopeChild(child, i, frame);
          break;
        default:
          queuePathChild(child, i, frame);
      }
    }
  };

  const rootPendingPaths: Array<PendingPathEmission> = [];
  processChildren(rootChildren, {
    scopeChain: [],
    primitiveSink: runtime.state.primitives,
    locatorPrefix: '',
    layoutSink: [],
    pathSink: rootPendingPaths,
    styleStack: [],
  });
  resolvePendingPathEmissions(rootPendingPaths);

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
