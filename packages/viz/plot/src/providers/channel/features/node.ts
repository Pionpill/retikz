import type {
  IRContextualColor,
  IRAxisScale,
  IRBoundary,
  IRBoxSize,
  IRBoxSpacing,
  IRFont,
  IRShapeValue,
} from '@retikz/core';
import {
  PathLineCapSchema,
  PathLineJoinSchema,
  PathLineCap,
  PathLineJoin,
  ShadowPreset,
  BlendMode,
  NodeTextAlign,
  ContextualColorSchema,
  AxisScaleSchema,
  BoundarySchema,
  BoxSizeSchema,
  BoxSpacingSchema,
  DropShadowSchema,
  FontSchema,
} from '@retikz/core';
import type { DataTransformModel, ExternalRow } from '@retikz/data';
import { inferCategoryDomain, inferFieldType, resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import type { JsonValue } from '@retikz/foundation';
import { JsonValueSchema } from '@retikz/foundation';
import { isFiniteNumber } from '@retikz/math';

import type {
  AnyChannelDefinition,
  ChannelResolution,
  NodeChannelDefinition,
  NodeChannelDefinitionResolveContext,
} from '../../../contract';
import {
  channelField,
  channelScale,
  markChannelEncoding,
  defineNodeChannel,
  isBuiltinScaleOperation,
} from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlot, IRPlotLinearScale, IRPlotMark, IRPlotChannel, IRPlotSqrtScale } from '../../../schemas';
import { BuiltinPlotScale } from '../../../schemas';
import { resolveLinearScale, resolveSqrtScale } from '../../scale';
import { PLOT_SHAPE_PALETTE } from '../../theme';
import { makeMarkValueResolver, booleanChannelValue } from '../shared';

/** opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言 */
export const OPACITY_MIN = 0.2;

/** strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框 */
export const STROKE_WIDTH_MIN = 0.5;

/** 数值描边宽度通道的默认最大输出值 */
export const STROKE_WIDTH_MAX = 4;

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
const SIZE_MIN_RADIUS = 2;

/** size 通道自动半径映射的默认最大值 */
export const SIZE_MAX_RADIUS = 20;

