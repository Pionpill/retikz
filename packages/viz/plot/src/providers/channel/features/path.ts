import type { IRPathScale } from '@retikz/core';
import {
  PathLineCap,
  PathLineJoin,
  PathFillRule,
  ShadowPreset,
  BlendMode,
  DropShadowSchema,
  PathScaleSchema,
} from '@retikz/core';
import type { JsonValue } from '@retikz/foundation';
import { JsonValueSchema } from '@retikz/foundation';
import { isFiniteNumber } from '@retikz/math';

import type { AnyChannelDefinition, PathChannelDefinition } from '../../../contract';
import { ChannelDefinitionKind, markChannelEncoding, channelScale, definePathChannel } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotMark, IRPlotChannel } from '../../../schemas';
import { createMarkValueResolver, resolveNumericChannel } from '../shared';
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
    resolve: (ctx, mark) => {
      const encoding = markChannelEncoding(mark, channel);
      if (encoding !== undefined && channelScale(encoding) !== undefined && output.outputKind === 'number') {
        const resolution = resolveNumericChannel(ctx, encoding, channel);
        if (resolution === undefined) return undefined;
        return {
          ...resolution,
          resolver: row => {
            const value = resolution.resolver(row);
            if (value === undefined) return undefined;
            const parsed = parse(value);
            if (parsed === undefined) throw new RetikzPlotError(`${channel} scale produced an invalid value`);
            return parsed;
          },
        };
      }
      return createMarkValueResolver<T>(encoding, ctx.model, {
        channelName: channel,
        parse,
      });
    },
    deliver,
  });

const pickPathStrokeWidth = (mark: IRPlotMark): IRPlotChannel | undefined => markChannelEncoding(mark, 'strokeWidth');

const pickPathOpacity = (mark: IRPlotMark): IRPlotChannel | undefined => markChannelEncoding(mark, 'opacity');

const pickPathFillOpacity = (mark: IRPlotMark): IRPlotChannel | undefined => markChannelEncoding(mark, 'fillOpacity');

const pathNumericChannels: {
  strokeWidth: PathChannelDefinition<number>;
  opacity: PathChannelDefinition<number>;
  fillOpacity: PathChannelDefinition<number>;
  cornerRadius: PathChannelDefinition<number>;
} = {
  strokeWidth: definePathChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericChannel(ctx, pickPathStrokeWidth(mark), 'strokeWidth', {
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
      resolveNumericChannel(ctx, pickPathOpacity(mark), 'opacity', {
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
      resolveNumericChannel(ctx, pickPathFillOpacity(mark), 'fillOpacity', {
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
  cornerRadius: definePathChannel<number>({
    channel: 'cornerRadius',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: (ctx, mark) => resolveNumericChannel(ctx, markChannelEncoding(mark, 'cornerRadius'), 'cornerRadius'),
    deliver: (path, value) => {
      path.cornerRadius = value;
    },
  }),
};

const lineCapValues: ReadonlySet<string> = new Set(Object.values(PathLineCap));

const lineJoinValues: ReadonlySet<string> = new Set(Object.values(PathLineJoin));

const fillRuleValues: ReadonlySet<string> = new Set(Object.values(PathFillRule));

const shadowPresetValues: ReadonlySet<string> = new Set(Object.values(ShadowPreset));

const blendModeValues: ReadonlySet<string> = new Set(Object.values(BlendMode));

const directPathChannels = {
  dashOffset: defineSimplePathChannel<number>(
    'dashOffset',
    { outputKind: 'number', range: [0, 0] },
    value => (isFiniteNumber(value) ? value : undefined),
    (path, value) => {
      path.style = { ...path.style, dashOffset: value };
    },
  ),

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
  fillRule: defineSimplePathChannel<PathFillRule>(
    'fillRule',
    { outputKind: 'symbol', palette: [...fillRuleValues] },
    value => (typeof value === 'string' && fillRuleValues.has(value) ? (value as PathFillRule) : undefined),
    (path, value) => {
      path.style = { ...path.style, fillRule: value };
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
  lineCap: definePathChannel<PathLineCap>({
    channel: 'lineCap',
    output: { outputKind: 'symbol', palette: [...lineCapValues] },
    resolve: (ctx, mark) => {
      return createMarkValueResolver<PathLineCap>(markChannelEncoding(mark, 'lineCap'), ctx.model, {
        channelName: 'lineCap',
        parse: value => (typeof value === 'string' && lineCapValues.has(value) ? (value as PathLineCap) : undefined),
      });
    },
    deliver: (path, value) => {
      path.style = { ...path.style, lineCap: value };
    },
  }),
  lineJoin: definePathChannel<PathLineJoin>({
    channel: 'lineJoin',
    output: { outputKind: 'symbol', palette: [...lineJoinValues] },
    resolve: (ctx, mark) => {
      return createMarkValueResolver<PathLineJoin>(markChannelEncoding(mark, 'lineJoin'), ctx.model, {
        channelName: 'lineJoin',
        parse: value => (typeof value === 'string' && lineJoinValues.has(value) ? (value as PathLineJoin) : undefined),
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
    channel: `ribbon.${target}`,
    kind: ChannelDefinitionKind.Mark,
    resolve: (context, mark) => {
      if (mark.type !== 'path' || mark.properties?.kind !== 'ribbon') return undefined;
      const binding = mark.encodings.ribbon?.[target];
      if (binding === undefined) return undefined;
      const resolution = resolveNumericChannel(context, binding, `ribbon.${target}`);
      if (resolution === undefined) throw new RetikzPlotError(`Path ribbon.${target} cannot resolve its field`);
      return {
        ...resolution,
        resolver: row => {
          const width = resolution.resolver(row);
          if (width === undefined || !Number.isFinite(width) || width < 0)
            throw new RetikzPlotError(`Path ${mark.id ?? ''} ribbon.${target} must map to a non-negative finite width`);
          return width;
        },
      };
    },
  })),
];
