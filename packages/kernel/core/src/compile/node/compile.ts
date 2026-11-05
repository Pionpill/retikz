import type { CanonicalNode } from '../../resolve';
import { splitCompiledDrawing } from '../scene';
import { projectNodeTextStyle, emitNodeShapePrimitives, emitNodeLabelPrimitives } from './emit';
import { layoutNode } from './layout';
import { alignmentGuidesOfNode } from './layout-metrics';
import type { CompiledNode, CompiledNodeLayout, NodeCompileContext, PreparedNodeCompilation } from './types';

/** 编译当前节点，直接消费已准备的布局或完成测量定位，不判断跨次复用条件 */
export const compileNode = (
  canon: CanonicalNode,
  context: NodeCompileContext,
  prepared?: PreparedNodeCompilation,
): CompiledNode => {
  const { round, registerPaint } = context;
  const layout: CompiledNodeLayout = {
    ...(prepared?.layout ?? layoutNode(canon, context)),
    shape: canon.shape,
    boundary: canon.boundary,
  };
  const shape = splitCompiledDrawing(emitNodeShapePrimitives(layout, canon.style, round, registerPaint));

  return {
    shape: canon.shape,
    boundary: canon.boundary,
    geometry: { rect: layout.geometry.rect, margin: layout.geometry.margin, shape: shape.geometry },
    layout: {
      contentCenter: layout.geometry.contentCenter,
      contentSize: layout.geometry.contentSize,
      alignmentGuides: alignmentGuidesOfNode(layout, round),
    },
    metadata: {
      ...(canon.id === undefined ? {} : { id: canon.id }),
      ...(canon.meta === undefined ? {} : { meta: canon.meta }),
    },
    style: {
      shape: shape.style,
      shadow: canon.style.shadow,
    },
    text: layout.text === undefined ? undefined : { layout: layout.text, style: projectNodeTextStyle(canon) },
    labels: (layout.labels ?? []).map((label, index) => {
      const { laid, ...metrics } = label;
      void laid;
      return {
        layout: metrics,
        ...splitCompiledDrawing(
          emitNodeLabelPrimitives(layout, label, canon.labels[index], canon, round, registerPaint),
        ),
      };
    }),
    animations: canon.animations,
  };
};
