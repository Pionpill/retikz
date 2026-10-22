/** 区间公开属性的人工审阅英文说明 */
const translations: Partial<Record<string, string>> = {
  '饼环份额字段，展开为累积区间': 'Pie or ring share field expanded into cumulative intervals',
  '多系列排布方式': 'Arrangement of multiple series',
  '排布使用的分组字段': 'Grouping field used by the arrangement',
  '百分比堆叠简写': 'Percentage stacking shorthand',
  '堆叠简写': 'Stacking shorthand',
  '堆叠基线算法': 'Stack baseline algorithm',
  '比例区间权重字段': 'Weight field for proportional intervals',
  '直方区间起点字段': 'Start field for histogram intervals',
  '直方区间终点字段': 'End field for histogram intervals',
  '柱方向': 'Bar direction',

  'interval mark（柱 / histogram / heatmap / 径向柱 / 饼环）':
    'Interval mark for bars, histograms, heatmaps, radial bars, and pie or donut charts',
  为区间数据目标生成可引用锚点的命名规则: 'Naming rule for addressable interval data anchors',
  'polar 饼图 / 环图的份额值字段；设置后自动累积成角界（extent×full bounds），下沉为扇区':
    'Share field for polar pie and donut charts; accumulated into angular extent and full radial bounds, then lowered to sectors',
  '多系列区间的并排、堆叠或百分比堆叠策略': 'Dodge, stack, or percentage-stack arrangement for multiple series',
  '颜色字段（→ color 通道 + 自动色 scale）；缺省取 series':
    'Color field with an automatic color scale; defaults to series',
  '多系列排布的分组字段，供 dodge / stack / normalize-stack 使用':
    'Grouping field for dodge, stack, and normalize-stack arrangements',
  '百分比堆叠简写，等价于 arrangement="normalize-stack"':
    'Percentage-stack shorthand, equivalent to arrangement="normalize-stack"',
  '系列字段：拆成多组 / 多系列柱；缺省单系列':
    'Series field dividing rows into multiple groups; defaults to one series',
  '多系列时是否堆叠（true=stack，自动 stack transform + bounds.y=extent）；否则并排（dodge，bounds.x=band{group}）':
    'Stack multiple series using a stack transform and extent bounds; otherwise use grouped band bounds for dodging',
  'arrangement="stack" 使用的堆叠基线策略': 'Baseline offset strategy for arrangement="stack"',
  '比例区间宽度字段；按行顺序推导连续区间': 'Width field accumulated in row order into continuous intervals',
  '绑 x 位置通道的字段路径（分类，自动 band scale；polar 下作角向类别）；直方连续 x 用 x0/x1 取代':
    'Categorical x field with an automatic band scale, interpreted as angular categories in polar coordinates; use x0/x1 for continuous histogram bounds',
  '直方连续 x 区间下界字段（如 bin 的 binStart）；与 x1 配对 → bounds.x = extent(x0,x1)':
    'Lower endpoint field for continuous x intervals; paired with x1 to produce extent bounds',
  '直方连续 x 区间上界字段（如 bin 的 binEnd）；与 x0 配对':
    'Upper endpoint field for continuous x intervals; paired with x0',
  '绑 y 位置通道的字段路径（数值；polar 下作径向值；直方下作箱高度 binCount 或自定义 metric 字段）':
    'Numeric y field, interpreted as radius in polar coordinates and bin height in histograms',
  '显式 per-role 区间来源（高级 / heatmap 双 band）：给定则直接落 IR bounds，便捷 props 之外的逃生舱':
    'Explicit per-role interval sources, written directly to IR bounds; supports custom bounds such as two band dimensions for heatmaps',
  '柱方向；horizontal 会把 x 当作数值、y 当作类别': 'Bar direction; horizontal uses x for values and y for categories',
  'Polar2D cell 边界局部覆盖；省略时继承坐标系':
    'Local override of polar2D cell boundaries; inherits the coordinate setting when omitted',
  '极坐标 cell 之间的角度间隔，先于 sector 或 chord contour 投影应用':
    'Angular gap between polar cells, applied before sector or chord-contour projection',
  节点内边距: 'Node padding',
  '极坐标 cell 沿中角方向的静态视觉偏移': 'Static visual offset along the middle angle of a polar cell',
  '区间图元填充的字段、常量或绘制资源输入': 'Field, constant, or paint resource for interval fill',
  区间整体透明度的常量或数据映射: 'Constant or data mapping for overall interval opacity',
  '区间图元描边的字段、常量或绘制资源输入': 'Field, constant, or paint resource for interval stroke',
  区间描边宽度的常量或数据映射: 'Constant or data mapping for interval stroke width',
  文本水平对齐方式: 'Horizontal text alignment',
  节点混合模式: 'Node blend mode',
  节点边界策略: 'Node boundary policy',
  '扩展通道绑定，字符串值按字段名处理': 'Extension channel bindings; strings denote field names',
  '直接绑定的坐标视图 id': 'Coordinate view ID bound directly to this mark',
  节点圆角半径: 'Node corner radius',
  是否使用虚线描边: 'Whether to use a dashed stroke',
  自定义描边间隔: 'Custom stroke dash pattern',
  是否使用点线描边: 'Whether to use a dotted stroke',
  '分面声明 id；构建 IRPlot 时展开为对应坐标视图':
    'Facet declaration ID, expanded into a coordinate view when building IRPlot',
  字体配置: 'Font configuration',
  '可选 mark 句柄（预留 scope/anchor）': 'Optional mark handle for scope and anchor references',
  '单个或有序多个标签；字符串为字段名': 'One label or an ordered list of labels; strings denote field names',
  '语义图层覆盖；控制该 mark 外层 scope 在 plot 内的 zIndex':
    'Semantic layer override controlling the outer mark scope zIndex within the plot',
  文本行高: 'Text line height',
  节点外边距: 'Node margin',
  文本最大宽度: 'Maximum text width',
  '运行时文字回调，优先于标签内容；需配 mark id，不进入 IR':
    'Runtime text callback overriding label content; requires a mark ID and is not stored in IR',
  节点缩放值或轴向缩放配置: 'Uniform or per-axis node scale',
  节点阴影: 'Node shadow',
  '共享轨道 id；构建 IRPlot 时展开为对应坐标视图':
    'Shared track ID, expanded into a coordinate view when building IRPlot',
  '只作用于当前 mark 数据视图的变换链': "Transform pipeline applied only to this mark's data view",
  '适配器专用糖：把图元绑定到命名 x 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named x axis; expanded to `coordinateView` before producing IRPlot',
  '适配器专用糖：把图元绑定到命名 y 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named y axis; expanded to `coordinateView` before producing IRPlot',
};
const missing = new Set<string>();

/** 翻译公开声明说明，保留代码标识符 */
export const translatePlotInterval = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated !== undefined) return translated;
  missing.add(source);
  return source;
};

/** 缺少已审阅翻译时阻止英文参考写入 */
export const assertPlotIntervalTranslated = (): void => {
  if (missing.size) throw new Error(`Missing interval translations: ${JSON.stringify([...missing], null, 2)}`);
};
