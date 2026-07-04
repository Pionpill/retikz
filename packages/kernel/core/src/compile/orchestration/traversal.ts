import type {
  BoundaryDefinition,
  GroupPrim,
  PathKindCompileResult,
  ScenePrimitive,
  ShapeDefinition,
  Transform,
} from '../../contract';
import type { ProviderCollection } from '../../providers/registry';
import type { IRChild, IRPathBase, IRPosition, IRTransform, ResolvedDropShadow } from '../../schemas';
import type { CompileWarning } from '../constant';
import type { DuplicateRegisterInfo } from '../name-stack';
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
import { NameStack } from '../name-stack';
import { boxInsets, emitNodePrimitives, labelExtentPoints, layoutNode, outerRectOf } from '../node';
import { emitPathPrimitive, refPointOfTarget } from '../path';
import { emitRibbonPrimitive } from '../path/ribbon';
import { resolvePosition } from '../position';
import {
  applyTransformChain,
  collectScopeCornerPoints,
  computeScopeBoundingBox,
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

/** 构造落在指定全局点的 0×0 rectangle layout。 */
const zeroSizeRectAt = (
  id: string,
  [cx, cy]: IRPosition,
  shapes: ProviderCollection<ShapeDefinition>,
  boundaries: ProviderCollection<BoundaryDefinition>,
): NodeLayout => ({
  id,
  shapeName: 'rectangle',
  shapeDef: providerDefinitionOf(shapes, 'rectangle', { capability: 'shape', optionName: 'shapes' }),
  rect: { x: cx, y: cy, width: 0, height: 0, rotate: 0 },
  contentCenter: [cx, cy],
  rotateDeg: 0,
  margin: boxInsets(0),
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes,
  boundaries,
});

/** 把 coordinate 表示为 0×0 layout。 */
const coordinateAsLayout = (
  id: string,
  center: IRPosition,
  shapes: ProviderCollection<ShapeDefinition>,
  boundaries: ProviderCollection<BoundaryDefinition>,
): NodeLayout => zeroSizeRectAt(id, center, shapes, boundaries);

/** shadow 只影响根 viewBox 裁剪，不参与锚点和 scope bbox。 */
const shadowOverflowPoints = (
  points: ReadonlyArray<IRPosition>,
  shadow: ResolvedDropShadow | undefined,
): Array<IRPosition> => {
  if (shadow === undefined || points.length === 0) return [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const dx = shadow.offsetX;
  const dy = shadow.offsetY;
  const blur = shadow.blur ?? 0;
  const left = blur + Math.max(0, -dx);
  const right = blur + Math.max(0, dx);
  const top = blur + Math.max(0, -dy);
  const bottom = blur + Math.max(0, dy);
  return [
    [minX - left, minY - top],
    [maxX + right, minY - top],
    [minX - left, maxY + bottom],
    [maxX + right, maxY + bottom],
  ];
};

const pushLayoutPoints = (
  target: Array<IRPosition>,
  points: ReadonlyArray<IRPosition>,
  shadow?: ResolvedDropShadow,
): void => {
  for (const p of points) target.push(p);
  for (const p of shadowOverflowPoints(points, shadow)) target.push(p);
};

type PendingPathEmission = {
  item: IRPathBase;
  irPath: string;
  scopeChain: ReadonlyArray<Transform>;
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
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

export type TraversalResult = {
  primitives: Array<ScenePrimitive>;
  allPoints: Array<IRPosition>;
};

type TraversalState = {
  primitives: Array<InternalScenePrimitive>;
  allPoints: Array<IRPosition>;
  nameStack: NameStack;
  zIndexOf: PrimitiveZIndexTable;
  placeholderBalance: number;
};

type TraversalFrame = {
  chain: ReadonlyArray<Transform>;
  sink: Array<InternalScenePrimitive>;
  locatorPrefix: string;
  layoutsAccumulator: Array<NodeLayout>;
  pathsAccumulator: Array<PendingPathEmission>;
  styleStack: ReadonlyArray<StyleFrame>;
};

type NodeChild = Extract<IRChild, { type: 'node' }>;
type CoordinateChild = Extract<IRChild, { type: 'coordinate' }>;
type ScopeChild = Extract<IRChild, { type: 'scope' }>;
type PathChild = Extract<IRChild, { type: 'path' | 'ribbon' }>;
type ScopeTransformResolution = {
  ownTransforms: ReadonlyArray<Transform>;
  innerChain: ReadonlyArray<Transform>;
};
type ScopePlaceholderResolution = {
  parentFrameDepth: number;
  placeholderLayout?: NodeLayout;
};

export const compileChildrenToPrimitives = (
  rootChildren: ReadonlyArray<IRChild>,
  context: CompileContext,
): TraversalResult => {
  const {
    measureText,
    round,
    nodeDistance,
    onWarn,
    shapes: effectiveShapes,
    boundaries: effectiveBoundaries,
    pathGenerators: effectivePathGenerators,
    pathKinds: effectivePathKinds,
    ribbonWidthProfiles: effectiveRibbonWidthProfiles,
    arrows: resolvedArrows,
    paint,
    clip,
    lowerTex,
  } = context;

  const state: TraversalState = {
    primitives: [],
    allPoints: [],
    nameStack: new NameStack({
      onDuplicate: info => onWarn(formatDuplicateWarning(info)),
    }),
    zIndexOf: new WeakMap(),
    placeholderBalance: 0,
  };
  const emitStrokePath = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null =>
    emitPathPrimitive(path, state.nameStack, round, measureText, {
      onWarn,
      irPath,
      scopeChain,
      resolvePaint: paint.resolve,
      resolvedArrows,
      effectivePathGenerators,
      lowerTex,
    });

  const emitRibbonPath = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null =>
    emitRibbonPrimitive(path, state.nameStack, round, measureText, {
      onWarn,
      irPath,
      scopeChain,
      resolvePaint: paint.resolve,
      resolvedArrows,
      effectivePathGenerators,
      lowerTex,
      ribbonWidthProfiles: effectiveRibbonWidthProfiles,
    });

  const emitPathKindPrimitive = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null => {
    const kind = path.kind ?? 'stroke';
    const definition = providerDefinitionOf(effectivePathKinds, kind, { capability: 'path kind', optionName: 'pathKinds' });
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
    state.nameStack.enterLookupPhase();
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
            for (const prim of real) recordPrimitiveZIndex(state.zIndexOf, prim, item.zIndex);
          }
          state.placeholderBalance--;
        } else if (result) {
          for (const prim of result.primitives) {
            state.primitives.push(prim);
            recordPrimitiveZIndex(state.zIndexOf, prim, item.zIndex);
          }
        }
        if (result) {
          pushLayoutPoints(state.allPoints, result.points, resolveShadow(item.item.shadow));
        }
      }
    } finally {
      state.nameStack.exitLookupPhase();
    }
  };

  const emitNodeChild = (child: NodeChild, index: number, frame: TraversalFrame): void => {
    const { chain, sink, locatorPrefix, layoutsAccumulator, styleStack } = frame;
    const effectiveNode = resolveNodeStyle(child, styleStack);
    const layout = layoutNode(
      {
        ...effectiveNode,
        animations: filterAnimations(effectiveNode.animations, 'element', onWarn, `${locatorPrefix}children[${index}].node`),
      },
      measureText,
      state.nameStack,
      nodeDistance,
      chain,
      resolveLabelDefault(styleStack),
      effectiveShapes,
      effectiveBoundaries,
      refPointOfTarget,
      {
        lowerTex,
        warn: (code, message) => onWarn({ code, message, path: `${locatorPrefix}children[${index}].node` }),
      },
    );
    const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
    if (child.id) {
      state.nameStack.register(child.id, globalLayout, `${locatorPrefix}children[${index}].node.id`);
    }
    for (const prim of emitNodePrimitives(layout, round, paint.resolve)) {
      sink.push(prim);
      recordPrimitiveZIndex(state.zIndexOf, prim, child.zIndex);
    }
    const outerRect = outerRectOf(globalLayout);
    const nodePoints: Array<IRPosition> = [
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    ];
    pushLayoutPoints(state.allPoints, nodePoints, globalLayout.shadow);
    for (const p of labelExtentPoints(globalLayout)) state.allPoints.push(p);
    layoutsAccumulator.push(globalLayout);
  };

  const registerCoordinateChild = (child: CoordinateChild, index: number, frame: TraversalFrame): void => {
    const { chain, locatorPrefix, layoutsAccumulator } = frame;
    const localCenter = resolvePosition(child.position, state.nameStack, nodeDistance, chain, refPointOfTarget);
    if (!localCenter) {
      throw new Error(
        `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
      );
    }
    const globalCenter = chain.length === 0 ? localCenter : applyTransformChain(localCenter, chain);
    const coordLayout = coordinateAsLayout(child.id, globalCenter, effectiveShapes, effectiveBoundaries);
    state.nameStack.register(child.id, coordLayout, `${locatorPrefix}children[${index}].coordinate.id`);
    layoutsAccumulator.push(coordLayout);
  };

  const queuePathChild = (child: PathChild, index: number, frame: TraversalFrame): void => {
    const { chain, sink, locatorPrefix, pathsAccumulator, styleStack } = frame;
    const effectivePath = resolveEffectivePath(child, styleStack);
    const pending: PendingPathEmission = {
      item: {
        ...effectivePath,
        animations: filterAnimations(effectivePath.animations, 'element', onWarn, `${locatorPrefix}children[${index}].path`),
      },
      irPath: `${locatorPrefix}children[${index}].path`,
      scopeChain: chain,
      zIndex: child.zIndex,
    };
    if (chain.length === 0) {
      const placeholder = makePathPlaceholder();
      sink.push(placeholder);
      pending.slot = { sink, placeholder };
      state.placeholderBalance++;
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
    const loweredOwn = lowerScopeTransforms(rawTransforms, state.nameStack, nodeDistance, refPointOfTarget, t => {
      failedTransform = t;
    });
    if (loweredOwn === null) {
      onWarn({
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
    const parentFrameDepth = state.nameStack.depth - 1;
    if (child.id === undefined) {
      return { parentFrameDepth };
    }

    const placeholderLayout = registerScopePlaceholderLayout(child.id, innerChain, effectiveShapes, effectiveBoundaries);
    state.nameStack.register(child.id, placeholderLayout, `${locatorPrefix}children[${index}].scope.id`);
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
            effectiveShapes,
            effectiveBoundaries,
          )
        : registerScopeAsLayout(
            child.id,
            computeScopeBoundingBox(innerLayouts),
            fallbackOrigin,
            effectiveShapes,
            effectiveBoundaries,
          );
    state.nameStack.replaceLayout(child.id, bboxLayout, placeholder.parentFrameDepth, placeholder.placeholderLayout);
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
      children: stableSortByZIndex(sealSink(innerSink), state.zIndexOf),
    };
    if (child.id !== undefined) group.id = child.id;
    if (child.meta !== undefined) group.meta = child.meta;
    const scopeAnimations = filterAnimations(child.animations, 'element', onWarn, `${locatorPrefix}children[${index}].scope`);
    if (scopeAnimations !== undefined) group.animations = scopeAnimations;
    if (hasOwnTransforms) group.transforms = [...ownTransforms];
    if (child.clip !== undefined) group.clipRef = clip.resolve(child.clip);
    sink.push(group);
    recordPrimitiveZIndex(state.zIndexOf, group, child.zIndex);
  };

  function processScopeChild(child: ScopeChild, index: number, frame: TraversalFrame): void {
    const { locatorPrefix, styleStack } = frame;
    const { ownTransforms, innerChain } = resolveScopeTransforms(child, index, frame);
    const placeholder = registerScopePlaceholder(child, index, innerChain, frame);

    const pushedFrame = child.localNamespace === true;
    if (pushedFrame) state.nameStack.pushFrame();
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
      if (pushedFrame) state.nameStack.popFrame();
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
    sink: state.primitives,
    locatorPrefix: '',
    layoutsAccumulator: [],
    pathsAccumulator: rootPaths,
    styleStack: [],
  });
  resolvePendingPathEmissions(rootPaths);

  if (state.placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(state.primitives).join(', ')}`
        : '';
    throw new Error(`internal: ${state.placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`);
  }

  return {
    primitives: stableSortByZIndex(sealSink(state.primitives), state.zIndexOf),
    allPoints: state.allPoints,
  };
};
