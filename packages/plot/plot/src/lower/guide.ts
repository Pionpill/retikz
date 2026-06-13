import type { IRGradientStop, IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import type { AxisGuide, LegendChannelValue, LegendOrientValue, LegendPositionValue } from '../ir';
import { AXIS_LABEL_GAP, AXIS_TICK_LENGTH, type Rect, estimateLabelWidth } from './layout';
import type { CustomFrame, DimensionRole, PolarFrame, TernaryVertices } from './project';
import { type ProvenanceContext, guideLayerId, guideLayerMeta } from './provenance';
import type { PositionScale, TickSet } from './scale';

/**
 * lowerGuide 上下文：cartesian 直线 guide 用 plotArea + 两维投影 + ticks；polar 经 `frame` 走弧 / 辐条几何
 * @description cartesian 沿用 alpha.2 形态（projectX/projectY/plotArea/xTicks/yTicks），产物逐字不变；
 *   polar 由 `frame`（ADR-01 的 PolarFrame）驱动：圆心 / 内外半径 / 起止角 + primary(angle)/secondary(radius) 投影。
 *   存在 `frame.type === polar2D` 即走极坐标分支，guide 与 mark 同帧严格对齐。
 */
export type GuideContext = {
  /** 缩进后的绘图区矩形（cartesian 轴线 / 网格框） */
  plotArea: Rect;
  /** x 维位置 scale（值 → 像素 x，含 band 中心；cartesian 用） */
  projectX: PositionScale;
  /** y 维位置 scale（值 → 像素 y；cartesian 用） */
  projectY: PositionScale;
  /** x 轴刻度集（axis 与同维 grid 复用；cartesian 用） */
  xTicks: TickSet;
  /** y 轴刻度集（cartesian 用） */
  yTicks: TickSet;
  /** label 字号（与 ADR-03 估算同源） */
  fontSize: number;
  /**
   * 直线轴向覆盖（仅 cartesian1D 给）：horizontal → 沿 x 轴线（用 projectX/xTicks），vertical → 沿 y 轴线（用 projectY/yTicks）。
   * @description cartesian1D 单维角色恒为 x，但轴可竖排；给此值时 lowerCartesianGuide 按它选屏幕方向，而非按 dimension。
   */
  axisOrientation?: 'horizontal' | 'vertical';
  /** polar 坐标帧（仅 polar2D / polar1D 时给）：存在即按维度角色走 angular / radial 几何 */
  frame?: PolarFrame;
  /** angular 维刻度集（polar；angle / x 维 axis 与同维 grid 复用） */
  angularTicks?: TickSet;
  /** radial 维刻度集（polar；radius / y 维） */
  radialTicks?: TickSet;
  /** 三角顶点（仅 ternary2D 给）：[Va, Vb, Vc]，存在即走三角轴几何 */
  ternaryVertices?: TernaryVertices;
  /** 三角轴共享刻度集（仅 ternary2D；values 为 0..1 占比） */
  ternaryTicks?: TickSet;
};

/** lowerGuide 返回：网格层（仅 grid:true 时非空，垫底）+ 轴层（总有，压顶） */
export type LoweredGuide = {
  /** 网格层 scope（grid:true 且有刻度时）；否则 null */
  gridLayer: IRScope | null;
  /** 轴层 scope（轴线 + 刻度线 + 可选标签）；空刻度时 null */
  axisLayer: IRScope | null;
};

/** 一段直线（首尾两点） */
type Segment = [readonly [number, number], readonly [number, number]];

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/** 把若干直线段拼成一条多子路径 Path（每段一对 move/line）；空段返回 null */
const segmentsToPath = (segments: Array<Segment>): IRPath | null => {
  if (segments.length === 0) return null;
  const steps: Array<IRStep> = segments.flatMap(([from, to]) => [
    { type: 'step', kind: 'move', to: [from[0], from[1]] },
    { type: 'step', kind: 'line', to: [to[0], to[1]] },
  ]);
  return { type: 'path', children: steps };
};

/** 某 dimension 是否为 primary 角色（cartesian x / polar angle）；否则 secondary（y / radius） */
const isPrimaryDimension = (dimension: string): boolean => dimension === 'x' || dimension === 'angle';

/**
 * 轴 / 网格 scope 的 id + meta props（provenance 开时合成 `<plotId>.` 前缀 id + layer 来源 meta）
 * @description provenance 关（context undefined）→ 沿用 alpha.2 行为：仅在用户给 guide.id 时绑裸 id、无 meta。
 *   开 → id 走 `<plotId>.<guideId|axis|grid.dim>`（plotId 缺则匿名）、meta 写 {source,layer,dimension}。
 */
const guideScopeProps = (
  guide: AxisGuide,
  layer: 'axis' | 'grid',
  context: ProvenanceContext | undefined,
): { id?: string; meta?: ReturnType<typeof guideLayerMeta> } => {
  if (!context) return layer === 'axis' && guide.id ? { id: guide.id } : {};
  // 用户句柄 guide.id 只挂轴层（一个 guide 一个外部句柄）；网格层走结构 id，避免轴 / 网格 id 撞名
  const guideId = layer === 'axis' ? guide.id : undefined;
  const id = guideLayerId(context.plotId, guideId, layer, guide.dimension);
  return { ...(id !== undefined ? { id } : {}), meta: guideLayerMeta(layer, guide.dimension) };
};

/** cartesian guide：直线轴 + 竖 / 横刻度 + grid 跨绘图区直线（alpha.2 几何，逐字保持） */
const lowerCartesianGuide = (guide: AxisGuide, ctx: GuideContext, context: ProvenanceContext | undefined): LoweredGuide => {
  const { plotArea, fontSize } = ctx;
  const left = plotArea.x;
  const right = plotArea.x + plotArea.width;
  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;
  const showLabels = guide.tickLabels !== false;

  // cartesian1D 给 axisOrientation 覆盖（单维角色恒 x，但轴可竖排）；cartesian2D 按 dimension 判
  const isX = ctx.axisOrientation !== undefined ? ctx.axisOrientation === 'horizontal' : guide.dimension === 'x';
  const ticks = isX ? ctx.xTicks : ctx.yTicks;
  const project = isX ? ctx.projectX : ctx.projectY;

  // ---- 轴层 ----
  const axisLine: Segment = isX ? [[left, bottom], [right, bottom]] : [[left, top], [left, bottom]];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const p = project.coordinate(value);
    return isX ? [[p, bottom], [p, bottom + AXIS_TICK_LENGTH]] : [[left, p], [left - AXIS_TICK_LENGTH, p]];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const p = project.coordinate(value);
        const text = ticks.labels[index];
        const position: [number, number] = isX
          ? [p, bottom + AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2]
          : [left - AXIS_TICK_LENGTH - AXIS_LABEL_GAP - estimateLabelWidth(text, fontSize) / 2, p];
        return { type: 'node', position, text };
      })
    : [];

  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: [linePath, ...labels],
      }
    : null;

  // ---- 网格层（grid:true 才出）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const gridSegments: Array<Segment> = ticks.values.map(value => {
      const p = project.coordinate(value);
      return isX ? [[p, top], [p, bottom]] : [[left, p], [right, p]];
    });
    const gridPath = segmentsToPath(gridSegments);
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 圆心 + 角(度) + 半径 → 屏幕点（0°=+x、90°=+y，屏幕 y 向下，与 frame.project 约定一致） */
const polarPoint = (center: readonly [number, number], angleDeg: number, radius: number): [number, number] => {
  const radians = angleDeg * DEG_TO_RAD;
  return [center[0] + radius * Math.cos(radians), center[1] + radius * Math.sin(radians)];
};