/** 数值 Node 通道 resolver 的 range、clamp 与整数化选项 */
type NumericNodeResolverOptions = {
  /** 数值尺度的默认输出范围，可由命名尺度覆盖 */
  range?: readonly [number, number];
  /** 数值尺度的默认钳位策略，可由命名尺度覆盖 */
  clamp?: boolean;
  /** 是否将最终数值取整 */
  integer?: boolean;
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
    resolve: (ctx, mark) =>
      makeMarkValueResolver<T>(markChannelEncoding(mark, channel), ctx.model, {
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
export const resolveNumericNodeChannel = (
  node: IRPlot,
  rows: Array<ExternalRow>,
  model: DataTransformModel,
  channel: IRPlotChannel | undefined,
  channelName: string,
  options: NumericNodeResolverOptions = {},
): ChannelResolution<number> | undefined => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  if (!channel) return undefined;

  const source = makeMarkValueResolver<number>(channel, model, {
    channelName,
    expectedFieldType: DataFieldType.Continuous,
    parse: value => (isFiniteNumber(value) ? value : undefined),
  });
  if (!source) return undefined;

  const field = source.field;
  if (field === undefined) return undefined;

  const fieldType = source.fieldType;
  const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
  const scaleName = channelScale(channel);
  let scale: ((value: number) => number) | undefined;
  if (scaleName !== undefined || options.range !== undefined) {
    let def: IRPlotLinearScale = {
      type: BuiltinPlotScale.Linear,
      name: scaleName ?? `__${channelName}_${field}`,
      ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}),
      ...(options.clamp !== undefined ? { clamp: options.clamp } : {}),
    };
    if (scaleName !== undefined) {
      const found = scaleByName.get(scaleName);
      if (!found)
        throw new RetikzPlotError(`lowerPlots: ${channelName} node channel references unknown scale "${scaleName}"`);
      if (!isBuiltinScaleOperation(found) || found.type !== BuiltinPlotScale.Linear)
        throw new RetikzPlotError(
          `lowerPlots: ${channelName} node channel scale "${scaleName}" must be a linear scale`,
        );

      def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
    }

    scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
  }

  const domain: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
  const descriptor =
    channelName === 'opacity' && options.range !== undefined
      ? {
          channel: 'opacity' as const,
          scaleType: BuiltinPlotScale.Linear,
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

/**
 * size 通道解析：行 → 半径（px）
 * @description 读取 mark 上结构化的 size 字段。常量 value 直接作最终半径（绕过 scale）；字段过 sqrt 半径 scale
 *   （显式 sqrt scale 引用或自动合成），domain 默认 [0, maxPositive]、range [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]。
 *   边界：无正值 → 全 SIZE_MIN_RADIUS；单正值 → range 上界；负值 fail-loud
 */
export const resolveSizeChannel = (
  ctx: NodeChannelDefinitionResolveContext,
  mark: IRPlotMark,
): ChannelResolution<number> | undefined => {
  const { node, rows, model } = ctx;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));

  const channel = markChannelEncoding(mark, 'size');
  if (!channel) return undefined;
  const field = channelField(channel);
  const declaredFieldType = model.find(definition => definition.name === field)?.type;
  const hasUsableObservation = rows.some(row => {
    const value = resolveFieldPath(row, field);
    return typeof value === 'number' ? isFiniteNumber(value) : value !== undefined && value !== null;
  });
  const effectiveFieldType =
    declaredFieldType !== undefined
      ? declaredFieldType
      : hasUsableObservation
        ? inferFieldType(rows, field)
        : undefined;
  if (effectiveFieldType !== undefined && effectiveFieldType !== DataFieldType.Continuous) {
    throw new RetikzPlotError(
      `lowerPlots: size channel field "${field}" is ${effectiveFieldType}; size requires a continuous field`,
    );
  }

  const scaleName = channelScale(channel) ?? `__size_${field}`;
  const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
  if (numeric.some(value => value < 0)) {
    throw new RetikzPlotError(
      `lowerPlots: size channel field "${field}" has negative values; size requires non-negative magnitudes`,
    );
  }

  const positives = numeric.filter(value => value > 0);
  const maxPositive = positives.length === 0 ? 0 : Math.max(...positives);
  let def: IRPlotSqrtScale = {
    type: BuiltinPlotScale.Sqrt,
    name: scaleName,
    domain: [0, maxPositive],
    range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS],
  };
  let hasAuthoredDomain = false;
  const explicitScale = channelScale(channel);
  if (explicitScale !== undefined) {
    const found = scaleByName.get(explicitScale);
    if (!found)
      throw new RetikzPlotError(`lowerPlots: size channel references unknown scale "${channelScale(channel)}"`);
    if (!isBuiltinScaleOperation(found) || found.type !== BuiltinPlotScale.Sqrt)
      throw new RetikzPlotError(
        `lowerPlots: size channel scale "${channelScale(channel)}" must be a sqrt scale (size is a radius / area-perceptual channel)`,
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
      scaleType: BuiltinPlotScale.Sqrt,
      domain: [...domain],
      range: [...range],
      field,
      fieldType: effectiveFieldType,
      scaleName,
    },
  };
};

/**
 * shape 通道解析：行 → shape 值
 * @description 读取 mark 上结构化的 shape 字段。常量 value 直用；categorical 字段按 domain 索引从有效 shape palette
 *   循环取值。非 categorical 字段 fail-loud（形状是分类编码）
 */
