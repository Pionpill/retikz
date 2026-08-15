import type { IRAxisScale, IRBoundary, IRBoxSize, IRBoxSpacing, IRFont, IRShapeValue, JsonValue } from '@retikz/core';
import type { DataFieldTypeMap, ExternalRow } from '@retikz/data';

import {
  AxisScaleSchema,
  BoundarySchema,
  BoxSizeSchema,
  BoxSpacingSchema,
  DropShadowSchema,
  FontSchema,
  JsonValueSchema,
  ShapeRefSchema,
} from '@retikz/core';
import { inferCategoryDomain, inferFieldType, resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type {
  AnyChannelDefinition,
  ChannelResolution,
  NodeChannelDefinition,
  NodeChannelDefinitionResolveContext,
} from '../../../contract';
import type {
  IRPlotLinearScale,
  IRPlotMarkOperation,
  IRPlotPointNumberStyle,
  IRPlotSpec,
  IRPlotSqrtScale,
} from '../../../schemas';

import { defineNodeChannel, isBuiltinScaleOperation } from '../../../contract';
import { MarkValueKind, PlotScale } from '../../../schemas';
import { resolveLinearScale, resolveSqrtScale } from '../../scale';
import { PLOT_SHAPE_PALETTE } from '../../theme';
import { makeMarkValueResolver } from '../shared';

/** opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言 */
export const OPACITY_MIN = 0.2;

/** strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框 */
export const STROKE_WIDTH_MIN = 0.5;
/** 数值描边宽度通道的默认最大输出值 */
export const STROKE_WIDTH_MAX = 4;

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
export const SIZE_MIN_RADIUS = 2;
/** size 通道自动半径映射的默认最大值 */
export const SIZE_MAX_RADIUS = 20;

/** 数值 Node 通道 resolver 的 range、clamp 与整数化选项 */
export type NumericNodeResolverOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
  integer?: boolean;
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
const positiveNumber = (value: unknown): number | undefined => (isFiniteNumber(value) && value > 0 ? value : undefined);
const nonnegativeNumber = (value: unknown): number | undefined =>
  isFiniteNumber(value) && value >= 0 ? value : undefined;
const boxSpacingValue = (value: unknown): number | IRBoxSpacing | undefined => {
  if (isFiniteNumber(value) && value >= 0) return value;
  const result = BoxSpacingSchema.safeParse(value);
  return result.success ? result.data : undefined;
};
const axisScaleValue = (value: unknown): number | IRAxisScale | undefined => {
  if (isFiniteNumber(value) && value > 0) return value;
  const result = AxisScaleSchema.safeParse(value);
  return result.success ? result.data : undefined;
};
const boxSizeValue = (value: unknown): number | IRBoxSize | undefined => {
  if (isFiniteNumber(value) && value >= 0) return value;
  const result = BoxSizeSchema.safeParse(value);
  return result.success ? result.data : undefined;
};
const booleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};
const dashPatternValue = (value: unknown): Array<number> | undefined =>
  Array.isArray(value) && value.length > 0 && value.every(item => isFiniteNumber(item) && item >= 0)
    ? value
    : undefined;
const schemaValue =
  <T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }) =>
  (value: unknown): T | undefined => {
    const result = schema.safeParse(value);
    return result.success ? result.data : undefined;
  };

const defineSimpleNodeChannel = <T extends JsonValue>(
  channel: string,
  output: NodeChannelDefinition<T>['output'],
  parse: (value: unknown) => T | undefined,
  deliver: NodeChannelDefinition<T>['deliver'],
): NodeChannelDefinition<T> =>
  defineNodeChannel<T>({
    channel,
    output,
    resolve: ctx => mark =>
      makeMarkValueResolver<T>(pickStyleChannel<T>(mark, channel), ctx.fieldTypes, {
        channelName: channel,
        parse,
      }),
    deliver,
  });

/**
 * 解析数值 Node 通道字段 → 行→数值（opacity / strokeWidth / fillOpacity / rotate / padding / zIndex… 共享基型）
 * @description field 变体若给 scale 或默认 range，则过 linear scale；否则直接使用字段原始有限数。
 *   非 continuous 字段（temporal / categorical）fail-loud；constant 变体由 nodeDefault / node 本身处理，不在这里产 resolver
 */
