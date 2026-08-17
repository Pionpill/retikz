import type { IRPathScale, JsonValue } from '@retikz/core';
import type { PathThicknessValue } from '@retikz/core';
import type { DataFieldTypeMap, ExternalRow } from '@retikz/data';

import { DropShadowSchema, JsonValueSchema, PathScaleSchema, PathThickness, THICKNESS_TO_WIDTH } from '@retikz/core';
import { resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { AnyChannelDefinition, ChannelResolution, PathChannelDefinition } from '../../../contract';
import type { IRPlot, IRPlotLinearScale, IRPlotMarkOperation, IRPlotPointNumberStyle } from '../../../schemas';

import { definePathChannel, isBuiltinScaleOperation } from '../../../contract';
import { MarkValueKind, PlotScale } from '../../../schemas';
import { resolveLinearScale } from '../../scale';
import { makeMarkValueResolver } from '../shared';
import { OPACITY_MIN, STROKE_WIDTH_MAX, STROKE_WIDTH_MIN } from './node';

type NumericPathResolverOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
};

type MarkStyleValue<T> =
  | Extract<IRPlotPointNumberStyle, { kind: typeof MarkValueKind.Field }>
  | (Omit<Extract<IRPlotPointNumberStyle, { kind: typeof MarkValueKind.Constant }>, 'value'> & { value: T });

const isMarkStyleValue = <T>(value: unknown): value is MarkStyleValue<T> =>
  value !== null &&
  typeof value === 'object' &&
  ((value as { kind?: unknown }).kind === MarkValueKind.Field ||
    (value as { kind?: unknown }).kind === MarkValueKind.Constant) &&
  'value' in value;

const pickStyleChannel = <T>(mark: IRPlotMarkOperation, channel: string): MarkStyleValue<T> | undefined => {
  const value = (mark as Record<string, unknown>)[channel];
  return isMarkStyleValue<T>(value) ? value : undefined;
};

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
    resolve: ctx => mark =>
      makeMarkValueResolver<T>(pickStyleChannel<T>(mark, channel), ctx.fieldTypes, {
        channelName: channel,
        parse,
      }),
    deliver,
  });

const makeNumericPathResolver = (
  node: IRPlot,
  rows: Array<ExternalRow>,
  fieldTypes: DataFieldTypeMap,
  pick: (mark: IRPlotMarkOperation) => MarkStyleValue<number> | undefined,
  channelName: string,
  options: NumericPathResolverOptions = {},
): ((mark: IRPlotMarkOperation) => ChannelResolution<number> | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return mark => {
    const channel = pick(mark);
    if (!channel) return undefined;
    const source = makeMarkValueResolver<number>(channel, fieldTypes, {
      channelName,
      expectedFieldType: DataFieldType.Continuous,
      parse: value => (isFiniteNumber(value) ? value : undefined),
    });
    if (!source) return undefined;
    if (source.field === undefined) return source;

    const numeric = rows.map(row => resolveFieldPath(row, source.field as string)).filter(isFiniteNumber);
    const scaleName = channel.kind === MarkValueKind.Field ? channel.scale : undefined;
    let scale: ((value: number) => number) | undefined;
    if (scaleName !== undefined || options.range !== undefined) {
      let def: IRPlotLinearScale = {
        type: PlotScale.Linear,
        name: scaleName ?? `__path_${channelName}_${source.field}`,
        ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}),
        ...(options.clamp !== undefined ? { clamp: options.clamp } : {}),
      };
      if (scaleName !== undefined) {
        const found = scaleByName.get(scaleName);
        if (!found) throw new Error(`lowerPlots: ${channelName} path channel references unknown scale "${scaleName}"`);
        if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Linear)
          throw new Error(`lowerPlots: ${channelName} path channel scale "${scaleName}" must be a linear scale`);
        def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
      }
      scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
    }
    return {
      resolver: row => {
        const value = source.resolver(row);
        if (value === undefined) return undefined;
        return scale ? scale(value) : value;
      },
      descriptor: source.descriptor,
    };
  };
};

const pickPathStrokeWidth = (mark: IRPlotMarkOperation): MarkStyleValue<number> | undefined =>
  pickStyleChannel<number>(mark, 'strokeWidth');

const pickPathOpacity = (mark: IRPlotMarkOperation): MarkStyleValue<number> | undefined =>
  pickStyleChannel<number>(mark, 'opacity');

const pickPathFillOpacity = (mark: IRPlotMarkOperation): MarkStyleValue<number> | undefined =>
  pickStyleChannel<number>(mark, 'fillOpacity');

