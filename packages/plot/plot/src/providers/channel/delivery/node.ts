import { isFiniteNumber } from '@retikz/math';
import { BoundarySchema, DropShadowSchema, FontSchema, type IRBoundary, type IRFont, type IRShapeRef, type JsonValue, JsonValueSchema, ShapeRefSchema } from '@retikz/core';
import { type AnyChannelDefinition, type ChannelResolution, type NodeChannelContext, type NodeChannelDefinition, defineNodeChannel, isBuiltinScaleOperation } from '../../../contract';
import { inferCategoryDomain, resolveFieldPath } from '../../data';
import {
  type ExternalRow,
  type LinearScale,
  type MarkOperation,
  type OrdinalScale,
  PlotFieldType,
  type PlotFieldTypeMap,
  PlotScale,
  type PlotSpec,
  type ScaledMarkValueType,
  type SqrtScale,
} from '../../../schemas';
import { resolveOrdinalScale } from '../../scale/color';
import { resolveLinearScale, resolveSqrtScale } from '../../scale/position';
import { makeMarkValueResolver } from '../common';

/** opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言 */
export const OPACITY_MIN = 0.2;

/** strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框 */
export const STROKE_WIDTH_MIN = 0.5;
export const STROKE_WIDTH_MAX = 4;

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
export const SIZE_MIN_RADIUS = 2;
export const SIZE_MAX_RADIUS = 20;

/** shape 通道默认 glyph 调色板（直用 core 内置 shape 名，无 plot-only 别名）；循环复用 */
export const PLOT_SHAPE_PALETTE = ['circle', 'rectangle', 'diamond'] as const;

export type NumericNodeResolverOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
  integer?: boolean;
};

const isScaledMarkValue = <T>(value: unknown): value is ScaledMarkValueType<T> =>
  value !== null &&
  typeof value === 'object' &&
  ((value as { kind?: unknown }).kind === 'field' || (value as { kind?: unknown }).kind === 'constant') &&
  'value' in value;

const pickStyleChannel = <T>(mark: MarkOperation, channel: string): ScaledMarkValueType<T> | undefined => {
  const value = (mark as Record<string, unknown>)[channel];
  return isScaledMarkValue<T>(value) ? value : undefined;
};

const jsonValue = (value: unknown): JsonValue | undefined => (JsonValueSchema.safeParse(value).success ? (value as JsonValue) : undefined);
const positiveNumber = (value: unknown): number | undefined => (isFiniteNumber(value) && value > 0 ? value : undefined);
const nonnegativeNumber = (value: unknown): number | undefined => (isFiniteNumber(value) && value >= 0 ? value : undefined);
const booleanValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};
const dashPatternValue = (value: unknown): Array<number> | undefined =>
  Array.isArray(value) && value.length > 0 && value.every(item => isFiniteNumber(item) && item >= 0) ? value : undefined;
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
 *   非 continuous 字段（temporal / categorical）fail-loud；constant 变体由 nodeDefault / node 本身处理，不在这里产 resolver。
 */
