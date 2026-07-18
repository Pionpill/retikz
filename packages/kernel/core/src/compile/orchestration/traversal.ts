import { boundsOf, mergeBounds } from '@retikz/math';

import type { GroupPrim, PathKindCompileResult, Transform } from '../../contract';
import type { IRChild, IRPathBase, IRPosition, IRTransform } from '../../schemas';
import type { NodeLayout } from '../node';
import type { CompileContext } from './context';
import type { InternalScenePrimitive } from './primitive';
import type {
  CoordinateChild,
  EmitScopeGroupContext,
  NodeChild,
  PathChild,
  PendingPathEmission,
  RegisterResolvedScopeLayoutContext,
  ScopeChild,
  ScopeLayoutPlaceholder,
  ScopeLayoutPlaceholderContext,
  ScopeTransformResolution,
  TraversalFrame,
  TraversalResult,
  TraversalRuntime,
} from './types';

import { providerDefinitionOf } from '../../providers/registry';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
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
import { emitPathPrimitive, emitRibbonPrimitive, refPointOfTarget } from '../path';
import { resolvePosition } from '../position';
import { parseProviderPayload } from '../provider-payload';
import { collectScopeCornerPoints, computeScopeBoundingBox, lowerScopeTransforms } from '../scope';
import { createStyleFrame, resolveEffectivePath, resolveLabelDefault, resolveNodeStyle, resolveShadow } from '../style';
import { applyTransformChain, projectLayoutToGlobal } from '../transform';
import { filterAnimations } from './animation';
import { collectLayoutBounds } from './bounds';
import { createDuplicateWarning, transformWarnCode } from './diagnostics';
import {
  collectPlaceholderLocators,
  makePathPlaceholder,
  recordPrimitiveZIndex,
  sealSink,
  stableSortByZIndex,
} from './primitive';

