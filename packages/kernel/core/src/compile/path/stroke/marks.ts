import type { CurveSegmentSample } from '@retikz/math';
import { RAD_TO_DEG } from '@retikz/math';

import type { GroupPrimitive, PaintValue, ScenePrimitive } from '../../../contract';
import type { CanonicalPathMark } from '../../../resolve';
import {
  combineOpacity,
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  safeThrownDetail,
} from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { materializeMarkerPrimitive } from '../../scene';
import type { MarkerPlacementContext } from '../../scene';
import { materializeScenePrimitives } from '../../shared';

/** 由共同定义生成箭头或沿线标记的局部图元 */
export const emitMarkPrimitives = (
  resolution: Pick<CanonicalPathMark, 'mark' | 'definition'>,
  round: (value: number) => number,
  registerPaint: RegisterPaint,
  owner: { label: string; providerKey: string },
): Array<ScenePrimitive> => {
  const { mark, definition } = resolution;
  const contextStroke: PaintValue = { kind: 'contextStroke' };
  const stroke = registerPaint(mark.stroke) ?? contextStroke;
  const fill = definition.hollow ? contextStroke : (registerPaint(mark.fill) ?? contextStroke);
  const allowedResourceIds = new Set<string>();
  for (const paint of [stroke, fill]) {
    if (typeof paint === 'object' && paint.kind === 'resourceRef') allowedResourceIds.add(paint.id);
  }
  let emitted: Array<ScenePrimitive>;
  try {
    const output = definition.emit({
      params: mark.params,
      stroke,
      fill,
      lineWidth: mark.lineWidth,
      dashPattern: mark.dashPattern,
      dashOffset: mark.dashOffset,
      lineCap: mark.lineCap,
      lineJoin: mark.lineJoin,
      round,
    });
    if ('resources' in output)
      throw createCompositeContractError(`${owner.label} output: provider cannot declare resources.`);
    emitted = Array.from(output);
  } catch (cause) {
    if (isFatalProbeError(cause)) throw cause;
    throw createLayoutProbeRecoverableError(`${owner.label} emit failed: ${safeThrownDetail(cause)}`, {
      cause,
      providerKey: owner.providerKey,
    });
  }
  return materializeScenePrimitives(owner.label, emitted, allowedResourceIds);
};

/** 按统一尺寸和局部锚点放置标记图元 */
export const placeMarkPrimitives = (
  primitives: Array<ScenePrimitive>,
  canon: CanonicalPathMark,
  sample: CurveSegmentSample,
  context: MarkerPlacementContext,
): GroupPrimitive => ({
  type: 'group',
  transforms: [
    { kind: 'translate', x: context.round(sample.point[0]), y: context.round(sample.point[1]) },
    {
      kind: 'rotate',
      degrees: context.round(
        typeof context.rotate === 'number'
          ? context.rotate
          : Math.atan2(sample.tangent[1], sample.tangent[0]) * RAD_TO_DEG,
      ),
    },
    {
      kind: 'scale',
      x: context.round((canon.geometry.resolvedLength * context.strokeWidth) / canon.geometry.baseSize),
      y: context.round((canon.geometry.resolvedWidth * context.strokeWidth) / canon.geometry.baseSize),
    },
    {
      kind: 'translate',
      x: context.round(-canon.geometry.anchor[0]),
      y: context.round(-canon.geometry.anchor[1]),
    },
  ],
  children: primitives.map(primitive =>
    materializeMarkerPrimitive(
      primitive,
      context.contextStroke,
      combineOpacity(canon.mark.opacity, context.hostOpacity),
    ),
  ),
});
