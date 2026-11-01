import type { PaintValue, ScenePrimitive } from '../../../../contract';
import type { MarkResolution } from '../../../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  safeThrownDetail,
} from '../../../../resolve/diagnostics';
import type { RegisterPaint } from '../../../resource';
import { materializeScenePrimitives } from '../../../shared';

/** 由共同定义生成箭头或沿线标记的局部图元 */
export const emitMarkPrimitives = (
  resolution: Pick<MarkResolution, 'source' | 'mark' | 'definition'>,
  round: (value: number) => number,
  registerPaint: RegisterPaint,
  owner: { label: string; providerKey: string },
): Array<ScenePrimitive> => {
  const { source, mark, definition } = resolution;
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
      params: source.params ?? {},
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
