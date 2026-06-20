import { isFiniteNumber } from '@retikz/math';
import { inferCategoryDomain, resolveFieldPath } from '../../features';
import {
  type ExternalRow,
  type LegendChannelValue,
  type LinearScale,
  type Mark,
  type MarkValueType,
  PlotFieldType,
  type PlotFieldTypeValue,
  PlotMark,
  PlotScale,
  type PlotSpec,
  type ScalarValue,
  type ScaledMarkValueType,
  type SqrtScale,
} from '../../schemas';
import { isBuiltinScaleOperation } from '../../contract';
import { resolveLinearScale, resolveSqrtScale } from './position';

/**
 * 通道 scale 描述符：legend 据此画 swatch / ramp / 分箱 / 梯度符号
 * @description lowering 内部类型、**不进 IR**（domain/range 是裸值数组，绝不含函数 / d3 对象）。
 *   resolver 与 legend 共读同一 descriptor，保证图例与实绘同源（评审 P1 ⑥）。
 */
export type ScaleDescriptor = {
  /** 描述的非位置通道（color / size / opacity / shape） */
  channel: LegendChannelValue;
  /** 绑定 scale 的 type 串（放宽接纳自定义 type；legend 形态改由 ChannelScaleResolution.legendForm 决定，不再据此闭集判） */
  scaleType: string;
  /** 域：连续 = [min, max]、分类 = 类别序、离散化 = 边界 / 类别 */
  domain: ReadonlyArray<ScalarValue>;
  /** 值域：色串 / 半径 / 不透明度 / shape 名（与 domain 同序或连续端点） */
  range: ReadonlyArray<ScalarValue>;
  /** 绑定字段名（legend 标题缺省 + 标签 formatter 选型用）；常量通道无字段 */
  field?: string;
  /** 绑定字段类型（标签 formatter 选型：数字 / 时间 / 分类，决策 ⑨）；常量 / 类型未知时省略 */
  fieldType?: PlotFieldTypeValue;
};

/** 单通道解析结果：逐行视觉量函数 + 供 legend 的可复用 descriptor（字段编码才有 descriptor；常量编码无） */
export type ChannelResolution<T> = {
  /** 逐行视觉量函数（mark 实绘用） */
  of: (row: ExternalRow) => T | undefined;
  /** scale descriptor（字段编码 + 经 scale 才产；常量 value 编码 → undefined，不入 legend） */
  descriptor?: ScaleDescriptor;
};

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
  fieldTypes: Map<string, PlotFieldTypeValue>,
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
 * 解析某 mark 的 size 编码 → 行→半径（px）
 * @description 仅 PointMark 有 size。常量 value 直接作最终半径（绕过 scale）；字段过 sqrt 半径 scale
 *   （显式 sqrt scale 引用或自动合成），domain 默认 [0, maxPositive]、range [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]。
 *   边界（ADR-02 ③）：无正值 → 全 SIZE_MIN_RADIUS；单正值 → range 上界；负值 fail-loud。
 */
export const makeSizeResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<number> | undefined) => {
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
 * 解析 PointMark 的数值样式字段 → 行→数值
 * @description field 变体若给 scale 或默认 range，则过 linear scale；否则直接使用字段原始有限数。
 *   非 continuous 字段（temporal / categorical）fail-loud；constant 变体由 nodeDefault / node 本身处理，不在这里产 resolver。
 */
export const makeNumericStyleResolver = (
  node: PlotSpec,
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
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

export const makeOpacityResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<number> | undefined) =>
  makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.opacity : undefined), 'opacity', { range: [OPACITY_MIN, 1], clamp: true });

export const makeStrokeWidthResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<number> | undefined) =>
  makeNumericStyleResolver(node, rows, fieldTypes, mark => (mark.type === PlotMark.Point ? mark.strokeWidth : undefined), 'strokeWidth', { range: [STROKE_WIDTH_MIN, STROKE_WIDTH_MAX], clamp: true });

/** shape 通道默认 glyph 调色板（直用 core 内置 shape 名，无 plot-only 别名）；循环复用 */
export const PLOT_SHAPE_PALETTE = ['circle', 'rectangle', 'diamond'] as const;

/**
 * 解析某 mark 的 shape 编码 → 行→shape 名
 * @description 仅 PointMark。常量 value 直用（core / 注册 shape 名）；categorical 字段按出现序映射到
 *   `PLOT_SHAPE_PALETTE`（循环复用）。非 categorical 字段（continuous / temporal）fail-loud（形状是分类编码）。
 */
export const makeShapeResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<string> | undefined) => {
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
    const domain = inferCategoryDomain(rows.map(row => resolveFieldPath(row, field)));
    const shapes = domain.map((_category, index) => PLOT_SHAPE_PALETTE[index % PLOT_SHAPE_PALETTE.length]);
    const shapeByCategory = new Map<string | number, string>();
    domain.forEach((category, index) => shapeByCategory.set(category, shapes[index]));
    return {
      of: row => {
        const value = resolveFieldPath(row, field);
        return typeof value === 'string' || typeof value === 'number' ? shapeByCategory.get(value) : undefined;
      },
      // shape legend：每类别一形状 swatch，domain = 类别序、range = 对应形状名
      descriptor: { channel: 'shape', scaleType: PlotScale.Ordinal, domain, range: shapes, field, fieldType },
    };
  };
};