/** 一条弧 Path（move 到弧起点 + arc step 扫 startAngle→endAngle，圆心 = frame.center、给定半径）；轴线与同心环复用 */
const arcPath = (frame: PolarFrame, radius: number): IRPath => {
  const start = polarPoint(frame.center, frame.startAngle, radius);
  return {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [start[0], start[1]] },
      {
        type: 'step',
        kind: 'arc',
        startAngle: frame.startAngle,
        endAngle: frame.endAngle,
        radius,
        center: [frame.center[0], frame.center[1]],
      },
    ],
  };
};

/**
 * polar angular axis：外圆弧轴线 + 每角向刻度短径向刻度线 + 圆周外标签
 * @description 轴线 = arc step（半径 outerRadius）；刻度 = 圆周点向外 AXIS_TICK_LENGTH 短线；
 *   标签 = center + (outerRadius+gap)·(cosθ,sinθ) 处 Node text。grid:true → 每刻度一条圆心→外圆辐条。
 */
const lowerAngularAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame, context: ProvenanceContext | undefined): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.angularTicks ?? { values: [], labels: [] };
  const scale = frame.primary;
  const outer = frame.outerRadius;
  const showLabels = guide.tickLabels !== false;

  // ---- 轴层 ----
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const theta = scale.coordinate(value);
    return [polarPoint(frame.center, theta, outer), polarPoint(frame.center, theta, outer + AXIS_TICK_LENGTH)];
  });
  const tickPath = segmentsToPath(tickSegments);
  const axisChildren: Array<IRPath | IRNode> = [arcPath(frame, outer)];
  if (tickPath) axisChildren.push(tickPath);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const theta = scale.coordinate(value);
        const position = polarPoint(frame.center, theta, outer + AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2);
        return { type: 'node', position, text: ticks.labels[index] };
      })
    : [];

  const axisLayer: IRScope = {
    type: 'scope',
    ...guideScopeProps(guide, 'axis', context),
    pathDefault: { stroke: 'currentColor' },
    nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
    children: [...axisChildren, ...labels],
  };

  // ---- 网格层（grid:true → 每角向刻度一条圆心→外圆辐条）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const spokes: Array<Segment> = ticks.values.map(value => {
      const theta = scale.coordinate(value);
      return [polarPoint(frame.center, theta, frame.innerRadius), polarPoint(frame.center, theta, outer)];
    });
    const gridPath = segmentsToPath(spokes);
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/**
 * polar radial axis：沿 startAngle 辐条轴线 + 辐条上刻度 + 标签
 * @description 轴线 = center→外圆 直段（基准角 = startAngle）；刻度 = 辐条上每径向刻度短切向横线；
 *   标签 = 刻度点旁 Node text。grid:true → 每径向刻度一个同心圆环（arc step）。
 */
const lowerRadialAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame, context: ProvenanceContext | undefined): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.radialTicks ?? { values: [], labels: [] };
  const scale = frame.secondary;
  const baseAngle = frame.startAngle;
  const showLabels = guide.tickLabels !== false;
  // 辐条切向单位向量（垂直于辐条）；刻度短线与标签沿此方向朝一侧（-tangent）偏移，与 cartesian / angular 轴一致。
  // 不沿辐条方向画刻度——否则首尾刻度会沿辐条越出内 / 外圆端点（各多出半个刻度长）。
  const tangent: [number, number] = [-Math.sin(baseAngle * DEG_TO_RAD), Math.cos(baseAngle * DEG_TO_RAD)];

  // ---- 轴层 ----
  const axisLine: Segment = [
    polarPoint(frame.center, baseAngle, frame.innerRadius),
    polarPoint(frame.center, baseAngle, frame.outerRadius),
  ];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const radius = scale.coordinate(value);
    const point = polarPoint(frame.center, baseAngle, radius);
    return [point, [point[0] - tangent[0] * AXIS_TICK_LENGTH, point[1] - tangent[1] * AXIS_TICK_LENGTH]];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const radius = scale.coordinate(value);
        const point = polarPoint(frame.center, baseAngle, radius);
        const text = ticks.labels[index];
        // 标签在刻度外侧（与刻度同侧、沿 -tangent），偏移 = 刻度长 + gap + 半字高
        const offset = AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2;
        const position: [number, number] = [point[0] - tangent[0] * offset, point[1] - tangent[1] * offset];
        return { type: 'node', position, text };
      })
    : [];

  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: [linePath, ...labels],
      }
    : null;

  // ---- 网格层（grid:true → 每径向刻度一个同心圆环）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const rings: Array<IRPath> = ticks.values
      .map(value => scale.coordinate(value))
      .filter(radius => Number.isFinite(radius) && radius > 0)
      .map(radius => arcPath(frame, radius));
    if (rings.length > 0) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: rings,
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 两点线性插值（t∈[0,1]）：三角轴刻度 / 等值线几何 */
const lerp2 = (from: readonly [number, number], to: readonly [number, number], t: number): [number, number] => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
];

