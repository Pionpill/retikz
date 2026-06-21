import { isFiniteNumber } from '@retikz/math';
import { type AnyVisualChannelDefinition, type ChannelDelivery, type ChannelResolution, type VisualChannelContext, type VisualChannelDefinition, defineVisualChannel, isBuiltinScaleOperation } from '../../contract';
import { inferCategoryDomain, resolveFieldPath } from '../../features';
import {
  type ExternalRow,
  type LinearScale,
  type Mark,
  type MarkValueType,
  type OrdinalScale,
  PlotFieldType,
  type PlotFieldTypeMap,
  type PlotFieldTypeValue,
  PlotMark,
  PlotScale,
  type PlotSpec,
  type ScaledMarkValueType,
  type SqrtScale,
} from '../../schemas';
import { resolveOrdinalScale } from './color';
import { resolveLinearScale, resolveSqrtScale } from './position';

// ScaleDescriptor / ChannelResolution 已上移 contract/channel.ts（属运行时契约、且 VisualChannelDefinition 依赖之）；此处再导出保 providers barrel 表面稳定。
export type { ChannelResolution, ScaleDescriptor } from '../../contract';

export type MarkValueResolution<T> = ChannelResolution<T> & {
  /** 绑定的数据字段名；常量值没有字段名。 */
  field?: string;
  /** 绑定字段的解析类型；常量值或未知字段类型时省略。 */
  fieldType?: PlotFieldTypeValue;
};

export type MarkValueResolverOptions<T> = {
  /** 用于错误信息的属性 / 通道名。 */
  channelName: string;
  /** 字段变体允许的字段类型；省略表示不做类型限制。 */
  expectedFieldType?: PlotFieldTypeValue;
  /** 把数据行中的原始字段值转换为属性值；返回 undefined 表示该行跳过该属性。 */
  parse: (value: unknown) => T | undefined;
  /** 常量变体是否也产出 resolver；默认产出，PointMark 的 nodeDefault 压缩场景可显式跳过。 */
  constants?: 'resolve' | 'skip';
};

/** 把 MarkValueType 解析为「行 → 属性值」函数，供内置 mark 与自定义 mark 复用。 */
export const makeMarkValueResolver = <T>(
  value: MarkValueType<T> | undefined,
  fieldTypes: PlotFieldTypeMap,
  options: MarkValueResolverOptions<T>,
): MarkValueResolution<T> | undefined => {
  if (value === undefined) return undefined;
  if (value.kind === 'constant') {
    if (options.constants === 'skip') return undefined;
    return { of: () => value.value };
  }
  const field = value.value;
  const fieldType = fieldTypes.get(field);
  if (options.expectedFieldType !== undefined && fieldType !== undefined && fieldType !== options.expectedFieldType) {
    throw new Error(`lowerPlots: ${options.channelName} style field "${field}" is ${fieldType}; ${options.channelName} requires a ${options.expectedFieldType} field`);
  }
  return {
    field,
    fieldType,
    of: row => options.parse(resolveFieldPath(row, field)),
  };
};

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
export const SIZE_MIN_RADIUS = 2;
export const SIZE_MAX_RADIUS = 20;

/**
 * size 通道解析：行 → 半径（px）
 * @description 仅 PointMark 有 size。常量 value 直接作最终半径（绕过 scale）；字段过 sqrt 半径 scale
 *   （显式 sqrt scale 引用或自动合成），domain 默认 [0, maxPositive]、range [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]。
 *   边界：无正值 → 全 SIZE_MIN_RADIUS；单正值 → range 上界；负值 fail-loud。
 */
