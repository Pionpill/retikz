import type { CanonicalNode } from '../../resolve';
import { splitCompiledDrawing } from '../scene';
import { compileNodeTextStyle, emitNodeShapePrimitives, emitNodeLabelPrimitives } from './emit';
import { layoutNode } from './layout';
import type { NodeLayoutContext } from './layout';
import { alignmentGuidesOfNode } from './layout-metrics';
import type { NodeEmitContext } from './output';
import type { CompiledNode, CompiledNodeLayout, PreparedNodeCompilation } from './types';

/** 编译当前节点，直接消费已准备的布局或完成测量定位，不判断跨次复用条件 */
export const compileNode = (
  properties: CanonicalNode,
  context: NodeLayoutContext & NodeEmitContext,
  prepared?: PreparedNodeCompilation,
): CompiledNode => {
  const { round, registerPaint } = context;
  const layout: CompiledNodeLayout = {
    ...(prepared?.layout ?? layoutNode(properties, context)),
    shape: properties.shape,
    boundary: properties.boundary,
  };
  const shape = splitCompiledDrawing(emitNodeShapePrimitives(layout, properties.style, round, registerPaint));
  return {
    shape: properties.shape,
    boundary: properties.boundary,
    geometry: { rect: layout.geometry.rect, margin: layout.geometry.margin, shape: shape.geometry },
    layout: {
      contentCenter: layout.geometry.contentCenter,
      contentSize: layout.geometry.contentSize,
      alignmentGuides: alignmentGuidesOfNode(layout, round),
    },
    metadata: {
      ...(properties.id === undefined ? {} : { id: properties.id }),
      ...(properties.meta === undefined ? {} : { meta: properties.meta }),
    },
    style: {
      shape: shape.style,
      shadow: properties.style.shadow,
    },
    text: layout.text === undefined ? undefined : { layout: layout.text, style: compileNodeTextStyle(properties) },
    labels: (layout.labels ?? []).map((label, index) => {
      const { laid, ...metrics } = label;
      void laid;
      return {
        layout: metrics,
        ...splitCompiledDrawing(
          emitNodeLabelPrimitives(layout, label, properties.labels[index], properties, round, registerPaint),
        ),
      };
    }),
    animations: properties.animations,
  };
};