export const makeNumericNodeResolver = (
  node: IRPlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: DataFieldTypeMap,
  pick: (mark: IRPlotMarkOperation) => MarkStyleValue<number> | undefined,
  channelName: string,
  options: NumericNodeResolverOptions = {},
): ((mark: IRPlotMarkOperation) => ChannelResolution<number> | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: IRPlotMarkOperation): ChannelResolution<number> | undefined => {
    const channel = pick(mark);
    if (!channel) return undefined;
    const source = makeMarkValueResolver<number>(channel, fieldTypes, {
      channelName,
      expectedFieldType: DataFieldType.Continuous,
      parse: value => (isFiniteNumber(value) ? value : undefined),
      constants: 'skip',
    });
    if (!source) return undefined;
    const field = source.field;
    if (field === undefined) return undefined;
    const fieldType = source.fieldType;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    const scaleName = channel.kind === MarkValueKind.Field ? channel.scale : undefined;
    let scale: ((value: number) => number) | undefined;
    if (scaleName !== undefined || options.range !== undefined) {
      let def: IRPlotLinearScale = {
        type: PlotScale.Linear,
        name: scaleName ?? `__${channelName}_${field}`,
        ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}),
        ...(options.clamp !== undefined ? { clamp: options.clamp } : {}),
      };
      if (scaleName !== undefined) {
        const found = scaleByName.get(scaleName);
        if (!found) throw new Error(`lowerPlots: ${channelName} node channel references unknown scale "${scaleName}"`);
        if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Linear)
          throw new Error(`lowerPlots: ${channelName} node channel scale "${scaleName}" must be a linear scale`);
        def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
      }
      scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
    }
    const domain: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    const descriptor =
      channelName === 'opacity' && options.range !== undefined
        ? {
            channel: 'opacity' as const,
            scaleType: PlotScale.Linear,
            domain,
            range: [options.range[0], options.range[1]],
            field,
            fieldType,
          }
        : undefined;
    return {
      resolver: row => {
        const value = source.resolver(row);
        if (value === undefined) return undefined;
        const next = scale ? scale(value) : value;
        return options.integer ? Math.trunc(next) : next;
      },
      descriptor,
    };
  };
};

/**
 * size 通道解析：行 → 半径（px）
 * @description 读取 mark 上结构化的 size 字段。常量 value 直接作最终半径（绕过 scale）；字段过 sqrt 半径 scale
 *   （显式 sqrt scale 引用或自动合成），domain 默认 [0, maxPositive]、range [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]。
 *   边界：无正值 → 全 SIZE_MIN_RADIUS；单正值 → range 上界；负值 fail-loud。
 */
