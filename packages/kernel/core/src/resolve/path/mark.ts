import type { MarkDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPosition } from '../../schemas';
import { ARROW_MARKER_DEFAULT_SIZE, ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH } from '../../schemas';
import { resolvePaint } from '../resource';
import type { MarkResolution, PathResolveContext, MarkColorSource } from './types';

/** 解析箭头与沿线标记共用的外观、有效尺寸和锚点；空心定义不保留填充 */
export const resolveMarkStyle = (
  mark: MarkColorSource,
  definition: MarkDefinition,
  context: PathResolveContext,
): MarkResolution => {
  const visual = {
    shape: definition.name,
    scale: mark.scale ?? 1,
    length: mark.length ?? definition.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE,
    width: mark.width ?? definition.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE,
    ...(definition.hollow ? {} : { fill: resolvePaint(mark.fill ?? mark.color, context) }),
    opacity: mark.opacity,
    stroke: resolvePaint(mark.stroke ?? (definition.hollow ? mark.color : 'none'), context),
    dashPattern: mark.dashPattern,
    dashOffset: mark.dashOffset,
    lineCap: mark.lineCap,
    lineJoin: mark.lineJoin,
    lineWidth: mark.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  };
  const baseSize = definition.baseSize ?? 10;
  const resolvedLength = visual.length * visual.scale;
  const resolvedWidth = visual.width * visual.scale;
  if (!Number.isFinite(baseSize) || baseSize <= 0)
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Mark '${definition.name}' has invalid baseSize; expected a finite positive number.`,
    );
  if (!Number.isFinite(resolvedLength) || !Number.isFinite(resolvedWidth))
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Mark '${definition.name}' resolved length/width is non-finite (length × scale overflowed).`,
    );
  const anchor: IRPosition = definition.anchor ?? [baseSize / 2, baseSize / 2];
  if (!anchor.every(Number.isFinite))
    throw new RetikzCoreError(RetikzCoreErrorCode.Resolve, `Mark '${definition.name}' has a non-finite anchor.`);
  return { mark, definition, visual, geometry: { baseSize, resolvedLength, resolvedWidth, anchor } };
};
