import { type ExternalRow, type FieldType, type Mark, PlotFieldType, PlotScale, type PlotSpec, type SqrtScale } from '../ir';
import { isFiniteNumber, resolveFieldPath } from './field';
import { resolveLinearScale, resolveSqrtScale } from './scale';

/**
 * 通道 → 视觉量 resolver 的接缝（alpha.7）
 * @description 把「channel（field/value/scale）→ 行→视觉量」的解析收成可复用形态：size 是首个新消费者，
 *   color（ADR-03）后续迁入，opacity / shape（ADR-04 / ADR-05）复用。将来 ChannelDefinition 注册表即在此参数化。
 */

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
export const makeSizeResolver = (node: PlotSpec, rows: Array<ExternalRow>): ((mark: Mark) => SizeOf | undefined) => {
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  return (mark: Mark): SizeOf | undefined => {
    if (mark.type !== 'point') return undefined;
    const channel = mark.encoding.size;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const radius = channel.value;
      return () => radius;
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    if (numeric.some(value => value < 0)) {
      throw new Error(`lowerPlots: size channel field "${field}" has negative values; size requires non-negative magnitudes`);
    }
    const positives = numeric.filter(value => value > 0);
    // 无正值（全 0 / 空）→ 退化为常量最小半径，不建 scale（避免退化 domain）
    if (positives.length === 0) return () => SIZE_MIN_RADIUS;
    const maxPositive = Math.max(...positives);
    let def: SqrtScale = { type: PlotScale.Sqrt, name: channel.scale ?? `__size_${field}`, domain: [0, maxPositive], range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] };
    if (channel.scale !== undefined) {
      const found = scaleByName.get(channel.scale);
      if (!found) throw new Error(`lowerPlots: size channel references unknown scale "${channel.scale}"`);
      if (found.type !== PlotScale.Sqrt) throw new Error(`lowerPlots: size channel scale "${channel.scale}" must be a sqrt scale (size is a radius / area-perceptual channel)`);
      def = { ...found, domain: found.domain ?? [0, maxPositive], range: found.range ?? [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] };
    }
    const scale = resolveSqrtScale(def, numeric, [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]);
    return row => {
      const value = resolveFieldPath(row, field);
      return isFiniteNumber(value) && value >= 0 ? scale(value) : undefined;
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
export const makeOpacityResolver = (node: PlotSpec, rows: Array<ExternalRow>, fieldTypes: Map<string, FieldType>): ((mark: Mark) => OpacityOf | undefined) => {
  return (mark: Mark): OpacityOf | undefined => {
    if (mark.type !== 'point') return undefined;
    const channel = mark.encoding.opacity;
    if (!channel) return undefined;
    if (channel.value !== undefined) {
      const opacity = channel.value;
      return () => opacity;
    }
    if (channel.field === undefined) return undefined;
    const field = channel.field;
    const fieldType = fieldTypes.get(field);
    if (fieldType !== undefined && fieldType !== PlotFieldType.Continuous) {
      throw new Error(`lowerPlots: opacity channel field "${field}" is ${fieldType}; opacity requires a continuous field`);
    }
    const numeric = rows.map(row => resolveFieldPath(row, field)).filter(isFiniteNumber);
    const scale = resolveLinearScale({ range: [OPACITY_MIN, 1], clamp: true }, numeric, [OPACITY_MIN, 1]);
    return row => {
      const value = resolveFieldPath(row, field);
      return isFiniteNumber(value) ? scale(value) : undefined;
    };
  };
};