export const resolveSizeChannel = (
  ctx: NodeChannelDefinitionResolveContext,
): ((mark: IRPlotMarkOperation) => ChannelResolution<number> | undefined) => {
  const { node, rows, fieldTypes } = ctx;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: IRPlotMarkOperation): ChannelResolution<number> | undefined => {
    const channel = pickStyleChannel<number>(mark, 'size');
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const radius = channel.value;
      return { resolver: () => radius };
    }
    const field = channel.value;
    const hasAuthoritativeType =
      ctx.fieldTypeEvidence?.has(field) ??
      node.data.model?.some(
        candidate => candidate.name === field && (candidate.type !== undefined || candidate.format !== undefined),
      ) ??
      false;
    const hasUsableObservation = rows.some(row => {
      const value = resolveFieldPath(row, field);
      return typeof value === 'number' ? isFiniteNumber(value) : value !== undefined && value !== null;
    });
    const effectiveFieldType = hasAuthoritativeType
      ? fieldTypes.get(field)
      : hasUsableObservation
        ? inferFieldType(rows, field)
        : undefined;
    if (effectiveFieldType !== undefined && effectiveFieldType !== DataFieldType.Continuous) {
      throw new Error(
        `lowerPlots: size channel field "${field}" is ${effectiveFieldType}; size requires a continuous field`,
      );
    }
    const scaleName = channel.scale ?? `__size_${field}`;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    if (numeric.some(value => value < 0)) {
      throw new Error(
        `lowerPlots: size channel field "${field}" has negative values; size requires non-negative magnitudes`,
      );
    }
    const positives = numeric.filter(value => value > 0);
    const maxPositive = positives.length === 0 ? 0 : Math.max(...positives);
    let def: IRPlotSqrtScale = {
      type: PlotScale.Sqrt,
      name: scaleName,
      domain: [0, maxPositive],
      range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS],
    };
    let hasAuthoredDomain = false;
    if (channel.scale !== undefined) {
      const found = scaleByName.get(channel.scale);
      if (!found) throw new Error(`lowerPlots: size channel references unknown scale "${channel.scale}"`);
      if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Sqrt)
        throw new Error(
          `lowerPlots: size channel scale "${channel.scale}" must be a sqrt scale (size is a radius / area-perceptual channel)`,
        );
      hasAuthoredDomain = found.domain !== undefined;
      def = {
        ...found,
        domain: found.domain ?? [0, maxPositive],
        range: found.range ?? [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS],
      };
    }
    const resolvedScale = resolveSqrtScale(def, numeric, [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]);
    const domain = resolvedScale.domain();
    const resolvedRange = resolvedScale.range();
    const usesDerivedMinimum = !hasAuthoredDomain && positives.length === 0;
    const range = usesDerivedMinimum ? [resolvedRange[0], resolvedRange[0]] : resolvedRange;
    const scale = usesDerivedMinimum ? (): number => range[0] : resolvedScale;
    return {
      resolver: row => {
        const value = resolveFieldPath(row, field);
        return isFiniteNumber(value) && value >= 0 ? scale(value) : undefined;
      },
      descriptor: {
        channel: 'size',
        scaleType: PlotScale.Sqrt,
        domain: [...domain],
        range: [...range],
        field,
        fieldType: effectiveFieldType,
        scaleName,
      },
    };
  };
};

/**
 * shape 通道解析：行 → shape 值
 * @description 读取 mark 上结构化的 shape 字段。常量 value 直用；categorical 字段按 domain 索引从有效 shape palette
 *   循环取值。非 categorical 字段 fail-loud（形状是分类编码）
 */
export const resolveShapeChannel = (
  ctx: NodeChannelDefinitionResolveContext,
): ((mark: IRPlotMarkOperation) => ChannelResolution<JsonValue> | undefined) => {
  const { rows, fieldTypes } = ctx;
  return (mark: IRPlotMarkOperation): ChannelResolution<JsonValue> | undefined => {
    const channel = pickStyleChannel<IRShapeValue>(mark, 'shape');
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const shape = channel.value;
      if (typeof shape !== 'string' && !ShapeRefSchema.safeParse(shape).success) return undefined;
      return { resolver: () => shape };
    }
    const field = channel.value;
    const fieldType = fieldTypes.get(field);
    if (fieldType !== undefined && fieldType !== DataFieldType.Categorical) {
      throw new Error(`lowerPlots: shape channel field "${field}" is ${fieldType}; shape requires a categorical field`);
    }
    const values = rows.map(row => resolveFieldPath(row, field));
    const domain = inferCategoryDomain(values);
    const palette = ctx.palette?.shape ?? PLOT_SHAPE_PALETTE;
    const shapes = domain.map((_, index) => structuredClone(palette[index % palette.length]));
    const shapeByCategory = new Map(domain.map((category, index) => [category, shapes[index]] as const));
    return {
      resolver: row => {
        const value = resolveFieldPath(row, field);
        return typeof value === 'string' || typeof value === 'number' ? shapeByCategory.get(value) : undefined;
      },
      // shape legend：每类别一形状 swatch，domain = 类别序、range = 对应形状名
      descriptor: { channel: 'shape', scaleType: PlotScale.Ordinal, domain, range: shapes, field, fieldType },
    };
  };
};