/**
 * 某 ternary 分量轴的三角角色：顶点 + 该分量 0 边的两端
 * @description a：顶点 Va、0 边 = Vb–Vc；b：顶点 Vb、0 边 = Va–Vc；c：顶点 Vc、0 边 = Va–Vb。
 *   刻度沿 baseP→apex 边（= 三角一条边）；等值线（iso）= lerp(baseP,apex,t)–lerp(baseQ,apex,t)，平行 0 边。
 */
const ternaryAxisRoles = (
  dimension: string,
  vertices: TernaryVertices,
): { apex: readonly [number, number]; baseP: readonly [number, number]; baseQ: readonly [number, number] } => {
  const [va, vb, vc] = vertices;
  if (dimension === 'a') return { apex: va, baseP: vc, baseQ: vb };
  if (dimension === 'b') return { apex: vb, baseP: va, baseQ: vc };
  return { apex: vc, baseP: vb, baseQ: va }; // 'c'
};

/**
 * ternary 三角轴：沿一条边的刻度轴（0→100%）+ 平行对边的等值网格线
 * @description 轴线 = baseP→apex 三角边（三条 a/b/c 轴合起来 = 完整三角外框）；刻度沿该边、标签外法向偏移；
 *   grid:true → 内部刻度处画平行 0 边的等值线（lerp(baseP,apex,t)–lerp(baseQ,apex,t)）。
 */
const lowerTernaryGuide = (guide: AxisGuide, ctx: GuideContext, vertices: TernaryVertices, context: ProvenanceContext | undefined): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.ternaryTicks ?? { values: [], labels: [] };
  const showLabels = guide.tickLabels !== false;
  const { apex, baseP, baseQ } = ternaryAxisRoles(guide.dimension, vertices);
  const [va, vb, vc] = vertices;
  const centroid: [number, number] = [(va[0] + vb[0] + vc[0]) / 3, (va[1] + vb[1] + vc[1]) / 3];

  // 外法向单位向量（远离重心）：刻度短线 / 标签朝外摆
  const outwardAt = (point: [number, number]): [number, number] => {
    const dx = point[0] - centroid[0];
    const dy = point[1] - centroid[1];
    const length = Math.hypot(dx, dy) || 1;
    return [dx / length, dy / length];
  };

  // ---- 轴层：baseP→apex 边 + 沿边刻度 + 外侧标签 ----
  const axisLine: Segment = [baseP, apex];
  const tickSegments: Array<Segment> = [];
  const labels: Array<IRNode> = [];
  ticks.values.forEach((value, index) => {
    const t = Number(value);
    const point = lerp2(baseP, apex, t);
    const out = outwardAt(point);
    tickSegments.push([point, [point[0] + out[0] * AXIS_TICK_LENGTH, point[1] + out[1] * AXIS_TICK_LENGTH]]);
    if (showLabels) {
      const offset = AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2;
      labels.push({ type: 'node', position: [point[0] + out[0] * offset, point[1] + out[1] * offset], text: ticks.labels[index] });
    }
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: [linePath, ...labels],
      }
    : null;

  // ---- 网格层（grid:true → 内部刻度处平行 0 边的等值线）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const isoSegments: Array<Segment> = [];
    for (const value of ticks.values) {
      const t = Number(value);
      if (t <= 0 || t >= 1) continue; // 0（0 边）/ 1（顶点）退化，不画
      isoSegments.push([lerp2(baseP, apex, t), lerp2(baseQ, apex, t)]);
    }
    const gridPath = segmentsToPath(isoSegments);
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 把一串屏幕点连成一条折线 Path（move + line steps）；点数 < 2 返回 null */
const polylinePath = (points: ReadonlyArray<readonly [number, number]>): IRPath | null => {
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: [points[0][0], points[0][1]] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: [point[0], point[1]] })),
  ];
  return { type: 'path', children: steps };
};