export const makeNumericNodeResolver = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: PlotFieldTypeMap,
  pick: (mark: MarkOperation) => ScaledMarkValueType<number> | undefined,
  channelName: string,
  options: NumericNodeResolverOptions = {},
): ((mark: MarkOperation) => ChannelResolution<number> | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: MarkOperation): ChannelResolution<number> | undefined => {
    const channel = pick(mark);
    if (!channel) return undefined;
    const source = makeMarkValueResolver<number>(channel, fieldTypes, {
      channelName,
      expectedFieldType: PlotFieldType.Continuous,
      parse: value => (isFiniteNumber(value) ? value : undefined),
      constants: 'skip',
    });
    if (!source) return undefined;
    const field = source.field;
    if (field === undefined) return undefined;
    const fieldType = source.fieldType;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    let scale: ((value: number) => number) | undefined;
    if (channel.scale !== undefined || options.range !== undefined) {
      let def: LinearScale = { type: PlotScale.Linear, name: channel.scale ?? `__${channelName}_${field}`, ...(options.range !== undefined ? { range: [options.range[0], options.range[1]] as [number, number] } : {}), ...(options.clamp !== undefined ? { clamp: options.clamp } : {}) };
      if (channel.scale !== undefined) {
        const found = scaleByName.get(channel.scale);
        if (!found) throw new Error(`lowerPlots: ${channelName} node channel references unknown scale "${channel.scale}"`);
        if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Linear) throw new Error(`lowerPlots: ${channelName} node channel scale "${channel.scale}" must be a linear scale`);
        def = { ...found, range: found.range ?? def.range, clamp: found.clamp ?? def.clamp };
      }
      scale = resolveLinearScale(def, numeric, options.range ?? [0, 1]);
    }
    const domain: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    const descriptor =
      channelName === 'opacity' && options.range !== undefined
        ? { channel: 'opacity' as const, scaleType: PlotScale.Linear, domain, range: [options.range[0], options.range[1]], field, fieldType }
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
export const resolveSizeChannel = (ctx: NodeChannelContext): ((mark: MarkOperation) => ChannelResolution<number> | undefined) => {
  const { node, rows, fieldTypes } = ctx;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: MarkOperation): ChannelResolution<number> | undefined => {
    const channel = pickStyleChannel<number>(mark, 'size');
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const radius = channel.value;
      return { resolver: () => radius };
    }
    const field = channel.value;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    if (numeric.some(value => value < 0)) {
      throw new Error(`lowerPlots: size channel field "${field}" has negative values; size requires non-negative magnitudes`);
    }
    const positives = numeric.filter(value => value > 0);
    // 无正值（全 0 / 空）→ 退化为常量最小半径，不建 scale（避免退化 domain）；descriptor 仍给退化 domain 供 legend 不崩
    if (positives.length === 0) {
      return {
        resolver: () => SIZE_MIN_RADIUS,
        descriptor: { channel: 'size', scaleType: PlotScale.Sqrt, domain: [0, 0], range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS], field, fieldType: fieldTypes.get(field) },
      };
    }
    const maxPositive = Math.max(...positives);
    let def: SqrtScale = { type: PlotScale.Sqrt, name: channel.scale ?? `__size_${field}`, domain: [0, maxPositive], range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] };
    if (channel.scale !== undefined) {
      const found = scaleByName.get(channel.scale);
      if (!found) throw new Error(`lowerPlots: size channel references unknown scale "${channel.scale}"`);
      if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Sqrt) throw new Error(`lowerPlots: size channel scale "${channel.scale}" must be a sqrt scale (size is a radius / area-perceptual channel)`);
      def = { ...found, domain: found.domain ?? [0, maxPositive], range: found.range ?? [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] };
    }
    const scale = resolveSqrtScale(def, numeric, [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]);
    // domain/range 取已解析的 def（与逐行 scale 同源）：legend 梯度符号据此选代表值 + 算半径
    const domain = def.domain ?? [0, maxPositive];
    const range = def.range ?? [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS];
    return {
      resolver: row => {
        const value = resolveFieldPath(row, field);
        return isFiniteNumber(value) && value >= 0 ? scale(value) : undefined;
      },
      descriptor: { channel: 'size', scaleType: PlotScale.Sqrt, domain: [...domain], range: [...range], field, fieldType: fieldTypes.get(field) },
    };
  };
};

/**
 * shape 通道解析：行 → shape 名
 * @description 读取 mark 上结构化的 shape 字段。常量 value 直用（core / 注册 shape 名）；categorical 字段经 ordinal 映射到
 *   `PLOT_SHAPE_PALETTE`（复用 ordinal 数学：调色板换成 glyph 名，循环复用）。非 categorical 字段 fail-loud（形状是分类编码）。
 */