const resolveSizeChannel = (ctx: VisualChannelContext): ((mark: Mark) => ChannelResolution<number> | undefined) => {
  const { node, rows, fieldTypes } = ctx;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: Mark): ChannelResolution<number> | undefined => {
    if (mark.type !== PlotMark.Point) return undefined;
    const channel = mark.size;
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const radius = channel.value;
      return { of: () => radius };
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
        of: () => SIZE_MIN_RADIUS,
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
      of: row => {
        const value = resolveFieldPath(row, field);
        return isFiniteNumber(value) && value >= 0 ? scale(value) : undefined;
      },
      descriptor: { channel: 'size', scaleType: PlotScale.Sqrt, domain: [...domain], range: [...range], field, fieldType: fieldTypes.get(field) },
    };
  };
};

/** opacity 通道连续映射的最小不透明度（range 下界，避免最小值全透明不可见）；契约常量，测试 import 断言 */
export const OPACITY_MIN = 0.2;

export type NumericStyleResolverOptions = {
  range?: readonly [number, number];
  clamp?: boolean;
  integer?: boolean;
};

/**
 * 解析 PointMark 的数值样式字段 → 行→数值（opacity / strokeWidth / fillOpacity / rotate / padding / zIndex… 共享基型）
 * @description field 变体若给 scale 或默认 range，则过 linear scale；否则直接使用字段原始有限数。
 *   非 continuous 字段（temporal / categorical）fail-loud；constant 变体由 nodeDefault / node 本身处理，不在这里产 resolver。
 */
export const makeNumericStyleResolver = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: PlotFieldTypeMap,
  pick: (mark: Mark) => ScaledMarkValueType<number> | undefined,
  channelName: string,
  options: NumericStyleResolverOptions = {},
): ((mark: Mark) => ChannelResolution<number> | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: Mark): ChannelResolution<number> | undefined => {
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
        if (!found) throw new Error(`lowerPlots: ${channelName} style references unknown scale "${channel.scale}"`);
        if (!isBuiltinScaleOperation(found) || found.type !== PlotScale.Linear) throw new Error(`lowerPlots: ${channelName} style scale "${channel.scale}" must be a linear scale`);
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
      of: row => {
        const value = source.of(row);
        if (value === undefined) return undefined;
        const next = scale ? scale(value) : value;
        return options.integer ? Math.trunc(next) : next;
      },
      descriptor,
    };
  };
};

/** strokeWidth 通道连续映射的最小 / 最大描边宽度（user units）；避免最小值落成不可见边框 */
export const STROKE_WIDTH_MIN = 0.5;
export const STROKE_WIDTH_MAX = 4;

/** shape 通道默认 glyph 调色板（直用 core 内置 shape 名，无 plot-only 别名）；循环复用 */
export const PLOT_SHAPE_PALETTE = ['circle', 'rectangle', 'diamond'] as const;

/**
 * shape 通道解析：行 → shape 名
 * @description 仅 PointMark。常量 value 直用（core / 注册 shape 名）；categorical 字段经 ordinal 映射到
 *   `PLOT_SHAPE_PALETTE`（复用 ordinal 数学：调色板换成 glyph 名，循环复用）。非 categorical 字段 fail-loud（形状是分类编码）。
 */
const resolveShapeChannel = (ctx: VisualChannelContext): ((mark: Mark) => ChannelResolution<string> | undefined) => {
  const { rows, fieldTypes } = ctx;
  return (mark: Mark): ChannelResolution<string> | undefined => {
    if (mark.type !== PlotMark.Point) return undefined;
    const channel = mark.shape;
    if (!channel) return undefined;
    if (channel.kind === 'constant') {
      const shape = channel.value;
      return { of: () => shape };
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
      of: row => {
        const value = resolveFieldPath(row, field);
        return typeof value === 'string' || typeof value === 'number' ? ordinal(value) : undefined;
      },
      // shape legend：每类别一形状 swatch，domain = 类别序、range = 对应形状名
      descriptor: { channel: 'shape', scaleType: PlotScale.Ordinal, domain, range: shapes, field, fieldType },
    };
  };
};

/**
 * 内置视觉通道定义（size / opacity / strokeWidth / shape 及 point 数值样式）：scale 管数学、visual channel 管输出空间 + 默认范围 + legend 形态。
 * @description 内置和自定义通道在 lowering 前合并进同一个 registry；差别只在 definition 来源。
 */