/** 自定义坐标系轴线密采样点数（沿投影曲线取样连成轴线） */
const CUSTOM_AXIS_SAMPLES = 40;

/**
 * 自定义坐标系的曲线轴（通用 path-aware 轴）：沿 projectRoles 投影密采样画轴线 + 在 scale 刻度处放刻度 / 标签
 * @description 取该维度的位置 scale 刻度、其余角色锚在各自 scale 首刻度（≈ domain 起点），按 frame.roles 序喂 projectRoles
 *   得轴线（任意曲线）与刻度点；刻度短线 / 标签沿局部切向的法线摆。frame 无 roleScales[dimension] → 不画（返回空）。
 *   通用性即「轴 = 参数路径」：直线 / 拱 / 圆 / 螺旋同一套画法。无网格（自定义网格几何因投影而异，留后续）。
 */
export const lowerCustomAxis = (frame: CustomFrame, guide: AxisGuide, fontSize: number, context: ProvenanceContext | undefined): LoweredGuide => {
  const scale = frame.roleScales?.[guide.dimension];
  if (!scale) return { gridLayer: null, axisLayer: null };
  const ticks = scale.ticks(guide.tickCount);
  const numericTicks = ticks.values.map((value, index) => ({ value: Number(value), label: ticks.labels[index] })).filter(tick => Number.isFinite(tick.value));
  if (numericTicks.length === 0) return { gridLayer: null, axisLayer: null };
  const showLabels = guide.tickLabels !== false;

  // 其它角色锚在各自 scale 首刻度（≈ domain 起点）；按 frame.roles 序拼 values 喂 projectRoles
  const anchorFor = (role: DimensionRole): unknown => {
    const roleScale = frame.roleScales?.[role];
    return roleScale ? roleScale.ticks().values[0] : 0;
  };
  const projectAt = (value: number): [number, number] | null => frame.projectRoles(frame.roles.map(role => (role === guide.dimension ? value : anchorFor(role))));

  const lo = numericTicks[0].value;
  const hi = numericTicks[numericTicks.length - 1].value;
  const span = hi - lo;

  // 轴线：在维度范围内密采样连折线（任意投影曲线）
  const linePoints: Array<[number, number]> = [];
  for (let i = 0; i <= CUSTOM_AXIS_SAMPLES; i += 1) {
    const point = projectAt(lo + (span * i) / CUSTOM_AXIS_SAMPLES);
    if (point) linePoints.push(point);
  }
  const axisLinePath = polylinePath(linePoints);

  // 刻度 + 标签：沿局部切向的法线摆。切向优先取工厂回传的解析 frameAlong（ADR-05），缺则邻近采样数值差分回落
  const epsilon = span === 0 ? 1 : span * 1e-3;
  const valuesAt = (value: number): Array<unknown> => frame.roles.map(role => (role === guide.dimension ? value : anchorFor(role)));
  // 该刻度点的 [屏幕点, 切向]：有 frameAlong 用解析切向，否则中心差分；非有限 → null
  const pointAndTangent = (value: number): [[number, number], [number, number]] | null => {
    if (frame.frameAlong) {
      const local = frame.frameAlong(guide.dimension, valuesAt(value));
      return local ? [local.origin, local.tangent] : null;
    }
    const point = projectAt(value);
    if (!point) return null;
    const before = projectAt(value - epsilon) ?? point;
    const after = projectAt(value + epsilon) ?? point;
    return [point, [after[0] - before[0], after[1] - before[1]]];
  };
  const tickSegments: Array<Segment> = [];
  const labels: Array<IRNode> = [];
  for (const tick of numericTicks) {
    const resolved = pointAndTangent(tick.value);
    if (!resolved) continue;
    const [point, tangent] = resolved;
    const length = Math.hypot(tangent[0], tangent[1]) || 1;
    const normal: [number, number] = [-tangent[1] / length, tangent[0] / length];
    tickSegments.push([point, [point[0] + normal[0] * AXIS_TICK_LENGTH, point[1] + normal[1] * AXIS_TICK_LENGTH]]);
    if (showLabels) {
      const offset = AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2;
      labels.push({ type: 'node', position: [point[0] + normal[0] * offset, point[1] + normal[1] * offset], text: tick.label });
    }
  }

  const lineChildren: Array<IRPath> = [];
  if (axisLinePath) lineChildren.push(axisLinePath);
  const tickPath = segmentsToPath(tickSegments);
  if (tickPath) lineChildren.push(tickPath);
  if (lineChildren.length === 0) return { gridLayer: null, axisLayer: null };

  const axisLayer: IRScope = {
    type: 'scope',
    ...guideScopeProps(guide, 'axis', context),
    pathDefault: { stroke: 'currentColor' },
    nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
    children: [...lineChildren, ...labels],
  };
  return { gridLayer: null, axisLayer };
};

