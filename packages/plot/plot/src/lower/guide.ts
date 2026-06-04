import type { IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import type { AxisGuide } from '../ir';
import { AXIS_LABEL_GAP, AXIS_TICK_LENGTH, type Rect, estimateLabelWidth } from './layout';
import type { LinearScaleFn, TickSet } from './scale';

/** lowerGuide 上下文：plot area + 两维投影 + 两维 ticks + 字号 */
export type GuideContext = {
  /** 缩进后的绘图区矩形 */
  plotArea: Rect;
  /** x 值 → 像素 x（来自 plot-area-range 的 scale） */
  projectX: LinearScaleFn;
  /** y 值 → 像素 y */
  projectY: LinearScaleFn;
  /** x 轴刻度集（axis 与同维 grid 复用） */
  xTicks: TickSet;
  /** y 轴刻度集 */
  yTicks: TickSet;
  /** label 字号（与 ADR-03 估算同源） */
  fontSize: number;
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

/** 把若干直线段拼成一条多子路径 Path（每段一对 move/line）；空段返回 null */
const segmentsToPath = (segments: Array<Segment>): IRPath | null => {
  if (segments.length === 0) return null;
  const steps: Array<IRStep> = segments.flatMap(([from, to]) => [
    { type: 'step', kind: 'move', to: [from[0], from[1]] },
    { type: 'step', kind: 'line', to: [to[0], to[1]] },
  ]);
  return { type: 'path', children: steps };
};

/**
 * 把一个 axis guide 下沉成网格层 + 轴层（各自一层 core scope；样式上提到 scope）
 * @description 轴层：轴线 + 刻度线（一条多子路径 Path）+ 可选刻度标签（Node text）；
 *   网格层（grid:true）：跨 plot area 的对齐网格线。x 轴 → 竖线 / 底部轴线、y 轴 → 横线 / 左侧轴线。
 *   标签靠 core Node 中心 + 估算偏移定位（core Node 无 self-anchor）。id → 轴层 scope.id（anchor 预留）。
 */
export const lowerGuide = (guide: AxisGuide, ctx: GuideContext): LoweredGuide => {
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
    const p = project(value);
    return isX ? [[p, bottom], [p, bottom + AXIS_TICK_LENGTH]] : [[left, p], [left - AXIS_TICK_LENGTH, p]];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const p = project(value);
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
      const p = project(value);
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
