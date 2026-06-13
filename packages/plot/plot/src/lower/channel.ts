import { type ExternalRow, type LegendChannelValue, type Mark, PlotFieldType, type PlotFieldTypeValue, PlotMark, PlotScale, type PlotScaleValue, type PlotSpec, type ScalarValue, type SqrtScale } from '../ir';
import { isFiniteNumber, resolveFieldPath } from './field';
import { inferCategoryDomain, resolveLinearScale, resolveSqrtScale } from './scale';

/**
 * 通道 → 视觉量 resolver 的接缝（alpha.7）
 * @description 把「channel（field/value/scale）→ 行→视觉量」的解析收成可复用形态：size 是首个新消费者，
 *   color（ADR-03）后续迁入，opacity / shape（ADR-04 / ADR-05）复用。将来 ChannelDefinition 注册表即在此参数化。
 */

/**
 * 通道 scale 描述符：legend 据此画 swatch / ramp / 分箱 / 梯度符号
 * @description lowering 内部类型、**不进 IR**（domain/range 是裸值数组，绝不含函数 / d3 对象）。
 *   resolver 与 legend 共读同一 descriptor，保证图例与实绘同源（评审 P1 ⑥）。
 */
export type ScaleDescriptor = {
  /** 描述的非位置通道（color / size / opacity / shape） */
  channel: LegendChannelValue;
  /** 绑定 scale 的类型（决定 legend 形态：ordinal→swatch、sequential→ramp、quantize→分箱…） */
  scaleType: PlotScaleValue;
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

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
export const SIZE_MIN_RADIUS = 2;
export const SIZE_MAX_RADIUS = 20;

/** 行 → 半径（px）；undefined = 该行无有效 size（跳过 / 回退默认尺寸）。由 makeSizeResolver 据 encoding.size 构造 */
export type SizeOf = (row: ExternalRow) => number | undefined;

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
    const channel = mark.encoding.size;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const radius = channel.value;
      return { of: () => radius };
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
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
      if (found.type !== PlotScale.Sqrt) throw new Error(`lowerPlots: size channel scale "${channel.scale}" must be a sqrt scale (size is a radius / area-perceptual channel)`);
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

/** 行 → 不透明度（0..1）；undefined = 该行无有效 opacity。由 makeOpacityResolver 据 encoding.opacity 构造 */
export type OpacityOf = (row: ExternalRow) => number | undefined;

/**
 * 解析某 mark 的 opacity 编码 → 行→不透明度（0..1）
 * @description 仅 PointMark。常量 value 直用（schema 已限 [0,1]）；continuous 字段过 clamp linear scale 映射到
 *   [OPACITY_MIN, 1]——任意值（含负/超域）clamp、不 fail-loud（opacity 无面积语义，与 size 负值 fail-loud 不同）。
 *   非 continuous 字段（temporal / categorical）fail-loud（opacity 是连续编码）。
 */
export const makeOpacityResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<number> | undefined) => {
  return (mark: Mark): ChannelResolution<number> | undefined => {
    if (mark.type !== PlotMark.Point) return undefined;
    const channel = mark.encoding.opacity;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const opacity = channel.value;
      return { of: () => opacity };
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    const fieldType = fieldTypes.get(field);
    if (fieldType !== undefined && fieldType !== PlotFieldType.Continuous) {
      throw new Error(`lowerPlots: opacity channel field "${field}" is ${fieldType}; opacity requires a continuous field`);
    }
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    const scale = resolveLinearScale({ range: [OPACITY_MIN, 1], clamp: true }, numeric, [OPACITY_MIN, 1]);
    // descriptor domain = 数据 extent（空集退化 [0,1]，与 resolveLinearScale safeExtent 同源）
    const domain: [number, number] = numeric.length === 0 ? [0, 1] : [Math.min(...numeric), Math.max(...numeric)];
    return {
      of: row => {
        const value = resolveFieldPath(row, field);
        return isFiniteNumber(value) ? scale(value) : undefined;
      },
      descriptor: { channel: 'opacity', scaleType: PlotScale.Linear, domain, range: [OPACITY_MIN, 1], field, fieldType },
    };
  };
};

/** shape 通道默认 glyph 调色板（直用 core 内置 shape 名，无 plot-only 别名）；循环复用 */
export const PLOT_SHAPE_PALETTE = ['circle', 'rectangle', 'diamond'] as const;

/** 行 → glyph shape 名；undefined = 该行无有效 shape。由 makeShapeResolver 据 encoding.shape 构造 */
export type ShapeOf = (row: ExternalRow) => string | undefined;

/**
 * 解析某 mark 的 shape 编码 → 行→shape 名
 * @description 仅 PointMark。常量 value 直用（core / 注册 shape 名）；categorical 字段按出现序映射到
 *   `PLOT_SHAPE_PALETTE`（循环复用）。非 categorical 字段（continuous / temporal）fail-loud（形状是分类编码）。
 */
export const makeShapeResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): ((mark: Mark) => ChannelResolution<string> | undefined) => {
  return (mark: Mark): ChannelResolution<string> | undefined => {
    if (mark.type !== PlotMark.Point) return undefined;
    const channel = mark.encoding.shape;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const shape = channel.value;
      return { of: () => shape };
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
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
