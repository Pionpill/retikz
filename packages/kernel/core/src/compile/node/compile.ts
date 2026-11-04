import { jsonStructuralEquals } from '@retikz/foundation';

import type { CanonicalNode } from '../../resolve';
import { evaluatePosition, evaluatePositionTargetWorld } from '../reference';
import { compileNodeDrawing } from './emit';
import { layoutNode } from './layout';
import type { NodeLayoutContext } from './layout';
import type { NodeEmitContext } from './output';
import type { CompiledNode, NodeGeometryContext } from './types';

/** 消费完整 canon，完成节点测量、定位和最终绘制计算 */
export const compileNode = (
  node: CanonicalNode,
  context: NodeLayoutContext & NodeEmitContext,
  previous?: { canon: CanonicalNode; compiled: CompiledNode },
): CompiledNode => {
  if (previous !== undefined && canReuseNodeLayout(previous.canon, node)) {
    // 复用测量结果仍重新读取当前绑定，保持下次更新的依赖记录完整
    const position = node.layout.position;
    if (!Array.isArray(position) && 'kind' in position)
      evaluatePositionTargetWorld(position.target, context.positionContext);
    else evaluatePosition(position, context.positionContext);
    const layout = createNodeGeometryContext(node, previous.compiled);
    return compileNodeDrawing({ properties: node, context: layout }, context.round, context.registerPaint);
  }
  return compileNodeDrawing(layoutNode(node, context), context.round, context.registerPaint);
};

/** 只比较影响节点正文测量与放置的输入，颜色和透明度不触发布局 */
const canReuseNodeLayout = (previous: CanonicalNode, current: CanonicalNode): boolean => {
  if (previous.labels.length !== 0 || current.labels.length !== 0) return false;
  if (
    previous.shape.definition !== current.shape.definition ||
    previous.boundary.definition !== current.boundary.definition
  )
    return false;
  if (
    !jsonStructuralEquals(previous.shape.params, current.shape.params) ||
    !jsonStructuralEquals(previous.boundary.params, current.boundary.params)
  )
    return false;
  if (!jsonStructuralEquals(previous.layout, current.layout)) return false;
  const geometryOfText = (text: CanonicalNode['text']) =>
    text === undefined
      ? undefined
      : {
          font: text.font,
          align: text.align,
          lineHeight: text.lineHeight,
          lines: text.lines.map(line => ({
            mixed: line.mixed,
            plainText: line.plainText,
            font: line.style?.font,
            segments: line.segments.map(({ fill, opacity, ...segment }) => {
              void fill;
              void opacity;
              return segment;
            }),
          })),
        };
  return jsonStructuralEquals(geometryOfText(previous.text), geometryOfText(current.text));
};

/** 为连接查询临时组合能力绑定和最终几何，不保存重复的持久引用模型 */
export const createNodeGeometryContext = (canon: CanonicalNode, compiled: CompiledNode): NodeGeometryContext => ({
  shape: canon.shape,
  boundary: canon.boundary,
  geometry: { rect: compiled.geometry.rect, ...compiled.layout },
  text: compiled.text?.layout,
  labels: compiled.labels.map(label => label.layout),
});
