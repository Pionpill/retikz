import { isFiniteNumber } from '@retikz/math';
import { type ChannelResolution, type VisualChannelContext, type VisualChannelDefinition, defineVisualChannel, isBuiltinScaleOperation } from '../../contract';
import { resolveFieldPath } from '../data';
import { type Mark, PlotMark, PlotScale, type SqrtScale } from '../../schemas';
import { resolveSqrtScale } from '../scale/position';

/** size 通道最小 / 最大半径（px，user units；对齐散点默认直径 10 量级）；core 换算细节，不外泄 IR */
export const SIZE_MIN_RADIUS = 2;
export const SIZE_MAX_RADIUS = 20;

/**
 * size 通道解析：行 → 半径（px）
 * @description 仅 PointMark 有 size。常量 value 直接作最终半径（绕过 scale）；字段过 sqrt 半径 scale
 *   （显式 sqrt scale 引用或自动合成），domain 默认 [0, maxPositive]、range [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS]。
 *   边界：无正值 → 全 SIZE_MIN_RADIUS；单正值 → range 上界；负值 fail-loud。
 */
export const resolveSizeChannel = (ctx: VisualChannelContext): ((mark: Mark) => ChannelResolution<number> | undefined) => {
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

export const sizeVisualChannel: VisualChannelDefinition<number> = defineVisualChannel<number>({
  channel: 'size',
  output: { outputKind: 'number', range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS] },
  legend: 'size',
  resolve: resolveSizeChannel,
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointGlyph') node.minimumSize = value * Math.SQRT2;
  },
});
