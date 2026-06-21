import { type ChannelResolution, type VisualChannelContext, type VisualChannelDefinition, defineVisualChannel } from '../../contract';
import { inferCategoryDomain, resolveFieldPath } from '../data';
import { type Mark, type OrdinalScale, PlotFieldType, PlotMark, PlotScale } from '../../schemas';
import { resolveOrdinalScale } from '../scale/color';

/** shape 通道默认 glyph 调色板（直用 core 内置 shape 名，无 plot-only 别名）；循环复用 */
export const PLOT_SHAPE_PALETTE = ['circle', 'rectangle', 'diamond'] as const;

/**
 * shape 通道解析：行 → shape 名
 * @description 仅 PointMark。常量 value 直用（core / 注册 shape 名）；categorical 字段经 ordinal 映射到
 *   `PLOT_SHAPE_PALETTE`（复用 ordinal 数学：调色板换成 glyph 名，循环复用）。非 categorical 字段 fail-loud（形状是分类编码）。
 */
export const resolveShapeChannel = (ctx: VisualChannelContext): ((mark: Mark) => ChannelResolution<string> | undefined) => {
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

export const shapeVisualChannel: VisualChannelDefinition<string> = defineVisualChannel<string>({
  channel: 'shape',
  output: { outputKind: 'symbol', palette: [...PLOT_SHAPE_PALETTE] },
  legend: 'symbol',
  resolve: resolveShapeChannel,
  deliver: (node, value, context) => {
    if (context.nodeKind === 'pointGlyph') node.shape = value;
  },
});
