import type { IRChild, IRNode, IRScope, IRStep } from '@retikz/core';
import type { ExternalRow, Mark } from '../ir';
import { channelValue, compareByPath } from './field';
import type { Projector } from './project';

/** 散点 glyph 默认直径（user units，已补偿 circle 外接） */
const POINT_SIZE = 10;
/** 折线默认描边宽度（user units） */
const LINE_STROKE_WIDTH = 2;
/** 柱默认 baseline（值域基准；alpha.3 固定 0，可配置留后续） */
const BAR_BASELINE = 0;

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   一个 mark 会展成 N 个图元（N = 数据点数），任何能提到图层的东西——样式、默认值、共享上下文——都别逐元素重复写，
 *   否则 IR 体积是 O(N × 重复字段)。
 *
 *   当前做法：共享样式上提到 Scope 的 nodeDefault / pathDefault（core 的 every-X 默认会级联到子元素），
 *   每个 Node / Path 只留几何。point → circle Node（裸：仅 position）；line → Path（裸：仅 steps，按 order 连点）。
 *   无可绘制图元返回 null。**新增 mark 类型时沿用此原则。**
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, project: Projector): IRChild | null => {
  if (mark.type === 'point') {
    const nodes: Array<IRNode> = [];
    for (const row of rows) {
      const point = project(mark, row);
      if (!point) continue;
      nodes.push({ type: 'node', position: point });
    }
    if (nodes.length === 0) return null;
    const layer: IRScope = {
      type: 'scope',
      // 样式上提：padding 0（否则默认 padding(8) 撑大盒子、minimumSize 失效）；
      // ÷√2 补偿 circle 外接（直径 = 盒边 × √2），使 POINT_SIZE 即真实直径
      nodeDefault: { shape: 'circle', padding: 0, minimumSize: POINT_SIZE / Math.SQRT2, fill: 'currentColor' },
      children: nodes,
    };
    return layer;
  }

  if (mark.type === 'interval') {
    const bandwidth = project.xScale.bandwidth;
    const yBase = project.yScale.coordinate(BAR_BASELINE);
    if (!Number.isFinite(yBase)) return null;
    const nodes: Array<IRNode> = [];
    for (const row of rows) {
      const xCenter = project.xScale.coordinate(channelValue(mark.encoding.x, row));
      const yValue = project.yScale.coordinate(channelValue(mark.encoding.y, row));
      if (!Number.isFinite(xCenter) || !Number.isFinite(yValue)) continue;
      // 柱 = 中心在 [xCenter, (yBase+yValue)/2]、宽 bandwidth、高 |yBase−yValue| 的 rectangle Node
      nodes.push({
        type: 'node',
        position: [xCenter, (yBase + yValue) / 2],
        minimumWidth: bandwidth,
        minimumHeight: Math.abs(yBase - yValue),
      });
    }
    if (nodes.length === 0) return null;
    const layer: IRScope = {
      type: 'scope',
      // padding 0 + 无描边，让 minimumWidth/Height 即真实柱尺寸；fill 用 currentColor（color 编码见 ADR-04）
      nodeDefault: { shape: 'rectangle', padding: 0, strokeWidth: 0, fill: 'currentColor' },
      children: nodes,
    };
    return layer;
  }

  const ordered = mark.order
    ? [...rows].sort((a, b) => compareByPath(a, b, mark.order as string))
    : rows;
  const points = ordered
    .map(row => project(mark, row))
    .filter((point): point is [number, number] => point !== null);
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  const layer: IRScope = {
    type: 'scope',
    pathDefault: { stroke: 'currentColor', strokeWidth: LINE_STROKE_WIDTH },
    children: [{ type: 'path', children: steps }],
  };
  return layer;
};
