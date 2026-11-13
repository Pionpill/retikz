import { formatPropertyPath } from '@retikz/foundation';

import type { ScenePrimitive } from '../../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { StrokePathResolution } from '../../../../resolve';
import type { RegisterPaint } from '../../../resource';
import type { StrokePositionModel } from '../geometry';
import { sampleStrokePosition } from '../geometry';
import type {
  CompiledStrokeAppearance,
  LoweredStrokePathGeometry,
  PreparedStrokeMarkLayout,
  PreparedStrokePathEmit,
  StrokePathCompileContext,
  StrokePathLayout,
} from '../types';
import { placeEndpointArrow } from './endpoint-contact';
import type { EndpointArrowSpecs } from './endpoint-contact';
import { emitMarkPrimitives, placeMarkPrimitives, placeStrokeMark } from './marks';
import { calculateEndpointArrowContact, emitEndpointArrowMark } from './shrink';

/** 读取当前箭头声明对应的已解析尺寸与 provider */
const endpointResolutionOf = (resolution: StrokePathResolution, endpoint: 'start' | 'end') => {
  const arrow = resolution.canon.arrow?.[endpoint];
  if (arrow === undefined) return undefined;
  const binding = resolution.arrows.get(arrow);
  if (binding === undefined)
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Missing arrow binding at ${formatPropertyPath(resolution.irPath)}.arrow.${endpoint}`,
    );
  return { arrow, binding };
};

/** 箭头的几何接触长度由 canon 计算，无需生成内容 */
export const calculateStrokeEndpointContact = (
  resolution: StrokePathResolution,
  endpointSource: LoweredStrokePathGeometry['endpointSource'],
) => {
  const shrinkOf = (endpoint: 'start' | 'end', autoBoundary: boolean) => {
    const bound = endpointResolutionOf(resolution, endpoint);
    if (bound === undefined) return 0;
    const contact = calculateEndpointArrowContact(bound.binding, bound.arrow.endpointOverlap ?? 0);
    return contact.shrink + (autoBoundary ? contact.boundaryOuterInset : 0);
  };
  return {
    shrinkStart: shrinkOf('start', endpointSource.firstAutoBoundary),
    shrinkEnd: shrinkOf('end', endpointSource.lastAutoBoundary),
    hasEndArrow: resolution.canon.arrow?.end !== undefined,
  };
};

/** 沿截断前路径计算逐标记的放置，可独立复用 */
export const layoutStrokeMarks = (
  resolution: StrokePathResolution,
  positions: StrokePositionModel | undefined,
  context: StrokePathCompileContext,
  prepared?: Array<PreparedStrokeMarkLayout>,
): StrokePathLayout['marks'] =>
  (resolution.canon.marks ?? []).map((mark, index) => {
    const cached = prepared?.[index]?.placement;
    if (cached !== undefined) return { placement: cached };
    const sample =
      positions === undefined
        ? undefined
        : sampleStrokePosition(positions, mark.pos, mark.positionMode, mark.positionGeometry)?.visual;
    if (sample === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Cannot locate mark on a zero-length path at ${formatPropertyPath(resolution.irPath)}.marks[${index}]`,
      );
    const binding = resolution.marks.get(mark);
    if (binding === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Missing mark binding at ${formatPropertyPath([...resolution.irPath, 'marks', index])}`,
      );
    return {
      placement: {
        point: sample.point,
        transforms: placeStrokeMark(binding, sample, {
          round: context.round,
          rotate: mark.rotate,
          strokeWidth: resolution.canon.strokeWidth,
        }),
      },
    };
  });

/** 复用局部箭头内容，将当前端点接触补偿应用于独立输出 */
export const emitStrokeArrows = (
  resolution: StrokePathResolution,
  layout: StrokePathLayout,
  context: StrokePathCompileContext,
  registerPaint: RegisterPaint,
  prepared?: PreparedStrokePathEmit['arrows'],
) => {
  const slots: NonNullable<PreparedStrokePathEmit['arrows']> = {};
  const specs: EndpointArrowSpecs = {};
  for (const endpoint of ['start', 'end'] as const) {
    const bound = endpointResolutionOf(resolution, endpoint);
    if (bound === undefined) continue;
    const content =
      prepared?.[endpoint]?.content ??
      emitMarkPrimitives(bound.binding, context.round, registerPaint, {
        label: `Arrow '${bound.binding.mark.shape}'`,
        providerKey: `arrow:${bound.binding.mark.shape}`,
      });
    slots[endpoint] = { content };
    const spec = placeEndpointArrow(
      emitEndpointArrowMark(bound.binding, bound.arrow.endpointOverlap ?? 0, content),
      layout.body.contacts[endpoint],
    );
    if (spec !== undefined) {
      if (endpoint === 'start') specs.arrowStart = spec;
      else specs.arrowEnd = spec;
    }
  }
  return { slots, specs };
};

/** 复用标记内容或整体输出，补齐宿主外观与放置 */
export const emitStrokeMarks = (
  resolution: StrokePathResolution,
  layout: StrokePathLayout,
  appearanceOf: () => CompiledStrokeAppearance,
  context: StrokePathCompileContext,
  registerPaint: RegisterPaint,
  prepared?: PreparedStrokePathEmit['marks'],
) => {
  const slots: NonNullable<PreparedStrokePathEmit['marks']> = [];
  const primitives: Array<ScenePrimitive> = [];
  for (const [index, mark] of (resolution.canon.marks ?? []).entries()) {
    const cached = prepared?.[index];
    if (cached?.overall !== undefined) {
      slots.push(cached);
      primitives.push(cached.overall);
      continue;
    }
    const binding = resolution.marks.get(mark);
    const location = formatPropertyPath([...resolution.irPath, 'marks', index]);
    if (binding === undefined)
      throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Missing mark binding at ${location}`);
    const content =
      cached?.content ??
      emitMarkPrimitives(binding, context.round, registerPaint, {
        label: `Mark '${binding.definition.name}' at ${location}`,
        providerKey: `mark:${binding.definition.name}`,
      });
    const appearance = appearanceOf();
    const overall = placeMarkPrimitives(content, binding, layout.marks[index].placement.transforms, {
      contextStroke: appearance.stroke ?? 'currentColor',
      hostOpacity: appearance.opacity,
    });
    slots.push({ content, overall });
    primitives.push(overall);
  }
  return { slots, primitives };
};