/**
 * 把一个 axis guide 下沉成网格层 + 轴层（各自一层 core scope；样式上提到 scope）
 * @description 按坐标帧分支：ternary（ctx.ternaryVertices 存在）走三角轴；polar（ctx.frame 存在）按维度角色走 angular
 *   （外圆弧 + 圆周刻度 / 标签 + 角向辐条 grid）或 radial（辐条轴 + 同心环 grid）；否则走 cartesian 直线轴 / 网格。
 *   下沉目标统一是 core Node（标签）+ Path（直段 / arc step）。id → 轴层 scope.id（anchor 预留）。
 */
export const lowerGuide = (guide: AxisGuide, ctx: GuideContext, context?: ProvenanceContext): LoweredGuide => {
  if (ctx.ternaryVertices) {
    return lowerTernaryGuide(guide, ctx, ctx.ternaryVertices, context);
  }
  if (ctx.frame) {
    return isPrimaryDimension(guide.dimension)
      ? lowerAngularAxis(guide, ctx, ctx.frame, context)
      : lowerRadialAxis(guide, ctx, ctx.frame, context);
  }
  return lowerCartesianGuide(guide, ctx, context);
};

// ── legend（ADR-03）─────────────────────────────────────────────────────

/** legend swatch 边长（user units）；离散色块 / 形状框 / size 符号格的基准格尺寸 */
export const LEGEND_SWATCH_SIZE = 14;
/** legend swatch 到标签的水平间距（user units） */
export const LEGEND_LABEL_GAP = 6;
/** legend 条目间的行 / 列距（user units） */
export const LEGEND_ENTRY_GAP = 6;
/** legend 标题到首条目的间距（user units） */
export const LEGEND_TITLE_GAP = 6;
/** 连续色带 ramp 的长边长度（user units） */
export const LEGEND_RAMP_LENGTH = 100;
/** 连续色带 ramp 的短边宽度（user units） */
export const LEGEND_RAMP_THICKNESS = 12;

/**
 * 一个离散 legend 条目：swatch 视觉量 + 标签
 * @description color = 色块填充；shape = glyph 名（形状 swatch）；radius = size 梯度符号半径；opacity = 透明度块。
 *   一个条目按 channel 取其中一种视觉量；label 是已格式化的文本（formatter 在 expand 侧据 fieldType 选定）。
 */