const pathNumericChannels: {
  strokeWidth: PathChannelDefinition<number>;
  opacity: PathChannelDefinition<number>;
  fillOpacity: PathChannelDefinition<number>;
  roundedCorners: PathChannelDefinition<number>;
} = {
  strokeWidth: definePathChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: ctx =>
      makeNumericPathResolver(ctx.node, ctx.rows, ctx.fieldTypes, pickPathStrokeWidth, 'strokeWidth', {
        range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.strokeWidth = value;
    },
  }),
  opacity: definePathChannel<number>({
    channel: 'opacity',
    output: { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    legend: 'ramp',
    resolve: ctx =>
      makeNumericPathResolver(ctx.node, ctx.rows, ctx.fieldTypes, pickPathOpacity, 'opacity', {
        range: [OPACITY_MIN, 1],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.opacity = value;
    },
  }),
  fillOpacity: definePathChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx =>
      makeNumericPathResolver(ctx.node, ctx.rows, ctx.fieldTypes, pickPathFillOpacity, 'fillOpacity', {
        range: [0.2, 1],
        clamp: true,
      }),
    deliver: (path, value) => {
      path.fillOpacity = value;
    },
  }),
  roundedCorners: definePathChannel<number>({
    channel: 'roundedCorners',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx =>
      makeNumericPathResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'roundedCorners'),
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
const thicknessValues = new Set<PathThicknessValue>(Object.values(PathThickness));
const pathThicknessValue = (value: unknown): PathThicknessValue | undefined =>
  typeof value === 'string' && thicknessValues.has(value as PathThicknessValue)
    ? (value as PathThicknessValue)
    : undefined;
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
      path.strokeOpacity = value;
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
      path.fillRule = value;
    },
  ),
  thickness: defineSimplePathChannel<PathThicknessValue>(
    'thickness',
    { outputKind: 'symbol', palette: [...thicknessValues] },
    pathThicknessValue,
    (path, value) => {
      if (path.strokeWidth === undefined) path.strokeWidth = THICKNESS_TO_WIDTH[value];
    },
  ),
  dashPattern: defineSimplePathChannel<Array<number>>(
    'dashPattern',
    { outputKind: 'array' },
    dashPatternValue,
    (path, value) => {
      path.dashPattern = value;
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
      path.shadow = value as never;
    },
  ),
  blendMode: defineSimplePathChannel<string>(
    'blendMode',
    { outputKind: 'symbol', palette: [...blendModeValues] },
    value => (typeof value === 'string' && blendModeValues.has(value) ? value : undefined),
    (path, value) => {
      path.blendMode = value as never;
    },
  ),
};

/** 允许直接交付到 core Path 的内置通道名集合。 */
export const BUILTIN_PATH_CHANNELS = {
  ...pathNumericChannels,
  ...directPathChannels,
  lineCap: definePathChannel<'butt' | 'round' | 'square'>({
    channel: 'lineCap',
    output: { outputKind: 'symbol', palette: [...lineCapValues] },
    resolve: ctx => mark => {
      return makeMarkValueResolver<'butt' | 'round' | 'square'>(
        pickStyleChannel<'butt' | 'round' | 'square'>(mark, 'lineCap'),
        ctx.fieldTypes,
        {
          channelName: 'lineCap',
          parse: value =>
            typeof value === 'string' && lineCapValues.has(value) ? (value as 'butt' | 'round' | 'square') : undefined,
        },
      );
    },
    deliver: (path, value) => {
      path.lineCap = value;
    },
  }),
  lineJoin: definePathChannel<'miter' | 'round' | 'bevel'>({
    channel: 'lineJoin',
    output: { outputKind: 'symbol', palette: [...lineJoinValues] },
    resolve: ctx => mark => {
      return makeMarkValueResolver<'miter' | 'round' | 'bevel'>(
        pickStyleChannel<'miter' | 'round' | 'bevel'>(mark, 'lineJoin'),
        ctx.fieldTypes,
        {
          channelName: 'lineJoin',
          parse: value =>
            typeof value === 'string' && lineJoinValues.has(value) ? (value as 'miter' | 'round' | 'bevel') : undefined,
        },
      );
    },
    deliver: (path, value) => {
      path.lineJoin = value;
    },
  }),
};

const erasePathChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Path 通道 definition 集合。 */
export const PATH_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_PATH_CHANNELS).map(def =>
  erasePathChannelDefinition(def),
);