const resolveShapeChannel = (
  ctx: NodeChannelDefinitionResolveContext,
  mark: IRPlotMark,
): ChannelResolution<JsonValue> | undefined => {
  const { rows, model } = ctx;
  const channel = markChannelEncoding(mark, 'shape');
  if (!channel) return undefined;
  const field = channelField(channel);
  const fieldType = model.find(definition => definition.name === field)?.type;
  if (fieldType !== undefined && fieldType !== DataFieldType.Categorical) {
    throw new RetikzPlotError(
      `lowerPlots: shape channel field "${field}" is ${fieldType}; shape requires a categorical field`,
    );
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
    descriptor: { channel: 'shape', scaleType: BuiltinPlotScale.Ordinal, domain, range: shapes, field, fieldType },
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
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(ctx.node, ctx.rows, ctx.model, markChannelEncoding(mark, 'opacity'), 'opacity', {
        range: [OPACITY_MIN, 1],
        clamp: true,
      }),
    deliver: (node, value) => {
      node.style = {
        ...node.style,
        opacity: {
          ...(typeof node.style?.opacity === 'number' ? { overall: node.style.opacity } : node.style?.opacity),
          overall: value,
        },
      };
    },
  }),
  fillOpacity: defineNodeChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(
        ctx.node,
        ctx.rows,
        ctx.model,
        markChannelEncoding(mark, 'fillOpacity'),
        'fillOpacity',
        { range: [0.2, 1], clamp: true },
      ),
    deliver: (node, value) => {
      node.style = {
        ...node.style,
        opacity: {
          ...(typeof node.style?.opacity === 'number' ? { overall: node.style.opacity } : node.style?.opacity),
          fill: value,
        },
      };
    },
  }),
  strokeOpacity: defineNodeChannel<number>({
    channel: 'strokeOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(
        ctx.node,
        ctx.rows,
        ctx.model,
        markChannelEncoding(mark, 'strokeOpacity'),
        'strokeOpacity',
        { range: [0.2, 1], clamp: true },
      ),
    deliver: (node, value) => {
      node.style = {
        ...node.style,
        opacity: {
          ...(typeof node.style?.opacity === 'number' ? { overall: node.style.opacity } : node.style?.opacity),
          stroke: value,
        },
      };
    },
  }),
  rotate: defineNodeChannel<number>({
    channel: 'rotate',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(ctx.node, ctx.rows, ctx.model, markChannelEncoding(mark, 'rotate'), 'rotate'),
    deliver: (node, value) => {
      node.rotate = value;
    },
  }),
  zIndex: defineNodeChannel<number>({
    channel: 'zIndex',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(ctx.node, ctx.rows, ctx.model, markChannelEncoding(mark, 'zIndex'), 'zIndex', {
        integer: true,
      }),
    deliver: (node, value) => {
      node.zIndex = value;
    },
  }),
  strokeWidth: defineNodeChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: (ctx, mark) =>
      resolveNumericNodeChannel(
        ctx.node,
        ctx.rows,
        ctx.model,
        markChannelEncoding(mark, 'strokeWidth'),
        'strokeWidth',
        { range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
      ),
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph' || context.nodeKind === 'cell')
        node.style = { ...node.style, strokeWidth: value };
    },
  }),
};

const textAlignValues: ReadonlySet<string> = new Set(Object.values(NodeTextAlign));

const blendModeValues: ReadonlySet<string> = new Set(Object.values(BlendMode));

const shadowPresetValues: ReadonlySet<string> = new Set(Object.values(ShadowPreset));

const directNodeChannels = {
  dashOffset: defineSimpleNodeChannel<number>(
    'dashOffset',
    { outputKind: 'number', range: [0, 0] },
    value => (isFiniteNumber(value) ? value : undefined),
    (node, value) => {
      node.style = { ...node.style, dashOffset: value };
    },
  ),
  lineCap: defineSimpleNodeChannel<PathLineCap>(
    'lineCap',
    { outputKind: 'symbol', palette: Object.values(PathLineCap) },
    value => {
      const parsed = PathLineCapSchema.safeParse(value);
      return parsed.success ? parsed.data : undefined;
    },
    (node, value) => {
      node.style = { ...node.style, lineCap: value };
    },
  ),
  lineJoin: defineSimpleNodeChannel<PathLineJoin>(
    'lineJoin',
    { outputKind: 'symbol', palette: Object.values(PathLineJoin) },
    value => {
      const parsed = PathLineJoinSchema.safeParse(value);
      return parsed.success ? parsed.data : undefined;
    },
    (node, value) => {
      node.style = { ...node.style, lineJoin: value };
    },
  ),
  align: defineSimpleNodeChannel<'start' | 'middle' | 'end'>(
    'align',
    { outputKind: 'symbol', palette: [...textAlignValues] },
    value =>
      typeof value === 'string' && textAlignValues.has(value) ? (value as 'start' | 'middle' | 'end') : undefined,
    (node, value) => {
      node.layout = { ...node.layout, align: value };
    },
  ),
  lineHeight: defineSimpleNodeChannel<number>(
    'lineHeight',
    { outputKind: 'number', range: [0, 0] },
    positiveNumber,
    (node, value) => {
      node.layout = { ...node.layout, lineHeight: value };
    },
  ),
  maxTextWidth: defineSimpleNodeChannel<number>(
    'maxTextWidth',
    { outputKind: 'number', range: [0, 0] },
    positiveNumber,
    (node, value) => {
      node.layout = { ...node.layout, maxTextWidth: value };
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
      node.layout = { ...node.layout, minimumSize: value as number | IRBoxSize };
    },
  ),
  padding: defineSimpleNodeChannel<JsonValue>(
    'padding',
    { outputKind: 'json' },
    value => boxSpacingValue(value),
    (node, value) => {
      node.layout = { ...node.layout, padding: value as number | IRBoxSpacing };
    },
  ),
  margin: defineSimpleNodeChannel<JsonValue>(
    'margin',
    { outputKind: 'json' },
    value => boxSpacingValue(value),
    (node, value) => {
      node.layout = { ...node.layout, margin: value as number | IRBoxSpacing };
    },
  ),
  dashed: defineSimpleNodeChannel<boolean>('dashed', { outputKind: 'boolean' }, booleanChannelValue, (node, value) => {
    node.style = { ...node.style, dashed: value };
  }),
  dotted: defineSimpleNodeChannel<boolean>('dotted', { outputKind: 'boolean' }, booleanChannelValue, (node, value) => {
    node.style = { ...node.style, dotted: value };
  }),
  dashPattern: defineSimpleNodeChannel<Array<number>>(
    'dashPattern',
    { outputKind: 'array' },
    dashPatternValue,
    (node, value) => {
      node.style = { ...node.style, dashPattern: value };
    },
  ),
  font: defineSimpleNodeChannel<JsonValue>(
    'font',
    { outputKind: 'object' },
    value => schemaValue<IRFont>(FontSchema)(value),
    (node, value) => {
      node.style = { ...node.style, font: value as IRFont };
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
      node.style = { ...node.style, shadow: value as never };
    },
  ),
  blendMode: defineSimpleNodeChannel<string>(
    'blendMode',
    { outputKind: 'symbol', palette: [...blendModeValues] },
    value => (typeof value === 'string' && blendModeValues.has(value) ? value : undefined),
    (node, value) => {
      node.style = { ...node.style, blendMode: value as never };
    },
  ),
};

