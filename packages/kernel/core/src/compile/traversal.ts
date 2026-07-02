import type { BoundaryDefinition } from '../contract/boundary';
import type { PathKindCompileResult } from '../contract/path';
import type { GroupPrim, ScenePrimitive, Transform } from '../contract/scene';
import type { ShapeDefinition } from '../contract/shape';
import type { ProviderCollection } from '../providers/registry';
import type { IRChild, IRPathBase, IRPosition, IRTransform, ResolvedDropShadow } from '../schemas';
import type { CompileWarning } from './constant';
import type { CompileContext } from './context';
import type { DuplicateRegisterInfo } from './name-stack';
import type { NodeLayout } from './node';
import type { StyleFrame } from './style';

import { providerDefinitionOf } from '../providers/registry';
import { ScopeBoundingShape } from '../schemas';
import { WebAnchor } from '../shared';
import { rect as rectOps } from '../shared/geometry';
import { filterAnimations } from './animation';
import { CompileWarningCode } from './constant';
import { resolveShadow } from './effects';
import { NameStack } from './name-stack';
import { emitNodePrimitives, labelExtentPoints, layoutNode, outerRectOf } from './node';
import { emitPathPrimitive, refPointOfTarget } from './path';
import { emitRibbonPrimitive } from './path/ribbon';
import { resolvePosition } from './position';
import {
  applyTransformChain,
  collectScopeCornerPoints,
  computeScopeBoundingBox,
  lowerScopeTransforms,
  projectLayoutToGlobal,
  registerScopeAsLayout,
  registerScopeCircleLayout,
} from './scope';
import { createStyleFrame, resolveEffectivePath, resolveLabelDefault, resolveNodeStyle } from './style';
/**
 * 构造一个落在指定全局点的 0×0 rectangle NodeLayout
 * @description coordinate / scope.id 入场临时占位等"无形状只有位置"句柄共享此结构，
 *   让后续 path target / `at.of` / `offset.of` / `polar.origin` 引用时 boundaryPoint 命中中心。
 */
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
  rotateDeg: 0,
  margin: 0,
  textWidth: 0,
  textHeight: 0,
  align: 'middle',
  lineHeight: 0,
  fontSize: 0,
  shapes,
  boundaries,
});

/**
 * 把 coordinate 注册成 0×0 NodeLayout
 * @description 让后续 path target / `at.of` 引用时 boundaryPoint 命中中心，符合"占位无形状边界"语义
 */
const coordinateAsLayout = (
  id: string,
  center: IRPosition,
  shapes: ProviderCollection<ShapeDefinition>,
  boundaries: ProviderCollection<BoundaryDefinition>,
): NodeLayout => zeroSizeRectAt(id, center, shapes, boundaries);

/** shadow 是视觉效果，不改变锚点 / scope bbox；这里只把它的外溢纳入根自动 layout，避免根 viewBox 裁剪 */
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

/**
 * scope.id 入场时的临时占位 NodeLayout
 * @description scope 子树尚未处理时先放 0×0 占位（落在 scope 局部原点经累积 chain 投到全局的位置），
 *   让 scope 子树内任何 lookup 不返回 undefined（占位语义自洽）。
 *   子树 Pass 1 处理完毕后由 `registerScopeAsLayout` 算出真 bbox layout 覆盖此占位（NameStack.replaceLayout 不发 duplicate warn）
 */
const scopePlaceholderLayout = (
  id: string,
  chain: ReadonlyArray<Transform>,
  shapes: ProviderCollection<ShapeDefinition>,
  boundaries: ProviderCollection<BoundaryDefinition>,
): NodeLayout => {
  const globalOrigin: IRPosition = chain.length === 0 ? [0, 0] : applyTransformChain([0, 0], chain);
  return zeroSizeRectAt(id, globalOrigin, shapes, boundaries);
};

