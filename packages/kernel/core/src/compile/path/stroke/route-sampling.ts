import type { CurveSegmentSample } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import { createStrokePathGeometry, sampleStrokePathGeometry, sampleStrokeStepParameterGeometry } from './interruption';
import { applyRoundedCorners } from './rounded-corners';
import { sampleStrokePath } from './sampling';

/**
 * 采样结构化参考路径的位置与切线
 * @description 每条绘制 command 视为一个普通 step；未圆角时按绘制段均分参数，圆角时复用 Core 最终路径采样。空路径返回 undefined
 */
export const samplePathRoute = (
  commands: ReadonlyArray<PathCommand>,
  cornerRadius: number,
  position: number,
): CurveSegmentSample | undefined => {
  const sourceStepIndexes = commands.map((_, index) => index);
  const geometry = createStrokePathGeometry(commands, sourceStepIndexes);
  const segmentSamplers = geometry.occurrences.map(
    occurrence => (parameter: number) =>
      sampleStrokeStepParameterGeometry(geometry, occurrence.sourceStepIndex, parameter)!.sample,
  );
  if (cornerRadius > 0) {
    const rounded = applyRoundedCorners({
      commands: [...commands],
      provenance: commands.map(command => command.kind),
      sourceStepIndexes,
      radius: cornerRadius,
      round: coordinate => coordinate,
    });
    return sampleStrokePathGeometry(createStrokePathGeometry(rounded.commands, rounded.sourceStepIndexes), position)
      ?.sample;
  }

  return sampleStrokePath({ commands, segmentSamplers, roundedCommands: false, position });
};