export const BUILTIN_VISUAL_CHANNELS: {
  opacity: VisualChannelDefinition<number>;
  fillOpacity: VisualChannelDefinition<number>;
  drawOpacity: VisualChannelDefinition<number>;
  rotate: VisualChannelDefinition<number>;
  padding: VisualChannelDefinition<number>;
  minimumSize: VisualChannelDefinition<number>;
  minimumWidth: VisualChannelDefinition<number>;
  minimumHeight: VisualChannelDefinition<number>;
  zIndex: VisualChannelDefinition<number>;
  size: VisualChannelDefinition<number>;
  shape: VisualChannelDefinition<string>;
  strokeWidth: VisualChannelDefinition<number>;
} = {
  opacity: defineVisualChannel<number>({
    channel: 'opacity',
    output: { outputKind: 'number', range: [OPACITY_MIN, 1], clamp: true },
    legend: 'ramp',
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.opacity : undefined), 'opacity', { range: [OPACITY_MIN, 1], clamp: true }),
    deliver: (node, value) => {
      node.opacity = value;
    },
  }),
  fillOpacity: defineVisualChannel<number>({
    channel: 'fillOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.fillOpacity : undefined), 'fillOpacity', { range: [0.2, 1], clamp: true }),
    deliver: (node, value) => {
      node.fillOpacity = value;
    },
  }),
  drawOpacity: defineVisualChannel<number>({
    channel: 'drawOpacity',
    output: { outputKind: 'number', range: [0.2, 1], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.drawOpacity : undefined), 'drawOpacity', { range: [0.2, 1], clamp: true }),
    deliver: (node, value) => {
      node.drawOpacity = value;
    },
  }),
  rotate: defineVisualChannel<number>({
    channel: 'rotate',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.rotate : undefined), 'rotate'),
    deliver: (node, value) => {
      node.rotate = value;
    },
  }),
  padding: defineVisualChannel<number>({
    channel: 'padding',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.padding : undefined), 'padding'),
    deliver: (node, value) => {
      node.padding = value;
    },
  }),
  minimumSize: defineVisualChannel<number>({
    channel: 'minimumSize',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumSize : undefined), 'minimumSize'),
    deliver: (node, value) => {
      node.minimumSize = value;
    },
  }),
  minimumWidth: defineVisualChannel<number>({
    channel: 'minimumWidth',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumWidth : undefined), 'minimumWidth'),
    deliver: (node, value) => {
      node.minimumWidth = value;
    },
  }),
  minimumHeight: defineVisualChannel<number>({
    channel: 'minimumHeight',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.minimumHeight : undefined), 'minimumHeight'),
    deliver: (node, value) => {
      node.minimumHeight = value;
    },
  }),
  zIndex: defineVisualChannel<number>({
    channel: 'zIndex',
    output: { outputKind: 'number', range: [0, 0] },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.zIndex : undefined), 'zIndex', { integer: true }),
    deliver: (node, value) => {
      node.zIndex = value;
    },
  }),
  size: defineVisualChannel<number>({
    channel: 'size',
    output: { outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] },
    legend: 'size',
    resolve: resolveSizeChannel,
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph') node.minimumSize = value * Math.SQRT2;
    },
  }),
  shape: defineVisualChannel<string>({
    channel: 'shape',
    output: { outputKind: 'symbol', palette: [...PLOT_SHAPE_PALETTE] },
    legend: 'symbol',
    resolve: resolveShapeChannel,
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph') node.shape = value;
    },
  }),
  strokeWidth: defineVisualChannel<number>({
    channel: 'strokeWidth',
    output: { outputKind: 'number', range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true },
    resolve: ctx => makeNumericStyleResolver(ctx.node, ctx.rows, ctx.fieldTypes, mark => (mark.type === PlotMark.Point ? mark.strokeWidth : undefined), 'strokeWidth', { range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true }),
    deliver: (node, value, context) => {
      if (context.nodeKind === 'pointGlyph') node.strokeWidth = value;
    },
  }),
};