/**
 * Pass 1 递归扫描时记录的 pending path
 * @description path 必须等所有 node / coordinate Pass 1 注册完才能解析端点（避免前向引用），但 lookup 必须在它所在的 frame 栈上下文中进行——scope localNamespace 内 path 引用同 frame id 需在 frame pop 前完成。compile 处理顺序：每个层级先把子 node / coordinate / 子 scope 处理完（pending path 全部收集），然后**在该层 popFrame 前**统一 resolve 本层 pending path；这样 path 端点 inside-out lookup 能正确看到本层 frame。
 *   `scopeChain` 字段记录该 path 所在 scope 的累积 transform 链，让 path step 内 polar/at/offset
 *   `to` 在 scope 局部度量后由 path 端点 lookup 端走 `applyTransformChain` 投回全局。
 */
/**
 * 编译期占位 primitive：Pass 1 的 path 分支先在 sink 占一个位记住声明位置，Pass 2 解析出真 primitive 后按引用 splice 替换。绝不进入最终 Scene 输出（compileToScene 返回前由 placeholderBalance 无条件校验兜底）。
 */
type PathPlaceholder = { type: 'path-placeholder' };

/** compile 内部 sink 元素类型：真 Scene primitive 或编译期占位；构造 GroupPrim / 返回 Scene 前收窄回 ScenePrimitive */
type InternalScenePrimitive = ScenePrimitive | PathPlaceholder;

const makePathPlaceholder = (): PathPlaceholder => ({ type: 'path-placeholder' });

/** 把内部 sink 收窄回公开 ScenePrimitive[]：占位已全部回填（compileToScene 末端 placeholderBalance 无条件校验兜底） */
const sealSink = (sink: Array<InternalScenePrimitive>): Array<ScenePrimitive> => sink as Array<ScenePrimitive>;

/** dev 诊断：递归找出残留占位的 index 路径，供末端无条件校验报错时定位 */
const collectPlaceholderLocators = (
  prims: ReadonlyArray<InternalScenePrimitive>,
  prefix = 'primitives',
): Array<string> => {
  const locators: Array<string> = [];
  prims.forEach((prim, idx) => {
    if (prim.type === 'path-placeholder') {
      locators.push(`${prefix}[${idx}]`);
    } else if (prim.type === 'group') {
      locators.push(...collectPlaceholderLocators(prim.children, `${prefix}[${idx}].children`));
    }
  });
  return locators;
};

