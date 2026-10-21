import type { IRPathScale } from '@retikz/core';
import { DropShadowSchema, PathScaleSchema, PathThickness, THICKNESS_TO_WIDTH } from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import { JsonValueSchema } from '@retikz/foundation';
import { isFiniteNumber } from '@retikz/math';

import type { AnyChannelDefinition, PathChannelDefinition } from '../../../contract';
import { ChannelDefinitionKind, markChannelEncoding, definePathChannel } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotMarkOperation, IRPlotChannel } from '../../../schemas';
import { isBuiltinMark } from '../../../schemas';
import { makeMarkValueResolver, resolveNumericChannel } from '../shared';
import { OPACITY_MIN, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from './node';

const jsonValue = (value: unknown): JsonValue | undefined =>
  JsonValueSchema.safeParse(value).success ? (value as JsonValue) : undefined;

const finiteNumber = (value: unknown): number | undefined => (isFiniteNumber(value) ? value : undefined);

const opacityNumber = (value: unknown): number | undefined =>
  isFiniteNumber(value) && value >= 0 && value <= 1 ? value : undefined;

const integerNumber = (value: unknown): number | undefined => (isFiniteNumber(value) ? Math.trunc(value) : undefined);

const dashPatternValue = (value: unknown): Array<number> | undefined =>
  Array.isArray(value) && value.length > 0 && value.every(item => isFiniteNumber(item) && item >= 0)
    ? value
    : undefined;

const defineSimplePathChannel = <T extends JsonValue>(
  channel: string,
  output: PathChannelDefinition<T>['output'],
  parse: (value: unknown) => T | undefined,
  deliver: PathChannelDefinition<T>['deliver'],
): PathChannelDefinition<T> =>
  definePathChannel<T>({
    channel,
    output,
    resolve: (ctx, mark) =>
      makeMarkValueResolver<T>(markChannelEncoding(mark, channel), ctx.model, {
        channelName: channel,
        parse,
      }),
    deliver,
  });

const pickPathStrokeWidth = (mark: IRPlotMarkOperation): IRPlotChannel | undefined =>
  markChannelEncoding(mark, 'strokeWidth');

const pickPathOpacity = (mark: IRPlotMarkOperation): IRPlotChannel | undefined => markChannelEncoding(mark, 'opacity');

const pickPathFillOpacity = (mark: IRPlotMarkOperation): IRPlotChannel | undefined =>
  markChannelEncoding(mark, 'fillOpacity');

const pathNumericChannels: {
  strokeWidth: PathChannelDefinition<number>;
  opacity: PathChannelDefinition<number>;
  fillOpacity: PathChannelDefinition<number>;
  roundedCorners: PathChannelDefinition<number>;
} = {
  strokeWidth: definePathChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericChannel(ctx.node, ctx.rows, ctx.model, pickPathStrokeWidth(mark), 'strokeWidth', {
        range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.style = { ...path.style, strokeWidth: value };
    },
  }),
  opacity: definePathChannel<number>({
    channel: 'opacity',
    output: { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    legend: 'ramp',
    resolve: (ctx, mark) =>
      resolveNumericChannel(ctx.node, ctx.rows, ctx.model, pickPathOpacity(mark), 'opacity', {
        range: [OPACITY_MIN, 1],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.style = {
        ...path.style,
        opacity: {
          ...(typeof path.style?.opacity === 'number' ? { overall: path.style.opacity } : path.style?.opacity),
          overall: value,
        },
      };
    },
  }),
  fillOpacity: definePathChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericChannel(ctx.node, ctx.rows, ctx.model, pickPathFillOpacity(mark), 'fillOpacity', {
        range: [0.2, 1],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.style = {
        ...path.style,
        opacity: {
          ...(typeof path.style?.opacity === 'number' ? { overall: path.style.opacity } : path.style?.opacity),
          fill: value,
        },
      };
    },
  }),
  roundedCorners: definePathChannel<number>({
    channel: 'roundedCorners',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: (ctx, mark) =>
      resolveNumericChannel(
        ctx.node,
        ctx.rows,
        ctx.model,
        markChannelEncoding(mark, 'roundedCorners'),
        'roundedCorners',
      ),
    deliver: (path, value) => {
      path.roundedCorners = value;
    },
  }),
};

const lineCapValues = new Set(['butt', 'round', 'square']);

const lineJoinValues = new Set(['miter', 'round', 'bevel']);

const fillRuleValues = new Set(['nonzero', 'evenodd']);

const thicknessValues = new Set<PathThickness>(Object.values(PathThickness));

const pathThicknessValue = (value: unknown): PathThickness | undefined =>
  typeof value === 'string' && thicknessValues.has(value as PathThickness) ? (value as PathThickness) : undefined;

const shadowPresetValues = new Set(['none', 'sm', 'md', 'lg', 'xl', '2xl']);

const blendModeValues = new Set([
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]);

const directPathChannels = {
  strokeOpacity: defineSimplePathChannel<number>(
    'strokeOpacity',
    { outputKind: 'number', range: [0.2, 1], clamp: true },
    opacityNumber,
    (path, value) => {
      path.style = {
        ...path.style,
        opacity: {
          ...(typeof path.style?.opacity === 'number' ? { overall: path.style.opacity } : path.style?.opacity),
          stroke: value,
        },
      };
    },
  ),
  zIndex: defineSimplePathChannel<number>(
    'zIndex',
    { outputKind: 'number', range: [0, 0] },
    integerNumber,
    (path, value) => {
      path.zIndex = value;
    },
  ),
  rotate: defineSimplePathChannel<number>(
    'rotate',
    { outputKind: 'number', range: [0, 0] },
    finiteNumber,
    (path, value) => {
      path.rotate = value;
    },
  ),
  scale: defineSimplePathChannel<JsonValue>(
    'scale',
    { outputKind: 'json' },
    value => (PathScaleSchema.safeParse(value).success ? jsonValue(value) : undefined),
    (path, value) => {
      path.scale = value as IRPathScale;
    },
  ),
  fillRule: defineSimplePathChannel<'nonzero' | 'evenodd'>(
    'fillRule',
    { outputKind: 'symbol', palette: [...fillRuleValues] },
    value => (typeof value === 'string' && fillRuleValues.has(value) ? (value as 'nonzero' | 'evenodd') : undefined),
    (path, value) => {
      path.style = { ...path.style, fillRule: value };
    },
  ),
  thickness: defineSimplePathChannel<PathThickness>(
    'thickness',
    { outputKind: 'symbol', palette: [...thicknessValues] },
    pathThicknessValue,
    (path, value) => {
      if (path.style?.strokeWidth === undefined) path.style = { ...path.style, strokeWidth: THICKNESS_TO_WIDTH[value] };
    },
  ),
  dashPattern: defineSimplePathChannel<Array<number>>(
    'dashPattern',
    { outputKind: 'array' },
    dashPatternValue,
    (path, value) => {
      path.style = { ...path.style, dashPattern: value };
    },
  ),
  shadow: defineSimplePathChannel<JsonValue>(
    'shadow',
    { outputKind: 'json' },
    value =>
      typeof value === 'string' && shadowPresetValues.has(value)
        ? value
        : DropShadowSchema.safeParse(value).success
          ? jsonValue(value)
          : undefined,
    (path, value) => {
      path.style = { ...path.style, shadow: value as never };
    },
  ),
  blendMode: defineSimplePathChannel<string>(
    'blendMode',
    { outputKind: 'symbol', palette: [...blendModeValues] },
    value => (typeof value === 'string' && blendModeValues.has(value) ? value : undefined),
    (path, value) => {
      path.style = { ...path.style, blendMode: value as never };
    },
  ),
};

/** 允许直接交付到 core Path 的内置通道名集合 */
export const BUILTIN_PATH_CHANNELS = {
  ...pathNumericChannels,
  ...directPathChannels,
  lineCap: definePathChannel<'butt' | 'round' | 'square'>({
    channel: 'lineCap',
    output: { outputKind: 'symbol', palette: [...lineCapValues] },
    resolve: (ctx, mark) => {
      return makeMarkValueResolver<'butt' | 'round' | 'square'>(markChannelEncoding(mark, 'lineCap'), ctx.model, {
        channelName: 'lineCap',
        parse: value =>
          typeof value === 'string' && lineCapValues.has(value) ? (value as 'butt' | 'round' | 'square') : undefined,
      });
    },
    deliver: (path, value) => {
      path.style = { ...path.style, lineCap: value };
    },
  }),
  lineJoin: definePathChannel<'miter' | 'round' | 'bevel'>({
    channel: 'lineJoin',
    output: { outputKind: 'symbol', palette: [...lineJoinValues] },
    resolve: (ctx, mark) => {
      return makeMarkValueResolver<'miter' | 'round' | 'bevel'>(markChannelEncoding(mark, 'lineJoin'), ctx.model, {
        channelName: 'lineJoin',
        parse: value =>
          typeof value === 'string' && lineJoinValues.has(value) ? (value as 'miter' | 'round' | 'bevel') : undefined,
      });
    },
    deliver: (path, value) => {
      path.style = { ...path.style, lineJoin: value };
    },
  }),
};

const erasePathChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Path 通道 definition 集合 */
export const PATH_CHANNELS: ReadonlyArray<AnyChannelDefinition> = [
  ...Object.values(BUILTIN_PATH_CHANNELS).map(def => erasePathChannelDefinition(def)),
  ...(['width', 'endWidth'] as const).map((target): AnyChannelDefinition => ({
    channel: `geometry.${target}`,
    kind: ChannelDefinitionKind.Mark,
    resolve: (context, mark) => {
      if (!isBuiltinMark(mark) || mark.type !== 'relation' || mark.properties.geometry.kind !== 'ribbon')
        return undefined;
      const binding = mark.encodings?.geometry?.[target];
      const fixed = mark.properties.geometry[target];
      if (binding === undefined) return fixed === undefined ? undefined : { resolver: () => fixed };
      const resolution = resolveNumericChannel(
        context.node,
        context.rows,
        context.model,
        binding,
        `geometry.${target}`,
      );
      if (resolution === undefined) return undefined;
      return {
        resolver: row => {
          const width = resolution.resolver(row);
          if (width === undefined || !Number.isFinite(width) || width <= 0)
            throw new RetikzPlotError(`Relation geometry.${target} must map to a positive finite width`);
          return width;
        },
      };
    },
  })),
];