const eraseVisualChannelDefinition = (def: unknown): AnyVisualChannelDefinition => def as AnyVisualChannelDefinition;

export const VISUAL_CHANNELS: ReadonlyArray<AnyVisualChannelDefinition> = Object.values(BUILTIN_VISUAL_CHANNELS).map(def => eraseVisualChannelDefinition(def));

/**
 * 保留的内置通道名集：扩展视觉通道的 `channel` 不得撞这些。
 * @description 含内置 visual channel + color/stroke/fill/label + 位置通道 x/y/z。
 */
export const BUILTIN_VISUAL_CHANNEL_NAMES: ReadonlySet<string> = new Set<string>([
  'x',
  'y',
  'z',
  'color',
  'fill',
  'stroke',
  'label',
  'size',
  'opacity',
  'shape',
  'strokeWidth',
  'fillOpacity',
  'drawOpacity',
  'rotate',
  'padding',
  'minimumSize',
  'minimumWidth',
  'minimumHeight',
  'zIndex',
]);

/**
 * 解析视觉通道 registry：内置 definition 先注册，自定义 definition 再合并。
 * @description 自定义通道不能覆盖内置名，也不能彼此重复；最终返回的 registry 是内置和自定义共享的唯一分派表。
 */
export const resolveVisualChannelRegistry = (custom?: ReadonlyArray<AnyVisualChannelDefinition>): Map<string, AnyVisualChannelDefinition> => {
  const registry = new Map<string, AnyVisualChannelDefinition>();
  for (const def of VISUAL_CHANNELS) {
    registry.set(def.channel, def);
  }
  for (const def of custom ?? []) {
    if (BUILTIN_VISUAL_CHANNEL_NAMES.has(def.channel)) {
      throw new Error(`lowerPlots: custom visual channel "${def.channel}" collides with a built-in channel name`);
    }
    if (registry.has(def.channel)) {
      throw new Error(`lowerPlots: duplicate custom visual channel registration: "${def.channel}"`);
    }
    if (typeof def.deliver !== 'function') {
      throw new Error(`lowerPlots: custom visual channel "${def.channel}" must provide deliver (how its resolved value lands on the node)`);
    }
    registry.set(def.channel, def);
  }
  return registry;
};

/**
 * 建某 mark 的视觉通道交付项（值 + 落地同源）。
 * @description 内置和自定义 definition 均从同一 registry 遍历解析；自定义绑定若出现在 `encoding.channels` 但未注册则 fail-loud。
 */
export const resolveVisualChannelDeliveries = (mark: Mark, ctx: VisualChannelContext, registry: ReadonlyMap<string, AnyVisualChannelDefinition>): Array<ChannelDelivery> => {
  if (mark.type !== PlotMark.Point) return [];
  for (const channel of Object.keys(mark.encoding.channels ?? {})) {
    if (BUILTIN_VISUAL_CHANNEL_NAMES.has(channel)) {
      throw new Error(`lowerPlots: encoding.channels.${channel} collides with a built-in channel; use the named mark property instead`);
    }
    if (!registry.has(channel)) {
      throw new Error(`lowerPlots: visual channel "${channel}" is not registered; pass a VisualChannelDefinition via options.visualChannelDefinitions`);
    }
  }
  const out: Array<ChannelDelivery> = [];
  for (const def of registry.values()) {
    const resolution = def.resolve(ctx)(mark);
    if (!resolution) continue;
    // 交付边界：宽类型的 deliver 入参被擦成 never，逐项调用时 `as never` 还原（与 AnyScaleDefinition.resolve 同范式）
    out.push({ channel: def.channel, of: resolution.of, deliver: (node, value, context) => def.deliver(node, value as never, context) });
  }
  return out;
};
