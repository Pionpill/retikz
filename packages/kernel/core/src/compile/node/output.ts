import { RAD_TO_DEG } from '@retikz/math';

import type { ScenePrimitive } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { emitCompiledDrawing } from '../scene';
import { outerRectOf } from './anchors';
import { emitCompiledNodeText } from './emit';
import { labelExtentPoints } from './label';
import type { CompiledNode } from './types';

/** 从最终节点结果组装图元与边界，不访问 canon、Definition 或测量服务 */
export const emitNodeOutput = (
  compiled: CompiledNode,
  round: (value: number) => number,
): {
  primitives: Array<ScenePrimitive>;
  bounds: Array<{ boundsPoints: Array<IRPosition>; shadow?: CanonicalDropShadow }>;
} => {
  const { geometry, layout, metadata, style, text, labels, animations } = compiled;
  const shape = emitCompiledDrawing({ geometry: geometry.shape, style: style.shape });
  const children = [
    ...shape,
    ...(text === undefined
      ? []
      : emitCompiledNodeText(
          { geometry: { rect: geometry.rect, margin: geometry.margin, ...layout }, text: text.layout },
          text.style,
          round,
        )),
    ...labels.flatMap(emitCompiledDrawing),
  ];
  const { rect: visualRect } = geometry;
  const rotated = (visualRect.rotate ?? 0) !== 0;
  const primitiveMetadata = { ...metadata, ...(animations.length === 0 ? {} : { animations }) };
  let primitives: Array<ScenePrimitive>;
  if (rotated || text !== undefined) {
    primitives = [
      {
        type: 'group',
        ...primitiveMetadata,
        children,
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
    for (const primitive of shape) Object.assign(primitive, primitiveMetadata);
    primitives = children;
  }
  const measured = {
    geometry: { rect: visualRect, margin: geometry.margin, ...layout },
    labels: labels.map(label => label.layout),
  };
  const outer = outerRectOf(compiled);
  return {
    primitives,
    bounds: [
      {
        boundsPoints: [Anchor.TopLeft, Anchor.TopRight, Anchor.BottomLeft, Anchor.BottomRight].map(anchor =>
          rect.anchor(outer, anchor),
        ),
        shadow: style.shadow,
      },
      { boundsPoints: labelExtentPoints(measured) },
    ],
  };
};