const textColorNodeChannel: NodeChannelDefinition<IRContextualColor> = defineNodeChannel<IRContextualColor>({
  channel: 'textColor',
  output: { outputKind: 'color' },
  resolve: (ctx, mark) =>
    makeMarkValueResolver<IRContextualColor>(markChannelEncoding(mark, 'textColor'), ctx.model, {
      channelName: 'textColor',
      parse: value => {
        const parsed = ContextualColorSchema.safeParse(value);
        return parsed.success ? parsed.data : undefined;
      },
    }),
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointText') node.style = { ...node.style, textColor: value };
  },
});

const sizeNodeChannel: NodeChannelDefinition<number> = defineNodeChannel<number>({
  channel: 'size',
  output: { outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] },
  legend: 'size',
  resolve: resolveSizeChannel,
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointGlyph') node.layout = { ...node.layout, minimumSize: value * Math.SQRT2 };
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

/** 内置 Node 通道 definition 的按名称索引类型 */
type BuiltinNodeChannels = {
  /** 映射 Node 整体透明度 */
  opacity: NodeChannelDefinition<number>;
  /** 映射 Node 填充透明度 */
  fillOpacity: NodeChannelDefinition<number>;
  /** 映射 Node 描边透明度 */
  strokeOpacity: NodeChannelDefinition<number>;
  /** 映射 Node 旋转角度 */
  rotate: NodeChannelDefinition<number>;
  /** 映射 Node 的绘制排序层级 */
  zIndex: NodeChannelDefinition<number>;
  /** 映射 Node 文字颜色 */
  textColor: NodeChannelDefinition<IRContextualColor>;
  /** 映射点图元尺寸 */
  size: NodeChannelDefinition<number>;
  /** 映射点图元形状 */
  shape: NodeChannelDefinition<JsonValue>;
  /** 映射 Node 描边宽度 */
  strokeWidth: NodeChannelDefinition<number>;
} & typeof directNodeChannels;

/**
 * 内置 Node 通道定义：scale 管数学、node channel 管输出空间 + 默认范围 + legend 形态
 * @description 内置和自定义通道在 lowering 前合并进同一个 registry；差别只在 definition 来源
 */
export const BUILTIN_NODE_CHANNELS: BuiltinNodeChannels = {
  ...numericNodeChannels,
  ...directNodeChannels,
  textColor: textColorNodeChannel,
  size: sizeNodeChannel,
  shape: shapeNodeChannel,
};

const eraseNodeChannelDefinition = (def: unknown): AnyChannelDefinition => def as AnyChannelDefinition;

/** 内置 Node 通道 definition 集合 */
export const NODE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_NODE_CHANNELS).map(def =>
  eraseNodeChannelDefinition(def),
);