const numericNodeChannels: {
  opacity: NodeChannelDefinition<number>;
  fillOpacity: NodeChannelDefinition<number>;
  strokeOpacity: NodeChannelDefinition<number>;
  rotate: NodeChannelDefinition<number>;
  zIndex: NodeChannelDefinition<number>;
  strokeWidth: NodeChannelDefinition<number>;
} = {
  opacity: defineNodeChannel<number>({
    channel: 'opacity',
    output: { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    legend: 'ramp',
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'opacity'),
        'opacity',
        { range: [OPACITY_MIN, 1], clamp: true },
      ),
    deliver: (node, value) => {
      node.opacity = value;
    },
  }),
  fillOpacity: defineNodeChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'fillOpacity'),
        'fillOpacity',
        { range: [0.2, 1], clamp: true },
      ),
    deliver: (node, value) => {
      node.fillOpacity = value;
    },
  }),
  strokeOpacity: defineNodeChannel<number>({
    channel: 'strokeOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'strokeOpacity'),
        'strokeOpacity',
        { range: [0.2, 1], clamp: true },
      ),
    deliver: (node, value) => {
      node.strokeOpacity = value;
    },
  }),
  rotate: defineNodeChannel<number>({
    channel: 'rotate',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'rotate'),
        'rotate',
      ),
    deliver: (node, value) => {
      node.rotate = value;
    },
  }),
  zIndex: defineNodeChannel<number>({
    channel: 'zIndex',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'zIndex'),
        'zIndex',
        { integer: true },
      ),
    deliver: (node, value) => {
      node.zIndex = value;
    },
  }),
  strokeWidth: defineNodeChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: ctx =>
      makeNumericNodeResolver(
        ctx.node,
        ctx.rows,
        ctx.fieldTypes,
        mark => pickStyleChannel<number>(mark, 'strokeWidth'),
        'strokeWidth',
        { range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
      ),
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph' || context.nodeKind === 'cell') node.strokeWidth = value;
    },
  }),
};

const textAlignValues = new Set(['start', 'middle', 'end']);
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
const shadowPresetValues = new Set(['none', 'sm', 'md', 'lg', 'xl', '2xl']);

const directNodeChannels = {
  align: defineSimpleNodeChannel<'start' | 'middle' | 'end'>(
    'align',
    { outputKind: 'symbol', palette: [...textAlignValues] },
    value =>
      typeof value === 'string' && textAlignValues.has(value) ? (value as 'start' | 'middle' | 'end') : undefined,
    (node, value) => {
      node.align = value;
    },
  ),
  lineHeight: defineSimpleNodeChannel<number>(
    'lineHeight',
    { outputKind: 'number', range: [0, 0] },
    positiveNumber,
    (node, value) => {
      node.lineHeight = value;
    },
  ),
  maxTextWidth: defineSimpleNodeChannel<number>(
    'maxTextWidth',
    { outputKind: 'number', range: [0, 0] },
    positiveNumber,
    (node, value) => {
      node.maxTextWidth = value;
    },
  ),
  cornerRadius: defineSimpleNodeChannel<number>(
    'cornerRadius',
    { outputKind: 'number', range: [0, 0] },
    nonnegativeNumber,
    (node, value) => {
      node.cornerRadius = value;
    },
  ),
  scale: defineSimpleNodeChannel<JsonValue>(
    'scale',
    { outputKind: 'json' },
    value => axisScaleValue(value),
    (node, value) => {
      node.scale = value as number | IRAxisScale;
    },
  ),
  minimumSize: defineSimpleNodeChannel<JsonValue>(
    'minimumSize',
    { outputKind: 'json' },
    value => boxSizeValue(value),
    (node, value) => {
      node.minimumSize = value as number | IRBoxSize;
    },
  ),
  padding: defineSimpleNodeChannel<JsonValue>(
    'padding',
    { outputKind: 'json' },
    value => boxSpacingValue(value),
    (node, value) => {
      node.padding = value as number | IRBoxSpacing;
    },
  ),
  margin: defineSimpleNodeChannel<JsonValue>(
    'margin',
    { outputKind: 'json' },
    value => boxSpacingValue(value),
    (node, value) => {
      node.margin = value as number | IRBoxSpacing;
    },
  ),
  dashed: defineSimpleNodeChannel<boolean>('dashed', { outputKind: 'boolean' }, booleanValue, (node, value) => {
    node.dashed = value;
  }),
  dotted: defineSimpleNodeChannel<boolean>('dotted', { outputKind: 'boolean' }, booleanValue, (node, value) => {
    node.dotted = value;
  }),
  dashPattern: defineSimpleNodeChannel<Array<number>>(
    'dashPattern',
    { outputKind: 'array' },
    dashPatternValue,
    (node, value) => {
      node.dashPattern = value;
    },
  ),
  font: defineSimpleNodeChannel<JsonValue>(
    'font',
    { outputKind: 'object' },
    value => schemaValue<IRFont>(FontSchema)(value),
    (node, value) => {
      node.font = value as IRFont;
    },
  ),
  boundary: defineSimpleNodeChannel<JsonValue>(
    'boundary',
    { outputKind: 'json' },
    value => schemaValue<IRBoundary>(BoundarySchema)(value),
    (node, value) => {
      node.boundary = value as IRBoundary;
    },
  ),
  shadow: defineSimpleNodeChannel<JsonValue>(
    'shadow',
    { outputKind: 'json' },
    value =>
      typeof value === 'string' && shadowPresetValues.has(value)
        ? value
        : DropShadowSchema.safeParse(value).success
          ? jsonValue(value)
          : undefined,
    (node, value) => {
      node.shadow = value as never;
    },
  ),
  blendMode: defineSimpleNodeChannel<string>(
    'blendMode',
    { outputKind: 'symbol', palette: [...blendModeValues] },
    value => (typeof value === 'string' && blendModeValues.has(value) ? value : undefined),
    (node, value) => {
      node.blendMode = value as never;
    },
  ),
};