type PendingDrawing = {
  item: IRPathBase;
  irPath: string;
  scopeChain: ReadonlyArray<Transform>;
  slot?: { sink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
  zIndex?: number;
};

/** 据**实际解析失败**的那个 transform 的成因映射 warn code（由 lowerScopeTransforms 的 onUnresolved 回调给出） */
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

/** 把 DuplicateRegisterInfo 翻成 CompileWarning（含可读 message + 双 IR locator） */
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
  const primitives: Array<InternalScenePrimitive> = [];
  /** 已 push 但未回填的占位计数；compileToScene 返回前必须归零（无条件守 Scene 公开契约） */
  let placeholderBalance = 0;
  /**
   * primitive → 显式 zIndex 旁路记录（缺省视为 0）；sealSink 后按它稳定排序，不写进 primitive 本体（保 Scene 输出纯净）。
   * key 只会是 real ScenePrimitive——占位 PathPlaceholder 永不进此 Map（占位即将被回填替换）。
   */
  const zIndexOf = new Map<ScenePrimitive, number>();
  /**
   * 按 zIndex 升序原地稳定排序：同 zIndex 保持原 IR 顺序（decorate-sort 带原始下标）。全 0 键 = 恒等。
   * 仅在 sealSink（占位已回填、类型已收窄回 ScenePrimitive）之后调用。
   */
  const stableSortByZIndex = (arr: Array<ScenePrimitive>): Array<ScenePrimitive> => {
    const decorated = arr.map((prim, index) => ({ prim, index, z: zIndexOf.get(prim) ?? 0 }));
    decorated.sort((a, b) => a.z - b.z || a.index - b.index);
    for (let i = 0; i < arr.length; i++) arr[i] = decorated[i].prim;
    return arr;
  };
  const nameStack = new NameStack({
    onDuplicate: info => onWarn(formatDuplicateWarning(info)),
  });
  const allPoints: Array<IRPosition> = [];
  const emitStrokePath = (
    path: IRPathBase,
    irPath: string,
    scopeChain: ReadonlyArray<Transform>,
  ): PathKindCompileResult | null =>
    emitPathPrimitive(path, nameStack, round, measureText, {
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
    emitRibbonPrimitive(path, nameStack, round, measureText, {
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

  /**
   * 解析一批本层收集的 pending paths（lookup-only 阶段）
   * @description 两种落点：有 `slot`（scopeChain 为空）→ 原位 splice 回填该 path 在本层 sink 占的位（按引用定位免索引漂移），保住与同层 node 的 IR 声明序；无 `slot`（scopeChain 非空）→ hoist 到顶层 `primitives`，因端点已是全局坐标、进 transformed GroupPrim 会被 scope.transform 二次 apply。NameStack 切到 pass2 守门：path 解析中误调 register 抛 internal error；解析完切回 pass1 让上层 scope 子树继续 register 子节点。
   *   `item.scopeChain` 记录该 path 所属 scope 累积 transform 链——传给 emitPathPrimitive，
   *   让 step.to 内的 polar/at/offset 字面量按"当前 scope 局部度量 + 末端 apply chain"投影回全局。
   */
  const resolvePendingPaths = (pending: ReadonlyArray<PendingDrawing>): void => {
    if (pending.length === 0) return;
    nameStack.enterLookupPhase();
    try {
      for (const item of pending) {
        const result = emitPathKindPrimitive(item.item, item.irPath, item.scopeChain);
        if (item.slot) {
          // 原位回填：按引用定位占位再 splice 替换为真 primitive（result 为 null 时替换成 0 个 = 删占位）
          const idx = item.slot.sink.indexOf(item.slot.placeholder);
          if (idx === -1) {
            throw new Error('internal: path placeholder missing from its sink');
          }
          const real = result?.primitives ?? [];
          item.slot.sink.splice(idx, 1, ...real);
          if (item.zIndex !== undefined) {
            for (const prim of real) zIndexOf.set(prim, item.zIndex);
          }
          placeholderBalance--;
        } else if (result) {
          // hoist：transformed scope 内 path 留在顶层 primitives（已知限制）
          for (const prim of result.primitives) {
            primitives.push(prim);
            if (item.zIndex !== undefined) zIndexOf.set(prim, item.zIndex);
          }
        }
        if (result) {
          pushLayoutPoints(allPoints, result.points, resolveShadow(item.item.shadow));
        }
      }
    } finally {
      nameStack.exitLookupPhase();
    }
  };

  /**
   * 递归处理一组 IR child，把 node / coordinate 发到 sink、把本层 path 收集到 pathsAccumulator、scope 下沉为 GroupPrim
   * @description **不**在内部 resolve pathsAccumulator——调用方负责在合适时机（scope 入口：bbox replaceLayout 之后 / popFrame 之前；顶层：所有处理结束后）调用 resolvePendingPaths。这样 scope.id 的 placeholder→real bbox 替换在本层 path 端点 lookup 之前完成，避免 "scope 内 path 自引用本 scope.id 拿到 placeholder" 的 latent bug，同时保留"本层 path 在本层 frame 还在栈顶时 resolve"的 inside-out lookup 语义。
   * @param children 当前层级的 IR child 数组
   * @param chain 从根到当前层级累积的 Cartesian-only transform 链
   * @param sink 当前层级 Scene primitive 落点（顶层 = primitives，scope 内 = GroupPrim.children）
   * @param locatorPrefix IR locator 前缀（如 `''` 表示顶层、`children[2].scope.` 表示某 scope 内）
   * @param layoutsAccumulator 当前 scope 子树所有"实体"layout（node / coordinate / 嵌套 scope.id synthetic）累积——专给上层 scope.id bbox 计算用；顶层调用传一个共享数组（用得着就用，丢弃也不影响）
   * @param pathsAccumulator 当前层级收集的 pending paths——由调用方分配并在合适时机 resolve
   * @param styleStack 从根到当前层级累积的样式 frame 栈（scope 级联 graphic state + 四通道 every-X + resetStyle）；node / path 进入时按 inside-out per-field 解析 effective 样式
   */
  const processChildren = (
    children: ReadonlyArray<IRChild>,
    chain: ReadonlyArray<Transform>,
    sink: Array<InternalScenePrimitive>,
    locatorPrefix: string,
    layoutsAccumulator: Array<NodeLayout>,
    pathsAccumulator: Array<PendingDrawing>,
    styleStack: ReadonlyArray<StyleFrame>,
  ): void => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if ('namespace' in child) {
        // lowerComposites 已在 compileToScene 第一步展开 / 跳过所有 tier2 composite；走到这里说明管线被绕过
        throw new Error(
          `Unexpected composite node '${child.namespace}.${child.type}' reached compile; composites must be lowered via lowerComposites first.`,
        );
      }
      if (child.type === 'node') {
        const effectiveNode = resolveNodeStyle(child, styleStack);
        const layout = layoutNode(
          {
            ...effectiveNode,
            animations: filterAnimations(
              effectiveNode.animations,
              'element',
              onWarn,
              `${locatorPrefix}children[${i}].node`,
            ),
          },
          measureText,
          nameStack,
          nodeDistance,
          chain,
          resolveLabelDefault(styleStack),
          effectiveShapes,
          effectiveBoundaries,
          // between 端点世界坐标解析器（refPointOfTarget 处理 NodeTarget anchor / Cartesian / Polar / Offset / 嵌套 between）
          refPointOfTarget,
          // 公式渲染注入 + 预绑路径的 warn（文本里的 `$...$` 行内公式编译用）
          {
            lowerTex,
            warn: (code, message) => onWarn({ code, message, path: `${locatorPrefix}children[${i}].node` }),
          },
        );
        const globalLayout = chain.length === 0 ? layout : projectLayoutToGlobal(layout, chain);
        if (child.id) {
          nameStack.register(child.id, globalLayout, `${locatorPrefix}children[${i}].node.id`);
        }
        for (const prim of emitNodePrimitives(layout, round, paint.resolve)) {
          sink.push(prim);
          if (child.zIndex !== undefined) zIndexOf.set(prim, child.zIndex);
        }
        // bbox 用全局坐标系下的 4 角点累积——scope 内 node 也参与顶层 layout 计算；
        // node 含 outerSep（margin）时按外边界（rect + margin）入 bbox，与 viewBox 占位口径一致
        const outerRect = outerRectOf(globalLayout);
        const nodePoints: Array<IRPosition> = [
          rectOps.anchor(outerRect, WebAnchor.TopLeft),
          rectOps.anchor(outerRect, WebAnchor.TopRight),
          rectOps.anchor(outerRect, WebAnchor.BottomLeft),
          rectOps.anchor(outerRect, WebAnchor.BottomRight),
        ];
        pushLayoutPoints(allPoints, nodePoints, globalLayout.shadow);
        // label / pin 外接点也纳入 bbox——避免 label 超出 viewBox 被裁（与 step.label 进 bbox 一致）
        for (const p of labelExtentPoints(globalLayout)) allPoints.push(p);
        // 把 node layout 加进 layoutsAccumulator，供上层 scope.id bbox 计算
        layoutsAccumulator.push(globalLayout);
      } else if (child.type === 'coordinate') {
        const localCenter = resolvePosition(child.position, nameStack, nodeDistance, chain, refPointOfTarget);
        if (!localCenter) {
          // coordinate 与 node 同属"定义位置"的实体：位置不可解析时 fail-fast throw（下游引用会级联失败），
          // 不像 path / scope.transform 那类"引用方"走 warn + 降级。此处只 throw、不再额外 onWarn——
          // warn 后立即 throw 会让 onWarn 收集器记录一条永不产出 Scene 的死告警。
          throw new Error(
            `Cannot resolve position for coordinate ${child.id}; polar.origin or at.of may reference an undefined node`,
          );
        }
        const globalCenter = chain.length === 0 ? localCenter : applyTransformChain(localCenter, chain);
        const coordLayout = coordinateAsLayout(child.id, globalCenter, effectiveShapes, effectiveBoundaries);
        nameStack.register(child.id, coordLayout, `${locatorPrefix}children[${i}].coordinate.id`);
        // coordinate 0×0 layout 也算上层 scope.id bbox 输入（参与父 scope 子树 AABB 累积）
        layoutsAccumulator.push(coordLayout);
      } else if (child.type === 'scope') {
        const rawTransforms = child.transforms ?? [];
        let failedTransform: IRTransform | undefined;
        const loweredOwn = lowerScopeTransforms(rawTransforms, nameStack, nodeDistance, refPointOfTarget, t => {
          failedTransform = t;
        });
        if (loweredOwn === null) {
          onWarn({
            code: transformWarnCode(failedTransform),
            message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
            path: `${locatorPrefix}children[${i}].scope.transforms`,
          });
          // 失败时退化为不应用 transform，继续处理子树以收集尽可能多的产物
        }
        const ownTransforms: ReadonlyArray<Transform> = loweredOwn ?? [];
        const innerChain: ReadonlyArray<Transform> = [...chain, ...ownTransforms];
        // scope.id 必须先于子树处理在父 frame 注册（外部句柄，不受 localNamespace 影响）；
        // 此 register 是 register（走 duplicate 检测——与 node.id / coordinate.id / 兄弟 scope.id 冲突触发 warn）；
        // 后面子树完成后用 replaceLayout 覆盖 bbox 不再触发 warn（同一 scope.id 的 placeholder→real 接力不算冲突）
        const parentFrameDepth = nameStack.depth - 1;
        let placeholderLayout: NodeLayout | undefined;
        if (child.id) {
          placeholderLayout = scopePlaceholderLayout(child.id, innerChain, effectiveShapes, effectiveBoundaries);
          nameStack.register(child.id, placeholderLayout, `${locatorPrefix}children[${i}].scope.id`);
        }
        // 进入 scope 子 frame：localNamespace=true 时隔离子树命名空间
        const pushedFrame = child.localNamespace === true;
        if (pushedFrame) nameStack.pushFrame();
        const innerSink: Array<InternalScenePrimitive> = [];
        /** 本 scope 子树的 layouts 累积器；子树结束后用于算 bbox */
        const innerLayouts: Array<NodeLayout> = [];
        /** 本 scope 子树收集的 pending paths——在 bbox replaceLayout 后 / popFrame 前 resolve，
         *  让 scope 内 path 自引用本 scope.id 端点取真 bbox 而非 placeholder */
        const innerPaths: Array<PendingDrawing> = [];
        try {
          processChildren(
            child.children,
            innerChain,
            innerSink,
            `${locatorPrefix}children[${i}].scope.`,
            innerLayouts,
            innerPaths,
            [...styleStack, createStyleFrame(child)],
          );
          // 子树 register 完毕，先用真 bbox 覆盖 placeholder（仍在本 scope frame 上下文），再 resolve 本 scope 内 paths
          if (child.id) {
            const fallbackOrigin: IRPosition =
              innerChain.length === 0 ? [0, 0] : applyTransformChain([0, 0], innerChain);
            let bboxLayout: NodeLayout;
            // boundingShape 是受控枚举（'rectangle' | 'circle'）；非法值已被 schema 在 parse 边界拒绝，
            // 此处 'circle' 走最小外接圆，其余（含缺省 / 'rectangle'）走 AABB
            if (child.boundingShape === ScopeBoundingShape.Circle) {
              bboxLayout = registerScopeCircleLayout(
                child.id,
                collectScopeCornerPoints(innerLayouts),
                fallbackOrigin,
                effectiveShapes,
                effectiveBoundaries,
              );
            } else {
              bboxLayout = registerScopeAsLayout(
                child.id,
                computeScopeBoundingBox(innerLayouts),
                fallbackOrigin,
                effectiveShapes,
                effectiveBoundaries,
              );
            }
            // 用 replaceLayout 覆盖不触发 duplicate warn（placeholder → real bbox 是预期升级）
            nameStack.replaceLayout(child.id, bboxLayout, parentFrameDepth, placeholderLayout);
            // 嵌套 scope.id：把本层 synthetic bbox layout 合并进外层 layoutsAccumulator，
            // 让外层 scope.id 的 bbox 包含本层 bbox（外层 bbox 透传包内层 bbox 区域）
            layoutsAccumulator.push(bboxLayout);
          } else {
            // 无 scope.id：把内层 layouts 直接透传给上层 accumulator（外层 scope.id 仍能包含跨这层的 node）
            for (const innerLayout of innerLayouts) layoutsAccumulator.push(innerLayout);
          }
          // bbox 已就位，现在 resolve 本 scope 内 paths（lookup 能命中真 bbox 的 scope.id）
          resolvePendingPaths(innerPaths);
        } finally {
          if (pushedFrame) nameStack.popFrame();
        }
        const hasOwnTransforms = ownTransforms.length > 0;
        const isPrunable =
          innerSink.length === 0 && !hasOwnTransforms && child.id === undefined && child.clip === undefined;
        if (isPrunable) continue;
        const group: GroupPrim = {
          type: 'group',
          // sealSink 后对该层子序按 zIndex 稳定排序（占位已回填，类型已收窄）
          children: stableSortByZIndex(sealSink(innerSink)),
        };
        // 水合挂点：scope user id stamp 到其 GroupPrim（子图元不重复 stamp）
        if (child.id !== undefined) group.id = child.id;
        // meta provenance 与 id 同款：stamp 到 scope GroupPrim（不下传子元素；不进 prune 保留条件）
        if (child.meta !== undefined) group.meta = child.meta;
        // animations 与 meta 同款：stamp 到 scope GroupPrim（不下传子元素）；先过 viewBox⇔根 校验
        const scopeAnimations = filterAnimations(
          child.animations,
          'element',
          onWarn,
          `${locatorPrefix}children[${i}].scope`,
        );
        if (scopeAnimations !== undefined) group.animations = scopeAnimations;
        if (hasOwnTransforms) group.transforms = [...ownTransforms];
        // scope.clip → 去重派 clip 资源 id 挂 group.clipRef；裁剪区裁该 group 内全部子原语
        if (child.clip !== undefined) group.clipRef = clip.resolve(child.clip);
        sink.push(group);
        // scope 整体作一个 stacking 单位：把 group 在父层按 scope.zIndex 排序
        if (child.zIndex !== undefined) zIndexOf.set(group, child.zIndex);
      } else {
        // child.type === 'path' / 'ribbon'：累积到调用方提供的 pathsAccumulator，让调用方决定 resolve 时机
        // path 端点从 NameStack（全局坐标）查得，几何已是全局。chain 空时先在本层 sink 占一个位（Pass 2
        // 原位回填）保住与同层 node 的声明序；chain 非空时维持 hoist 到顶层 primitives，避免被 scope.transform 二次 apply。
        // `chain` 同时记录 path 所属 scope 累积 transform，让 step.to 内的 polar/at/offset 字面量
        // 按"当前 scope 局部度量 + 末端 apply chain"投影回全局
        const effectivePath = resolveEffectivePath(child, styleStack);
        const pending: PendingDrawing = {
          item: {
            ...effectivePath,
            animations: filterAnimations(
              effectivePath.animations,
              'element',
              onWarn,
              `${locatorPrefix}children[${i}].path`,
            ),
          },
          irPath: `${locatorPrefix}children[${i}].path`,
          scopeChain: chain,
          zIndex: child.zIndex,
        };
        if (chain.length === 0) {
          const placeholder = makePathPlaceholder();
          sink.push(placeholder);
          pending.slot = { sink, placeholder };
          placeholderBalance++;
        }
        pathsAccumulator.push(pending);
      }
    }
  };

  // 递归处理整棵 IR child 树；顶层 paths 在所有 register 完成后统一 resolve
  // 顶层 layouts 累积无人消费——传一个临时数组即可（顶层无 scope.id 包裹）
  const rootPaths: Array<PendingDrawing> = [];
  processChildren(rootChildren, [], primitives, '', [], rootPaths, []);
  resolvePendingPaths(rootPaths);

  // 无条件校验：占位绝不能泄漏到 Scene 输出（守 compileToScene 返回 ScenePrimitive[] 的公开契约）
  if (placeholderBalance !== 0) {
    const detail =
      typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
        ? ` at ${collectPlaceholderLocators(primitives).join(', ')}`
        : '';
    throw new Error(`internal: ${placeholderBalance} unresolved path placeholder(s) leaked into Scene output${detail}`);
  }

  return {
    primitives: stableSortByZIndex(sealSink(primitives)),
    allPoints,
  };
};
