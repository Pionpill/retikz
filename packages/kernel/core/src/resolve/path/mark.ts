import type { MarkDefinition } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPosition } from '../../schemas';
import { ARROW_MARKER_DEFAULT_SIZE, ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH } from '../../schemas';
import { resolvePaint } from '../resource';
import type { MarkResolution, PathResolveContext, MarkColorSource } from './types';

/** 解析箭头与沿线标记共用的外观、有效尺寸和锚点；空心定义不保留填充 */
export const resolveMarkStyle = (
  source: MarkColorSource,
  definition: MarkDefinition,
  context: PathResolveContext,
): MarkResolution => {
  const mark = {
    shape: definition.name,
    scale: source.scale ?? 1,
    length: source.length ?? definition.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE,
    width: source.width ?? definition.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE,
    ...(definition.hollow ? {} : { fill: resolvePaint(source.fill ?? source.color, context) }),
    opacity: source.opacity,
    stroke: resolvePaint(source.stroke ?? (definition.hollow ? source.color : 'none'), context),
    dashPattern: source.dashPattern,
    dashOffset: source.dashOffset,
    lineCap: source.lineCap,
    lineJoin: source.lineJoin,
    lineWidth: source.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  };
  const baseSize = definition.baseSize ?? 10;
  const resolvedLength = mark.length * mark.scale;
  const resolvedWidth = mark.width * mark.scale;
  if (!Number.isFinite(resolvedLength) || !Number.isFinite(resolvedWidth))
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Mark '${definition.name}' resolved length/width is non-finite (length × scale overflowed).`,
    );
  const anchor: IRPosition = definition.anchor ?? [baseSize / 2, baseSize / 2];
  return { source, definition, mark, geometry: { baseSize, resolvedLength, resolvedWidth, anchor } };
};
