import type { CenteredBox } from '@retikz/math';

import type { CompiledShapeStyle, ScenePrimitive } from '../../../contract';
import type { CanonicalNode } from '../../../resolve';
import {
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { snapshotScenePrimitives } from '../../shared';
import type { CompiledNodeLayout } from '../types';

/** 节点形状绘制使用的有效样式 */
type NodeShapeProperties = Pick<
  CanonicalNode['style'],
  | 'fill'
  | 'fillOpacity'
  | 'stroke'
  | 'strokeOpacity'
  | 'strokeWidth'
  | 'dashPattern'
  | 'dashOffset'
  | 'lineCap'
  | 'lineJoin'
  | 'cornerRadius'
  | 'opacity'
  | 'shadow'
  | 'blendMode'
>;

type Round = (n: number) => number;

/** 从有效节点外观收敛 shape emit 所需的视觉样式 */
const toShapeStyle = (properties: NodeShapeProperties, registerPaint: RegisterPaint): CompiledShapeStyle => ({
  fill: registerPaint(properties.fill),
  fillOpacity: properties.fillOpacity,
  stroke: registerPaint(properties.stroke) ?? 'currentColor',
  strokeOpacity: properties.strokeOpacity,
  strokeWidth: properties.strokeWidth,
  dashPattern: properties.dashPattern.length === 0 ? undefined : properties.dashPattern,
  dashOffset: properties.dashOffset === 0 ? undefined : properties.dashOffset,
  lineCap: properties.lineCap,
  lineJoin: properties.lineJoin,
  cornerRadius: properties.cornerRadius,
  opacity: properties.opacity,
  shadow: properties.shadow,
  blendMode: properties.blendMode === 'normal' ? undefined : properties.blendMode,
});

/** 发出节点 shape 主体图元 */
export const emitNodeShapePrimitives = (
  layout: CompiledNodeLayout,
  properties: NodeShapeProperties,
  shape: CanonicalNode['shape'],
  round: Round,
  registerPaint: RegisterPaint,
): Array<ScenePrimitive> => {
  const axisAlignedRect: CenteredBox = { ...layout.geometry.rect, rotate: 0 };
  const style = toShapeStyle(properties, registerPaint);
  const allowedResourceIds = new Set<string>();
  for (const paint of [style.fill, style.stroke]) {
    if (typeof paint === 'object' && paint.kind === 'resourceRef') allowedResourceIds.add(paint.id);
  }
  let emitted: Iterable<ScenePrimitive>;

  try {
    emitted = shape.definition.emit(axisAlignedRect, style, round, shape.params);
  } catch (thrown) {
    if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;

    throw createLayoutProbeRecoverableError(`Shape '${shape.name}' emit failed: ${safeThrownDetail(thrown)}`, {
      cause: thrown,
      providerKey: `shape:${shape.name}`,
    });
  }

  return snapshotScenePrimitives(`Shape '${shape.name}'`, emitted, allowedResourceIds);
};