const textColorNodeChannel: NodeChannelDefinition<string> = defineNodeChannel<string>({
  channel: 'textColor',
  output: { outputKind: 'color' },
  resolve: ctx => mark =>
    makeMarkValueResolver<string>(pickStyleChannel<string>(mark, 'textColor'), ctx.fieldTypes, {
      channelName: 'textColor',
      parse: value => (typeof value === 'string' ? value : undefined),
      constants: 'skip',
    }),
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointText') node.textColor = value;
  },
});

const sizeNodeChannel: NodeChannelDefinition<number> = defineNodeChannel<number>({
  channel: 'size',
  output: { outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] },
  legend: 'size',
  resolve: resolveSizeChannel,
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointGlyph') node.minimumSize = value * Math.SQRT2;
  },
});

const shapeNodeChannel: NodeChannelDefinition<JsonValue> = defineNodeChannel<JsonValue>({
  channel: 'shape',
  output: { outputKind: 'symbol', palette: [...PLOT_SHAPE_PALETTE] },
  legend: 'symbol',
  resolve: resolveShapeChannel,
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointGlyph') node.shape = value as IRShapeValue;
  },
});

/** 内置 Node 通道 definition 的按名称索引类型。 */
export type BuiltinNodeChannels = {
  opacity: NodeChannelDefinition<number>;
  fillOpacity: NodeChannelDefinition<number>;
  strokeOpacity: NodeChannelDefinition<number>;
  rotate: NodeChannelDefinition<number>;
  zIndex: NodeChannelDefinition<number>;
  textColor: NodeChannelDefinition<string>;
  size: NodeChannelDefinition<number>;
  shape: NodeChannelDefinition<JsonValue>;
  strokeWidth: NodeChannelDefinition<number>;
} & typeof directNodeChannels;

/**
 * 内置 Node 通道定义：scale 管数学、node channel 管输出空间 + 默认范围 + legend 形态。
 * @description 内置和自定义通道在 lowering 前合并进同一个 registry；差别只在 definition 来源。
 */
export const BUILTIN_NODE_CHANNELS: BuiltinNodeChannels = {
  ...numericNodeChannels,
  ...directNodeChannels,
  textColor: textColorNodeChannel,
  size: sizeNodeChannel,
  shape: shapeNodeChannel,
};

const eraseNodeChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Node 通道 definition 集合。 */
export const NODE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_NODE_CHANNELS).map(def =>
  eraseNodeChannelDefinition(def),
);
