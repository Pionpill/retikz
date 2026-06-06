import type { IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import type { AxisGuide } from '../ir';
import { AXIS_LABEL_GAP, AXIS_TICK_LENGTH, type Rect, estimateLabelWidth } from './layout';
import type { PolarFrame } from './project';
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
  /** polar 坐标帧（仅 polar2D 时给）：存在即按维度角色走 angular / radial 几何 */
  frame?: PolarFrame;
  /** angular 维刻度集（polar；angle / x 维 axis 与同维 grid 复用） */
  angularTicks?: TickSet;
  /** radial 维刻度集（polar；radius / y 维） */
  radialTicks?: TickSet;
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

/** cartesian guide：直线轴 + 竖 / 横刻度 + grid 跨绘图区直线（alpha.2 几何，逐字保持） */
const lowerCartesianGuide = (guide: AxisGuide, ctx: GuideContext): LoweredGuide => {
  const { plotArea, fontSize } = ctx;
  const left = plotArea.x;
  const right = plotArea.x + plotArea.width;
  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;
  const showLabels = guide.tickLabels !== false;

  const isX = guide.dimension === 'x';
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
        ...(guide.id ? { id: guide.id } : {}),
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
const lowerAngularAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame): LoweredGuide => {
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
    ...(guide.id ? { id: guide.id } : {}),
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
const lowerRadialAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.radialTicks ?? { values: [], labels: [] };
  const scale = frame.secondary;
  const baseAngle = frame.startAngle;
  const showLabels = guide.tickLabels !== false;
  // 辐条径向单位向量（沿辐条方向），刻度短线沿此方向画（短径向 dash，保证整条轴 + 刻度共线）
  const radial: [number, number] = [Math.cos(baseAngle * DEG_TO_RAD), Math.sin(baseAngle * DEG_TO_RAD)];

  // ---- 轴层 ----
  const axisLine: Segment = [
    polarPoint(frame.center, baseAngle, frame.innerRadius),
    polarPoint(frame.center, baseAngle, frame.outerRadius),
  ];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const radius = scale.coordinate(value);
    const point = polarPoint(frame.center, baseAngle, radius);
    return [
      [point[0] - (radial[0] * AXIS_TICK_LENGTH) / 2, point[1] - (radial[1] * AXIS_TICK_LENGTH) / 2],
      [point[0] + (radial[0] * AXIS_TICK_LENGTH) / 2, point[1] + (radial[1] * AXIS_TICK_LENGTH) / 2],
    ];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const radius = scale.coordinate(value);
        const point = polarPoint(frame.center, baseAngle, radius);
        const text = ticks.labels[index];
        // 标签沿切向（垂直于辐条）一侧偏移，避开辐条与刻度
        const tangent: [number, number] = [-radial[1], radial[0]];
        const offset = AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2;
        const position: [number, number] = [point[0] - tangent[0] * offset, point[1] - tangent[1] * offset];
        return { type: 'node', position, text };
      })
    : [];

  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...(guide.id ? { id: guide.id } : {}),
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
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: rings,
      };
    }
  }

  return { gridLayer, axisLayer };
};

/**
 * 把一个 axis guide 下沉成网格层 + 轴层（各自一层 core scope；样式上提到 scope）
 * @description 按坐标帧分支：polar（ctx.frame 存在）按维度角色走 angular（外圆弧 + 圆周刻度 / 标签 + 角向辐条 grid）
 *   或 radial（辐条轴 + 同心环 grid）；否则走 cartesian 直线轴 / 网格（alpha.2 几何，产物不变）。
 *   下沉目标统一是 core Node（标签）+ Path（直段 / arc step）。id → 轴层 scope.id（anchor 预留）。
 */
export const lowerGuide = (guide: AxisGuide, ctx: GuideContext): LoweredGuide => {
  if (ctx.frame) {
    return isPrimaryDimension(guide.dimension)
      ? lowerAngularAxis(guide, ctx, ctx.frame)
      : lowerRadialAxis(guide, ctx, ctx.frame);
  }
  return lowerCartesianGuide(guide, ctx);
};
