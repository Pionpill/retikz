import type { PaintValue, ScenePrimitive } from '../../../../contract';
import type { MarkResolution } from '../../../../resolve';
import { createLayoutProbeRecoverableError, safeThrownDetail } from '../../../../resolve/diagnostics';
import type { RegisterPaint } from '../../../resource';
import { materializeScenePrimitives } from '../../../resource';

/** 由共同定义生成箭头或沿线标记的局部图元 */
export const emitMarkPrimitives = (
  resolution: Pick<MarkResolution, 'source' | 'mark' | 'definition'>,
  round: (value: number) => number,
  registerPaint: RegisterPaint,
  owner: { label: string; providerKey: string },
): Array<ScenePrimitive> => {
  const { source, mark, definition } = resolution;
  const contextStroke: PaintValue = { kind: 'contextStroke' };
  let emitted: Array<ScenePrimitive>;
  try {
    emitted = Array.from(
      definition.emit({
        params: source.params ?? {},
        stroke: registerPaint(mark.stroke) ?? contextStroke,
        fill: definition.hollow ? contextStroke : (registerPaint(mark.fill) ?? contextStroke),
        lineWidth: mark.lineWidth,
        dashPattern: mark.dashPattern,
        dashOffset: mark.dashOffset,
        lineCap: mark.lineCap,
        lineJoin: mark.lineJoin,
        round,
      }),
    );
  } catch (cause) {
    throw createLayoutProbeRecoverableError(`${owner.label} emit failed: ${safeThrownDetail(cause)}`, {
      cause,
      providerKey: owner.providerKey,
    });
  }
  return materializeScenePrimitives(owner.label, emitted);
};
