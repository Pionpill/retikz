import type { WithRequiredProperties } from '@retikz/foundation';
import { RAD_TO_DEG } from '@retikz/math';

import type { ScenePrimitive } from '../../contract';
import type { CanonicalNode } from '../../resolve';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { calculateOuterBoundaryRect } from '../boundary';
import { emitCompiledNodeText, buildNodeTextStyle } from './content';
import { emitNodeLabelPrimitives, calculateNodeLabelExtentPoints } from './label';
import { emitNodeShapePrimitives } from './shape';
import type { CompiledNodeLayout, NodeCompileContext, NodeEmitOutput, PreparedNodeEmit } from './types';

/** 复用已准备的节点绘制产物并计算缺失部分，不判断跨次复用条件 */
export const emitNode = (
  canon: CanonicalNode,
  layout: CompiledNodeLayout,
  context: Pick<NodeCompileContext, 'round' | 'registerPaint'>,
  prepared?: PreparedNodeEmit,
): WithRequiredProperties<PreparedNodeEmit, 'overall'> => {
  if (prepared?.overall !== undefined) return { ...prepared, overall: prepared.overall };

  const { round, registerPaint } = context;
  const drawing = {
    shape: prepared?.shape ?? emitNodeShapePrimitives(layout, canon.style, canon.shape, round, registerPaint),
    content: prepared?.content ?? emitCompiledNodeText(layout, buildNodeTextStyle(canon), round),
    labels: (layout.labels ?? []).map(
      (label, index) =>
        prepared?.labels?.[index]?.overall ??
        emitNodeLabelPrimitives(layout, label, canon.labels[index], canon, round, registerPaint),
    ),
  };
  return {
    ...drawing,
    labels: drawing.labels.map(overall => ({ overall })),
    overall: emitNodeOutput(canon, layout, drawing, round),
  };
};

/** 组装局部绘制产物、节点元数据和边界 */
const emitNodeOutput = (
  canon: CanonicalNode,
  layout: CompiledNodeLayout,
  drawing: Required<Pick<PreparedNodeEmit, 'content' | 'shape'>> & { labels: Array<Array<ScenePrimitive>> },
  round: (value: number) => number,
): NodeEmitOutput => {
  const { geometry, text } = layout;
  const { style, animations } = canon;
  const metadata = {
    ...(canon.id === undefined ? {} : { id: canon.id }),
    ...(canon.meta === undefined ? {} : { meta: canon.meta }),
  };
  const { rect: visualRect } = geometry;
  const rotated = (visualRect.rotate ?? 0) !== 0;
  const primitiveMetadata = { ...metadata, ...(animations.length === 0 ? {} : { animations }) };
  let primitives: Array<ScenePrimitive>;
  if (rotated || text !== undefined) {
    primitives = [
      {
        type: 'group',
        ...primitiveMetadata,
        children: [...drawing.shape, ...drawing.content, ...drawing.labels.flat()],
        ...(rotated
          ? {
              transforms: [
                {
                  kind: 'rotate',
                  degrees: round((visualRect.rotate ?? 0) * RAD_TO_DEG),
                  cx: round(visualRect.x),
                  cy: round(visualRect.y),
                },
              ],
            }
          : {}),
      },
    ];
  } else {
    primitives = [
      ...drawing.shape.map(primitive => ({ ...primitive, ...primitiveMetadata })),
      ...drawing.content,
      ...drawing.labels.flat(),
    ];
  }
  const outer = calculateOuterBoundaryRect(layout);
  return {
    primitives,
    bounds: [
      {
        boundsPoints: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
          rect.anchor(outer, anchor),
        ),
        shadow: style.shadow,
      },
      { boundsPoints: calculateNodeLabelExtentPoints(layout) },
    ],
  };
};