/** 编译 child 树，完成 namespace 注册、延迟 path 回填、zIndex 排序和自动 layout bbox 收集 */
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
      onNodeLayout: context.onNodeLayout,
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
    },
    state: {
      primitives: [],
      layoutBounds: undefined,
      namespaceStack: new NamespaceStack({
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
          runtime.state.layoutBounds = collectLayoutBounds(
            runtime.state.layoutBounds,
            result.boundsPoints,
            resolveShadow(pendingPath.path.shadow),
          );
        }
      }
    } finally {
      runtime.state.namespaceStack.exitResolvingPhase();
    }
  };

  /** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
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
        labelDistance: runtime.context.labelDistance,
        rootFontSize: runtime.context.rootFontSize,
        scopeChain,
        labelDefault: resolveLabelDefault(styleStack),
        shapes: runtime.context.shapes,
        boundaries: runtime.context.boundaries,
        resolveBetweenGlobal: refPointOfTarget,
        irPath: nodeIrPath,
        texLowering: {
          lowerTex: runtime.context.lowerTex,
          warn: (code, message) => runtime.context.onWarn({ code, message, path: nodeIrPath }),
        },
      },
    );
    runtime.context.onNodeLayout?.(computeCompiledNodeLayout(layout, scopeChain));
    const globalLayout = scopeChain.length === 0 ? layout : projectLayoutToGlobal(layout, scopeChain);
    if (child.id) {
      runtime.state.namespaceStack.register(child.id, globalLayout, `${nodeIrPath}.id`);
    }
    for (const prim of emitNodePrimitives(layout, runtime.context.round, runtime.context.paint.register)) {
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
    runtime.state.layoutBounds = collectLayoutBounds(runtime.state.layoutBounds, nodeBoundsPoints, globalLayout.shadow);
    runtime.state.layoutBounds = mergeBounds(runtime.state.layoutBounds, boundsOf(labelExtentPoints(globalLayout)));
    layoutSink.push(globalLayout);
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
    const coordinateLayout = createSyntheticRectangleLayout(
      { id: child.id, rect: { x: globalCenter[0], y: globalCenter[1], width: 0, height: 0, rotate: 0 } },
      { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
    );
    runtime.state.namespaceStack.register(child.id, coordinateLayout, `${coordinateIrPath}.id`);
    layoutSink.push(coordinateLayout);
  };

  /** 合并 path 样式并加入延迟 emit 队列，保留顶层绘制顺序占位 */
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

  /** 解析 scope 自身 transforms，并生成子树继续使用的累积 scopeChain */
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

  /** 有 scope.id 时先注册占位 layout，等子树 bbox 算出后再替换 */
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

    const placeholderLayout = createScopePlaceholderLayout(child.id, childScopeChain, {
      shapes: runtime.context.shapes,
      boundaries: runtime.context.boundaries,
    });
    runtime.state.namespaceStack.register(child.id, placeholderLayout, `${scopeIrPath}.id`);
    return { parentFrameDepth, placeholderLayout };
  };

  /** 根据子 layout 计算 scope 的最终命名 layout，并回填 scope.id 注册结果 */
  const registerResolvedScopeLayout = (child: ScopeChild, input: RegisterResolvedScopeLayoutContext): void => {
    const { childScopeChain, scopeLayouts, layoutPlaceholder, frame } = input;
    const { layoutSink } = frame;
    if (child.id === undefined) {
      for (const scopeLayout of scopeLayouts) layoutSink.push(scopeLayout);
      return;
    }

    const fallbackOrigin: IRPosition =
      childScopeChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], childScopeChain);
    const bboxLayout =
      child.boundingShape === ScopeBoundingShape.Circle
        ? createScopeCircleLayout(
            { id: child.id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin },
            { shapes: runtime.context.shapes, boundaries: runtime.context.boundaries },
          )
        : createScopeRectangleLayout(
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
  const compileScopeChild = (child: ScopeChild, index: number, frame: TraversalFrame): void => {
    const { locatorPrefix, styleStack } = frame;
    const { scopeTransforms, childScopeChain } = resolveScopeTransforms(child, index, frame);
    const layoutPlaceholder = registerScopeLayoutPlaceholder(child, { index, childScopeChain, frame });

    const didPushNamespaceFrame = child.localNamespace === true;
    if (didPushNamespaceFrame) runtime.state.namespaceStack.pushFrame();
    const scopePrimitiveSink: Array<InternalScenePrimitive> = [];
    const scopeLayouts: Array<NodeLayout> = [];
    const scopePendingPaths: Array<PendingPathEmission> = [];
    try {
      compileChildren(child.children, {
        scopeChain: childScopeChain,
        primitiveSink: scopePrimitiveSink,
        locatorPrefix: `${locatorPrefix}children[${index}].scope.`,
        layoutSink: scopeLayouts,
        pathSink: scopePendingPaths,
        styleStack: [...styleStack, createStyleFrame(child)],
      });
      registerResolvedScopeLayout(child, { childScopeChain, scopeLayouts, layoutPlaceholder, frame });
      flushPendingPathEmissions(scopePendingPaths);
    } finally {
      if (didPushNamespaceFrame) runtime.state.namespaceStack.popFrame();
    }

    emitScopeGroup(child, { index, scopeTransforms, scopePrimitiveSink, frame });
  };

  const compileChildren = (children: ReadonlyArray<IRChild>, frame: TraversalFrame): void => {
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
          compileScopeChild(child, i, frame);
          break;
        default:
          queuePathChild(child, i, frame);
      }
    }
  };

  const rootPendingPaths: Array<PendingPathEmission> = [];
  compileChildren(rootChildren, {
    scopeChain: [],
    primitiveSink: runtime.state.primitives,
    locatorPrefix: '',
    layoutSink: [],
    pathSink: rootPendingPaths,
    styleStack: [],
  });
  flushPendingPathEmissions(rootPendingPaths);

  if (runtime.state.placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(runtime.state.primitives).join(', ')}`
        : '';
    throw new Error(
      `internal: ${runtime.state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`,
    );
  }

  return {
    primitives: stableSortByZIndex(sealSink(runtime.state.primitives), runtime.state.zIndexOf),
    layoutBounds: runtime.state.layoutBounds,
  };
};
