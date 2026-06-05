import type { IRChild, IRNode, IRNodeDefault, IRScope, IRStep } from '@retikz/core';
import type { ExternalRow, Mark } from '../ir';
import { channelValue, compareByPath } from './field';
import type { Projector } from './project';

/** 散点 glyph 默认直径（user units，已补偿 circle 外接） */
const POINT_SIZE = 10;
/** 折线默认描边宽度（user units） */
const LINE_STROKE_WIDTH = 2;
/** 柱默认 baseline（值域基准；alpha.3 固定 0，可配置留后续） */
const BAR_BASELINE = 0;
/** 无 color 编码时的回退填充 */
const DEFAULT_FILL = 'currentColor';

/** 行 → 颜色串（color 编码解析结果；undefined = 回退默认色）。由 expand 据 encoding.color 构造 */
export type ColorOf = (row: ExternalRow) => string | undefined;

/**
 * 把若干「已就位 node + 其颜色」按颜色分组，每色一子 Scope（fill 上提到子 Scope 的 nodeDefault）
 * @description 颜色不逐 node 写：N 行同色 → 一个子 Scope 设 fill，IR 体积 O(色数) 而非 O(行数)。
 *   每个子 Scope 的 nodeDefault 自包含完整 node 样式（避免嵌套 every-X 合并的歧义）。
 */
const colorGroupedScope = (
  placed: Array<{ color: string | undefined; node: IRNode }>,
  styleFor: (fill: string) => IRNodeDefault,
): IRScope => {
  const groups = new Map<string, Array<IRNode>>();
  for (const { color, node } of placed) {
    const fill = color ?? DEFAULT_FILL;
    const bucket = groups.get(fill);
    if (bucket) bucket.push(node);
    else groups.set(fill, [node]);
  }
  const children: Array<IRChild> = [...groups].map(([fill, nodes]) => ({
    type: 'scope',
    nodeDefault: styleFor(fill),
    children: nodes,
  }));
  return { type: 'scope', children };
};

/** 散点 node 样式（circle + padding0 + minimumSize；÷√2 补 circle 外接，使 POINT_SIZE 即真实直径） */
const pointStyle = (fill: string): IRNodeDefault => ({
  shape: 'circle',
  padding: 0,
  minimumSize: POINT_SIZE / Math.SQRT2,
  fill,
});

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸） */
const barStyle = (fill: string): IRNodeDefault => ({ shape: 'rectangle', padding: 0, strokeWidth: 0, fill });

/** 散点：每行一个 circle Node */
const lowerPoint = (mark: Mark, rows: Array<ExternalRow>, project: Projector, colorOf?: ColorOf): IRChild | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const point = project(mark, row);
    if (!point) continue;
    placed.push({ color: colorOf?.(row), node: { type: 'node', position: point } });
  }
  if (placed.length === 0) return null;
  // 无 color：单图层，样式上提到 nodeDefault（守 alpha.1 结构）；有 color：每色一子 Scope
  if (!colorOf) return { type: 'scope', nodeDefault: pointStyle(DEFAULT_FILL), children: placed.map(p => p.node) };
  return colorGroupedScope(placed, pointStyle);
};

/** 区间柱：每行一个 rectangle Node（baseline→value） */
const lowerInterval = (mark: Mark, rows: Array<ExternalRow>, project: Projector, colorOf?: ColorOf): IRChild | null => {
  const bandwidth = project.xScale.bandwidth;
  const yBase = project.yScale.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const xCenter = project.xScale.coordinate(channelValue(mark.encoding.x, row));
    const yValue = project.yScale.coordinate(channelValue(mark.encoding.y, row));
    if (!Number.isFinite(xCenter) || !Number.isFinite(yValue)) continue;
    // 柱 = 中心在 [xCenter, (yBase+yValue)/2]、宽 bandwidth、高 |yBase−yValue| 的 rectangle Node
    const node: IRNode = {
      type: 'node',
      position: [xCenter, (yBase + yValue) / 2],
      minimumWidth: bandwidth,
      minimumHeight: Math.abs(yBase - yValue),
    };
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  if (!colorOf) return { type: 'scope', nodeDefault: barStyle(DEFAULT_FILL), children: placed.map(p => p.node) };
  return colorGroupedScope(placed, barStyle);
};

/** 折线：按 order（缺省数据序）连点成一条 Path；alpha.3 仅常量 color（field 多色线留 ADR-05 series 拆分） */
const lowerLine = (mark: Mark, rows: Array<ExternalRow>, project: Projector): IRChild | null => {
  const ordered = mark.type === 'line' && mark.order ? [...rows].sort((a, b) => compareByPath(a, b, mark.order as string)) : rows;
  const points = ordered.map(row => project(mark, row)).filter((point): point is [number, number] => point !== null);
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  const colorValue = mark.encoding.color?.value;
  const stroke = colorValue !== undefined ? String(colorValue) : DEFAULT_FILL;
  const layer: IRScope = {
    type: 'scope',
    pathDefault: { stroke, strokeWidth: LINE_STROKE_WIDTH },
    children: [{ type: 'path', children: steps }],
  };
  return layer;
};

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   一个 mark 会展成 N 个图元（N = 数据点数），任何能提到图层的东西——样式、默认值、共享上下文——都别逐元素重复写。
 *   color 编码时按颜色分子 Scope（颜色上提、不逐元素写）。无可绘制图元返回 null。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, project: Projector, colorOf?: ColorOf): IRChild | null => {
  if (mark.type === 'point') return lowerPoint(mark, rows, project, colorOf);
  if (mark.type === 'interval') return lowerInterval(mark, rows, project, colorOf);
  return lowerLine(mark, rows, project);
};
