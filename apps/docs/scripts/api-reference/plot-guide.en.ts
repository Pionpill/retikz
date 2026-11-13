const translations: Partial<Record<string, string>> = {
  '图例 guide（swatch / 色带 ramp / 分箱 / 梯度符号，由 color scale 或 channel definition 决定形态）':
    'Legend guide with swatches, ramps, bins or graduated symbols, selected by the color scale or channel definition',
  '装饰哪个定位维度：cartesian 的 x（水平）/ y（垂直）；polar 的 x（角向）/ y（径向）；\ncustom coordinate 使用 definition 声明的 role。维度须匹配坐标系合法集，否则 lowering fail-loud':
    'The position dimension: Cartesian x (horizontal) / y (vertical), or polar x (angular) / y (radial). Custom coordinates use roles declared by their definition. An invalid dimension causes lowering to fail.',
  '位置 scale 快捷配置；对可缩放维度等价于同维度的 <PlotScale dimension={dimension} type={scale} />':
    'Position scale shorthand; for scalable dimensions equivalent to <PlotScale dimension={dimension} type={scale} />',
  '轴线样式；false 隐藏轴线但保留 ticks / labels / grid':
    'Axis line style; false hides the line while retaining ticks, labels and grid',
  '刻度来源和刻度线样式；grid 复用同一批 ticks':
    'Tick source and mark style; grids reuse these ticks unless configured separately',
  '轴线交叉值处的 tick / label 冲突策略': 'Tick and label conflict policy at an axis crossing',
  '刻度标签开关、格式化和文本样式；false 隐藏刻度标签，缺省显示':
    'Tick label visibility, formatting and text style; false hides labels, shown by default',
  '是否画对齐本轴刻度的网格线，以及在组合坐标中投放到哪些目标；缺省 = false':
    'Grid lines aligned with axis ticks and their targets in composed coordinates; defaults to false',
  选择坐标轴所属的具名坐标视图: 'Named coordinate view owning the axis',
  将坐标轴限定到指定分面: 'Restrict the axis to a specified facet',
  选择坐标轴所属的共享坐标骨架: 'Shared coordinate scaffold owning the axis',
  在共享坐标骨架中选择目标轨道: 'Target track in a shared coordinate scaffold',
  控制轴线的放置侧或交叉位置: 'Axis placement side or crossing position',
  坐标轴标题的内容与外观: 'Axis title content and appearance',
  '语义图层覆盖；控制坐标轴外层 scope 在 plot 内的 zIndex':
    'Semantic layer override controlling the outer axis scope zIndex within the plot',
  '可选 guide 句柄，用于稳定标识生成的坐标轴': 'Optional guide handle identifying the generated axis',
  '可视化哪个非位置通道：color（颜色）/ size（尺寸）/ opacity（透明度）/ shape（形状）':
    'Non-position channel to visualize: color, size, opacity or shape',
  '消歧 scale name（同通道被多个 scale 驱动时指定；省略 = 该通道唯一 scale，多于一个且省略 → lowering fail-loud）':
    'Scale name for disambiguation; optional when the channel has exactly one scale, otherwise required',
  '图例标题；支持字符串、多行文本和 styled text block':
    'Legend title; accepts a string, multiple lines or a styled text block',
  '图例位置（预留带所在边）；缺省 = right': 'Legend side, with a reserved layout band; defaults to right',
  '条目排布方向；省略 = 按 position（左右→vertical、上下→horizontal）':
    'Entry direction; defaults to vertical at left/right and horizontal at top/bottom',
  'ramp 的完整刻度来源；size 只读取 count，离散色块和 shape 忽略':
    'Full tick source for ramps; size reads count only, while discrete swatches and shape ignore ticks',
  '是否显示条目 / 刻度标签，以及 ramp 的标签格式；缺省 = true':
    'Entry or tick label visibility and ramp label format; defaults to true',
  '图例本地视觉 token；覆盖 Plot theme.legend': 'Local legend visual tokens overriding Plot theme.legend',
  '语义图层覆盖；控制图例外层 scope 在 plot 内的 zIndex':
    'Semantic layer override controlling the outer legend scope zIndex within the plot',
  '坐标轴 guide（轴线 + 刻度 + 标签 + 可选网格）': 'Axis guide with line, ticks, labels and optional grid',
  '图例 guide（颜色/大小/形状映射说明）': 'Legend guide explaining color, size and shape mappings',
};
const missing = new Set<string>();
/** 翻译公开声明 */
export const translatePlotGuide = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated !== undefined) return translated;
  missing.add(source);
  return source;
};
/** 拒绝缺译产物 */
export const assertPlotGuideTranslated = (): void => {
  if (missing.size) throw new Error(`Missing guide translations: ${JSON.stringify([...missing], null, 2)}`);
};
