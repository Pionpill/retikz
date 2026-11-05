import { RAD_TO_DEG } from '@retikz/math';

import type { GroupPrimitive, ScenePrimitive } from '../../contract';
import type { CanonicalNode } from '../../resolve';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { Anchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { outerRectOf } from '../boundary';
import type { RegisterPaint } from '../resource';
import { emitCompiledDrawing } from '../scene';
import { emitCompiledNodeText, buildNodeTextStyle } from './content';
import { emitNodeLabelPrimitives, calculateNodeLabelExtentPoints } from './label';
import { emitNodeShapePrimitives } from './shape';
import type { CompiledNode, CompiledNodeLayout } from './types';

type Round = (n: number) => number;

/** 把节点标识和元数据写到纯几何节点的 shape 图元 */
const stampNodeShapePrimitives = (
  metadata: Pick<CanonicalNode, 'id' | 'meta' | 'animations'>,
  primitives: Array<ScenePrimitive>,
): void => {
  if (metadata.id !== undefined) {
    for (const prim of primitives) prim.id = metadata.id;
  }

  if (metadata.meta !== undefined) {
    for (const prim of primitives) prim.meta = metadata.meta;
  }

  if (metadata.animations.length > 0) {
    for (const prim of primitives) prim.animations = metadata.animations;
  }
};

/** 包装带文本或旋转的节点 group */
const wrapNodeGroupPrimitive = (
  layout: CompiledNodeLayout,
  metadata: Pick<CanonicalNode, 'id' | 'meta' | 'animations'>,
  children: Array<ScenePrimitive>,
  round: Round,
): GroupPrimitive => {
  const group: GroupPrimitive = { type: 'group', children };
  if (metadata.id !== undefined) group.id = metadata.id;
  if (metadata.meta !== undefined) group.meta = metadata.meta;
  if (metadata.animations.length > 0) group.animations = metadata.animations;
  if ((layout.geometry.rect.rotate ?? 0) !== 0) {
    group.transforms = [
      {
        kind: 'rotate',
        degrees: round((layout.geometry.rect.rotate ?? 0) * RAD_TO_DEG),
        cx: round(layout.geometry.rect.x),
        cy: round(layout.geometry.rect.y),
      },
    ];
  }

  return group;
};

/**
 * 将节点布局转换为场景图元
 * @description shape 主体走 `shapeDef.emit`；文本和 label 追加为附属 primitive
 */
export const emitNodePrimitives = (
  canon: CanonicalNode,
  layout: CompiledNodeLayout,
  round: Round,
  registerPaint: RegisterPaint,
): Array<ScenePrimitive> => {
  const shapePrimitives = emitNodeShapePrimitives(layout, canon.style, round, registerPaint);
  const inner: Array<ScenePrimitive> = [
    ...shapePrimitives,
    ...emitCompiledNodeText(layout, buildNodeTextStyle(canon), round),
    ...(layout.labels?.flatMap((label, index) =>
      emitNodeLabelPrimitives(layout, label, canon.labels[index], canon, round, registerPaint),
    ) ?? []),
  ];

  const needsGroup = (layout.geometry.rect.rotate ?? 0) !== 0 || layout.text !== undefined;
  if (!needsGroup) {
    stampNodeShapePrimitives(canon, shapePrimitives);
    return inner;
  }

  return [wrapNodeGroupPrimitive(layout, canon, inner, round)];
};

/** 从最终节点结果组装图元与边界，不访问 canon、Definition 或测量服务 */
export const emitNodeOutput = (
  compiled: CompiledNode,
  round: (value: number) => number,
): {
  primitives: Array<ScenePrimitive>;
  bounds: Array<{ boundsPoints: Array<IRPosition>; shadow?: CanonicalDropShadow }>;
} => {
  const { geometry, structure, layout, metadata, style, text, labels, animations } = compiled;
  const shape = emitCompiledDrawing({ structure: structure.shape, style: style.shape });
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
      { boundsPoints: calculateNodeLabelExtentPoints(measured) },
    ],
  };
};
