import { type IRNode, type IRNodeDefault, type IRScope } from '@retikz/core';
import { type CellGeometry, type ChannelValueResolver, cellGeometryAnchor } from '../../contract';
import { type Mark } from '../../schemas';
import { DEFAULT_FILL, type MarkPaint, colorGroupedScope, constantNodeStyleOverrides } from './shared';

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸）。 */
const barStyle = (fill: MarkPaint, stroke: MarkPaint | undefined): IRNodeDefault => ({
  shape: 'rectangle',
  padding: 0,
  strokeWidth: stroke === undefined ? 0 : 1,
  ...(typeof fill === 'string' ? { color: fill } : {}),
  fill,
  ...(stroke !== undefined ? { stroke } : {}),
});

/** sector / contour node 样式（shape 自带几何，padding0 + 无描边，纯填充）。 */
const shapeStyle = (fill: MarkPaint, stroke: MarkPaint | undefined): IRNodeDefault => ({
  padding: 0,
  strokeWidth: stroke === undefined ? 0 : 1,
  ...(typeof fill === 'string' ? { color: fill } : {}),
  fill,
  ...(stroke !== undefined ? { stroke } : {}),
});

/** 某 geometry kind 对应的 node 样式工厂（rect → 矩形 barStyle；sector / contour → shapeStyle）。 */
export const styleForGeometry = (kind: CellGeometry['kind'], mark: Mark): ((fill: MarkPaint, stroke?: MarkPaint) => IRNodeDefault) => {
  const base = kind === 'rect' ? barStyle : shapeStyle;
  return (fill, stroke) => ({ ...base(fill, stroke), ...constantNodeStyleOverrides(mark) });
};

/** 把一组「已就位 node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault；样式按 geometry kind 选）。 */
export const cellLayer = (
  placed: Array<{ color: string | undefined; node: IRNode }>,
  kind: CellGeometry['kind'],
  mark: Mark,
  colorOf: ChannelValueResolver<string> | undefined,
  defaultFill: MarkPaint = DEFAULT_FILL,
  defaultStroke?: MarkPaint,
): IRScope => {
  const styleFor = styleForGeometry(kind, mark);
  return colorOf
    ? colorGroupedScope(placed, fill => styleFor(fill, defaultStroke))
    : { type: 'scope', nodeDefault: styleFor(defaultFill, defaultStroke), children: placed.map(p => p.node) };
};

/**
 * CellGeometry → core Node（统一装配）。
 * @description rect → Node{position, minimumWidth, minimumHeight}；sector → Node{position:center, shape:sector}
 *   （半径 swap 保 outer>inner）；contour → Node{position: 顶点 AABB 中心, shape:contour{points}}；不可锚定 contour 返回 null。
 */
export const cellGeometryNode = (geometry: CellGeometry): IRNode | null => {
  if (geometry.kind === 'rect') {
    return { type: 'node', position: geometry.position, minimumWidth: geometry.width, minimumHeight: geometry.height };
  }
  if (geometry.kind === 'sector') {
    return {
      type: 'node',
      position: geometry.center,
      shape: {
        type: 'sector',
        params: {
          innerRadius: Math.min(geometry.innerRadius, geometry.outerRadius),
          outerRadius: Math.max(geometry.innerRadius, geometry.outerRadius),
          startAngle: geometry.startAngle,
          endAngle: geometry.endAngle,
        },
      },
    };
  }
  const position = cellGeometryAnchor(geometry);
  if (position === null) return null;
  return {
    type: 'node',
    position,
    shape: { type: 'contour', params: { points: geometry.points } },
  };
};