export type LegendEntry = {
  /** 条目标签（类别串 / 代表值 / 区间） */
  label: string;
  /** 色块填充色（color / 分箱 swatch） */
  color?: string;
  /** glyph 形状名（shape swatch） */
  shape?: string;
  /** size 梯度符号半径（px） */
  radius?: number;
  /** 透明度（opacity 块；0..1） */
  opacity?: number;
};

/** 连续色带 ramp：渐变 stop（offset 0..1 + 色）+ 沿带刻度（offset 0..1 + 标签） */
export type LegendRamp = {
  /** 渐变 stop（喂 core linearGradient paint server） */
  stops: Array<IRGradientStop>;
  /** 沿带刻度标签（offset 0..1） */
  ticks: Array<{ offset: number; label: string }>;
};

/**
 * lowerLegend 入参：已解析的 legend 内容（形态 + 条目 / ramp + 摆放）
 * @description 形态选择（swatch / ramp）与颜色 / 代表值由 expand 据 descriptor + scale 求好后传入；
 *   本函数只管几何摆放与 core 节点产出（关注点分离：求值在 expand、绘制在 guide）。
 */
export type LegendInput = {
  /** 形态：swatch（离散 / 分箱 / size / opacity）或 ramp（连续色带） */
  form: 'swatch' | 'ramp';
  /** 绑定通道（决定 swatch 视觉量取色 / 形状 / 半径 / 透明度） */
  channel: LegendChannelValue;
  /** 标题（缺省 = 绑定字段名；undefined → 不画标题） */
  title?: string;
  /** 离散条目（form==='swatch'） */
  entries: Array<LegendEntry>;
  /** 连续色带（form==='ramp'） */
  ramp?: LegendRamp;
  /** 摆放位置（预留带所在边） */
  position: LegendPositionValue;
  /** 条目排布方向 */
  orient: LegendOrientValue;
  /** label 字号 */
  fontSize: number;
  /** 预留带矩形（plotArea 旁的 legend 带；条目从带左上角起摆） */
  band: Rect;
  /** legend scope id（稳定，'legend' 前缀；anchor / 识别用） */
  id?: string;
};

/**
 * 矩形 swatch / ramp 条 → core Node（shape rectangle）
 * @description core PathSchema 要求 children ≥ 2 step，单 rectangle step 的 Path 非法；矩形改用 Node
 *   （与 bar mark 同款：shape rectangle + minimumWidth/Height + fill），符合「一切可见物是 Node」。
 *   入参沿用左上角 + 宽高语义，内部换算成 Node 中心点（Node.position 是中心）。
 */
const rectNode = (x: number, y: number, width: number, height: number): IRNode => ({
  type: 'node',
  position: [x + width / 2, y + height / 2],
  shape: 'rectangle',
  minimumWidth: width,
  minimumHeight: height,
  padding: 0,
});

/**
 * 把已解析的 legend 内容下沉成一个 core scope（swatch / ramp + 标签）
 * @description swatch 形态：每条目一个矩形 swatch Node（shape rectangle，填 color / opacity；size 条目额外一个圆点 Node）+ 一个标签 Node，纵 / 横堆叠；
 *   ramp 形态：一个矩形 Node 填 core linearGradient paint server（连续真渐变）+ 沿带刻度标签 Node。
 *   条目几何在传入 band 内从左上角起摆，受无文字度量约束（plot-design §13.1）：超 band 溢出可接受、不做测量自适应。
 *   下沉目标统一是 core Node（标签 / swatch / ramp 矩形 / size 圆点），纯 JSON。
 */