export const resolveShapeChannel = (ctx: NodeChannelContext): ((mark: MarkOperation) => ChannelResolution<JsonValue> | undefined) => {
  const { rows, fieldTypes } = ctx;
  return (mark: MarkOperation): ChannelResolution<JsonValue> | undefined => {
    const channel = pickStyleChannel<string | IRShapeRef>(mark, 'shape');
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const shape = channel.value;
      if (typeof shape !== 'string' && !ShapeRefSchema.safeParse(shape).success) return undefined;
      return { resolver: () => shape };
    }
    const field = channel.value;
    const fieldType = fieldTypes.get(field);
    if (fieldType !== undefined && fieldType !== PlotFieldType.Categorical) {
      throw new Error(`lowerPlots: shape channel field "${field}" is ${fieldType}; shape requires a categorical field`);
    }
    const values = rows.map(row => resolveFieldPath(row, field));
    const domain = inferCategoryDomain(values);
    // 复用 ordinal scale：调色板 = glyph 名（非颜色），category → glyph[index % len]（与旧手写映射等价）
    const def: OrdinalScale = { type: PlotScale.Ordinal, name: `__shape_${field}`, range: [...PLOT_SHAPE_PALETTE] };
    const ordinal = resolveOrdinalScale(def, values);
    const shapes = domain.map(category => ordinal(category));
    return {
      resolver: row => {
        const value = resolveFieldPath(row, field);
        return typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined;
      },
      // shape legend：每类别一形状 swatch，domain = 类别序、range = 对应形状名
      descriptor: { channel: 'shape', scaleType: PlotScale.Ordinal, domain, range: shapes, field, fieldType },
    };
  };
};