export const lowerLegend = (input: LegendInput): IRScope => {
  const { fontSize, band, orient } = input;
  const children: Array<IRNode> = [];
  // 标题占一行（顶部），条目区从标题下方起
  let cursorY = band.y;
  if (input.title !== undefined) {
    children.push({ type: 'node', position: [band.x + estimateLabelWidth(input.title, fontSize) / 2, cursorY + fontSize / 2], text: input.title });
    cursorY += fontSize + LEGEND_TITLE_GAP;
  }

  if (input.form === 'ramp' && input.ramp) {
    // 连续色带：一个矩形 Node 填 linearGradient（vertical → 自上而下、horizontal → 自左而右）
    const vertical = orient === 'vertical';
    const rampLength = LEGEND_RAMP_LENGTH;
    const rampThickness = LEGEND_RAMP_THICKNESS;
    const rampX = band.x;
    const rampY = cursorY;
    const ramp = vertical ? rectNode(rampX, rampY, rampThickness, rampLength) : rectNode(rampX, rampY, rampLength, rampThickness);
    // 垂直色带：offset 0 在顶（小值上 / 大值下，与轴一致需翻转）；这里 0 在带起点，stops 直接用
    const angle = vertical ? 90 : 0;
    ramp.fill = { kind: 'linearGradient', stops: input.ramp.stops, angle };
    children.push(ramp);
    // 沿带刻度标签
    for (const tick of input.ramp.ticks) {
      const position: [number, number] = vertical
        ? [rampX + rampThickness + LEGEND_LABEL_GAP + estimateLabelWidth(tick.label, fontSize) / 2, rampY + tick.offset * rampLength]
        : [rampX + tick.offset * rampLength, rampY + rampThickness + LEGEND_LABEL_GAP + fontSize / 2];
      children.push({ type: 'node', position, text: tick.label });
    }
  } else {
    // 离散 swatch：逐条目堆叠（vertical 自上而下、horizontal 自左而右）
    const vertical = orient === 'vertical';
    let cursorX = band.x;
    let rowY = cursorY;
    for (const entry of input.entries) {
      if (entry.shape !== undefined) {
        // shape 图例：swatch 本身就是编码的 glyph（circle / rectangle / diamond…），不画矩形框
        children.push({ type: 'node', position: [cursorX + LEGEND_SWATCH_SIZE / 2, rowY + LEGEND_SWATCH_SIZE / 2], shape: entry.shape, minimumSize: LEGEND_SWATCH_SIZE, fill: entry.color ?? 'currentColor' });
      } else {
        // color / 分箱 / opacity / size：矩形色块（size 再叠圆点）
        const swatch = rectNode(cursorX, rowY, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE);
        if (entry.color !== undefined) swatch.fill = entry.color;
        if (entry.opacity !== undefined) {
          swatch.fill = 'currentColor';
          swatch.fillOpacity = entry.opacity;
        }
        children.push(swatch);
        // size 梯度符号：在格内画一个代表半径的圆点 Node（覆盖 swatch 框，给出比例感）
        if (entry.radius !== undefined) {
          children.push({ type: 'node', position: [cursorX + LEGEND_SWATCH_SIZE / 2, rowY + LEGEND_SWATCH_SIZE / 2], shape: 'circle', minimumSize: entry.radius * Math.SQRT2, fill: 'currentColor' });
        }
      }
      // 标签：swatch 右侧
      const labelX = cursorX + LEGEND_SWATCH_SIZE + LEGEND_LABEL_GAP + estimateLabelWidth(entry.label, fontSize) / 2;
      const labelY = rowY + LEGEND_SWATCH_SIZE / 2;
      children.push({ type: 'node', position: [labelX, labelY], text: entry.label });
      if (vertical) {
        rowY += LEGEND_SWATCH_SIZE + LEGEND_ENTRY_GAP;
      } else {
        cursorX = labelX + estimateLabelWidth(entry.label, fontSize) / 2 + LEGEND_ENTRY_GAP;
      }
    }
  }

  return {
    type: 'scope',
    ...(input.id !== undefined ? { id: input.id } : {}),
    // 标签字号 + 默认无描边（swatch / ramp / glyph / 标签都不要描边边框）；不写 nodeDefault.shape（每个 swatch / glyph Node 自带 shape，避免整层被当成 mark 层）。
    // 用 strokeWidth: 0 而非 stroke: 'none'——后者是 axis 层的判别特征，会让 legend 层被误判为 axis。
    nodeDefault: { font: { size: fontSize }, padding: 0, strokeWidth: 0 },
    children,
  };
};