const numericNodeChannels: {
  opacity: NodeChannelDefinition<number>;
  fillOpacity: NodeChannelDefinition<number>;
  drawOpacity: NodeChannelDefinition<number>;
  rotate: NodeChannelDefinition<number>;
  padding: NodeChannelDefinition<number>;
  minimumSize: NodeChannelDefinition<number>;
  minimumWidth: NodeChannelDefinition<number>;
  minimumHeight: NodeChannelDefinition<number>;
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
  drawOpacity: defineNodeChannel<number>({
    channel: 'drawOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'drawOpacity'), 'drawOpacity', { range: [0.2, 1], clamp: true }),
    deliver: (node, value) => {
      node.drawOpacity = value;
    },
  }),
  rotate: defineNodeChannel<number>({
    channel: 'rotate',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'rotate'), 'rotate'),
    deliver: (node, value) => {
      node.rotate = value;
    },
  }),
  padding: defineNodeChannel<number>({
    channel: 'padding',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'padding'), 'padding'),
    deliver: (node, value) => {
      node.padding = value;
    },
  }),
  minimumSize: defineNodeChannel<number>({
    channel: 'minimumSize',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'minimumSize'), 'minimumSize'),
    deliver: (node, value) => {
      node.minimumSize = value;
    },
  }),
  minimumWidth: defineNodeChannel<number>({
    channel: 'minimumWidth',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'minimumWidth'), 'minimumWidth'),
    deliver: (node, value) => {
      node.minimumWidth = value;
    },
  }),
  minimumHeight: defineNodeChannel<number>({
    channel: 'minimumHeight',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'minimumHeight'), 'minimumHeight'),
    deliver: (node, value) => {
      node.minimumHeight = value;
    },
  }),
  zIndex: defineNodeChannel<number>({
    channel: 'zIndex',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericNodeResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => pickStyleChannel<number>(mark, 'zIndex'), 'zIndex', { integer: true }),
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

const textAlignValues = new Set(['left', 'center', 'right']);
const blendModeValues = new Set(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']);
const shadowPresetValues = new Set(['none', 'sm', 'md', 'lg', 'xl', '2xl']);

const directNodeChannels = {
  align: defineSimpleNodeChannel<'left' | 'center' | 'right'>(
    'align',
    { outputKind: 'symbol', palette: [...textAlignValues] },
    value => (typeof value === 'string' && textAlignValues.has(value) ? (value as 'left' | 'center' | 'right') : undefined),
    (node, value) => {
      node.align = value;
    },
  ),
  lineHeight: defineSimpleNodeChannel<number>('lineHeight', { outputKind: 'number', range: [0, 0] }, positiveNumber, (node, value) => {
    node.lineHeight = value;
  }),
  maxTextWidth: defineSimpleNodeChannel<number>('maxTextWidth', { outputKind: 'number', range: [0, 0] }, positiveNumber, (node, value) => {
    node.maxTextWidth = value;
  }),
  cornerRadius: defineSimpleNodeChannel<number>('cornerRadius', { outputKind: 'number', range: [0, 0] }, nonnegativeNumber, (node, value) => {
    node.cornerRadius = value;
  }),
  scale: defineSimpleNodeChannel<number>('scale', { outputKind: 'number', range: [0, 0] }, positiveNumber, (node, value) => {
    node.scale = value;
  }),
  xScale: defineSimpleNodeChannel<number>('xScale', { outputKind: 'number', range: [0, 0] }, positiveNumber, (node, value) => {
    node.xScale = value;
  }),
  yScale: defineSimpleNodeChannel<number>('yScale', { outputKind: 'number', range: [0, 0] }, positiveNumber, (node, value) => {
    node.yScale = value;
  }),
  innerXSep: defineSimpleNodeChannel<number>('innerXSep', { outputKind: 'number', range: [0, 0] }, nonnegativeNumber, (node, value) => {
    node.innerXSep = value;
  }),
  innerYSep: defineSimpleNodeChannel<number>('innerYSep', { outputKind: 'number', range: [0, 0] }, nonnegativeNumber, (node, value) => {
    node.innerYSep = value;
  }),
  outerSep: defineSimpleNodeChannel<number>('outerSep', { outputKind: 'number', range: [0, 0] }, nonnegativeNumber, (node, value) => {
    node.outerSep = value;
  }),
  margin: defineSimpleNodeChannel<number>('margin', { outputKind: 'number', range: [0, 0] }, nonnegativeNumber, (node, value) => {
    node.margin = value;
  }),
  dashed: defineSimpleNodeChannel<boolean>('dashed', { outputKind: 'boolean' }, booleanValue, (node, value) => {
    node.dashed = value;
  }),
  dotted: defineSimpleNodeChannel<boolean>('dotted', { outputKind: 'boolean' }, booleanValue, (node, value) => {
    node.dotted = value;
  }),
  dashPattern: defineSimpleNodeChannel<Array<number>>('dashPattern', { outputKind: 'array' }, dashPatternValue, (node, value) => {
    node.dashPattern = value;
  }),
  font: defineSimpleNodeChannel<JsonValue>('font', { outputKind: 'object' }, value => schemaValue<IRFont>(FontSchema)(value), (node, value) => {
    node.font = value as IRFont;
  }),
  boundary: defineSimpleNodeChannel<JsonValue>('boundary', { outputKind: 'json' }, value => schemaValue<IRBoundary>(BoundarySchema)(value), (node, value) => {
    node.boundary = value as IRBoundary;
  }),
  shadow: defineSimpleNodeChannel<JsonValue>(
    'shadow',
    { outputKind: 'json' },
    value => (typeof value === 'string' && shadowPresetValues.has(value) ? value : (DropShadowSchema.safeParse(value).success ? jsonValue(value) : undefined)),
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
    if (context.nodeKind === 'pointGlyph') node.shape = value as string | IRShapeRef;
  },
});

export type BuiltinNodeChannels = {
  opacity: NodeChannelDefinition<number>;
  fillOpacity: NodeChannelDefinition<number>;
  drawOpacity: NodeChannelDefinition<number>;
  rotate: NodeChannelDefinition<number>;
  padding: NodeChannelDefinition<number>;
  minimumSize: NodeChannelDefinition<number>;
  minimumWidth: NodeChannelDefinition<number>;
  minimumHeight: NodeChannelDefinition<number>;
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

export const NODE_CHANNELS: ReadonlyArray<AnyChannelDefinition> = Object.values(BUILTIN_NODE_CHANNELS).map(def => eraseNodeChannelDefinition(def));
