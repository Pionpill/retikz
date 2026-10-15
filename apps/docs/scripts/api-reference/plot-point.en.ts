/** 散点公开属性的人工审阅英文说明 */
const translations: Partial<Record<string, string>> = {
  '自动边缘留白，默认 max-radius；false 关闭当前图元贡献':
    'Automatic edge padding; defaults to max-radius. false disables this mark contribution',
  'point mark（散点 + 文本标签）': 'Point mark for points and text labels',
  文本水平对齐方式: 'Horizontal text alignment',
  为点图元数据目标生成可引用锚点的命名规则: 'Naming rule for addressable point anchors',
  节点混合模式: 'Node blend mode',
  节点边界策略: 'Node boundary policy',
  '扩展通道绑定，字符串值按字段名处理': 'Extension channel bindings; strings denote field names',
  '颜色字段（→ color 通道 + 自动 ordinal 色 scale）':
    'Color field, mapped through an automatically created ordinal color scale',
  '直接绑定的坐标视图 id': 'Coordinate view ID bound directly to this mark',
  节点圆角半径: 'Node corner radius',
  是否使用虚线描边: 'Whether to use a dashed stroke',
  自定义描边间隔: 'Custom stroke dash pattern',
  '文本格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 text 字段同用':
    'Text format stored in IR: d3-format for numbers or d3-time-format for dates; requires text',
  是否使用点线描边: 'Whether to use a dotted stroke',
  '文本相对锚点水平微调（user units，正 = 右）；仅文本 point 有意义':
    'Horizontal text offset in user units; positive moves right; applies only to text points',
  '文本相对锚点垂直微调（user units，正 = 屏幕下）；仅文本 point 有意义':
    'Vertical text offset in user units; positive moves down; applies only to text points',
  '分面声明 id；构建 IRPlot 时展开为对应坐标视图':
    'Facet declaration ID, expanded into a coordinate view when building IRPlot',
  "填充：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }`":
    "Fill: strings are first resolved as data fields; use `{ kind: 'constant', value }` to force a constant",
  字体配置: 'Font configuration',
  '可选 mark 句柄（预留 scope/anchor）': 'Optional mark handle for scope and anchor references',
  '单个或有序多个标签；字符串为字段名': 'One label or an ordered list of labels; strings denote field names',
  '语义图层覆盖；控制该 mark 外层 scope 在 plot 内的 zIndex':
    'Semantic layer override controlling the outer mark scope zIndex within the plot',
  文本行高: 'Text line height',
  节点外边距: 'Node margin',
  文本最大宽度: 'Maximum text width',
  '最小视觉尺寸；size 通道逐 datum 优先': 'Minimum visual size; per-datum size channel values take precedence',
  '不透明度：字符串按字段解析，数字为常量糖': 'Opacity: strings denote fields and numbers are constant shorthand',
  '节点内边距\nnode padding：字符串按字段解析，数字或对象为常量糖':
    'Node padding: strings denote fields; numbers and objects are constant shorthand',
  'position scale 后、mark geometry 前执行的有序位置调整':
    'Ordered position adjustments applied after position scales and before mark geometry',
  '运行时文字回调，优先于标签内容；需配 mark id，不进入 IR':
    'Runtime text callback overriding label content; requires a mark ID and is not stored in IR',
  '旋转角度：字符串按字段解析，数字为常量糖':
    'Rotation angle: strings denote fields and numbers are constant shorthand',
  节点缩放值或轴向缩放配置: 'Uniform or per-axis node scale',
  节点阴影: 'Node shadow',
  '形状字段（分类）：→ shape 通道，按类别映射到 Plot shape palette；连续/时间字段报错':
    'Categorical shape field mapped through the Plot shape palette; continuous and temporal fields are rejected',
  '尺寸字段（数值）：→ size 通道，经 sqrt 半径 scale 映射成 glyph 半径（面积感知正确）；负值报错':
    'Numeric size field mapped to glyph radius with a square-root scale for area-based comparison; negative values are rejected',
  "描边颜色：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }`":
    "Stroke color: strings are first resolved as data fields; use `{ kind: 'constant', value }` to force a constant",
  '描边宽度：字符串优先按数据字段解析，数字为常量糖；需要显式控制时用 `{ kind, value }`':
    'Stroke width: strings are first resolved as fields and numbers are constant shorthand; use `{ kind, value }` for explicit binding',
  '文本内容字段名：给定则该 point 下沉为无边框带文本的 Node（吸收旧 text mark），否则散点 glyph':
    'Text content field; when provided, the point becomes a borderless text node instead of a point glyph',
  点图元文字颜色的字段或常量映射: 'Field or constant mapping for point text color',
  '共享轨道 id；构建 IRPlot 时展开为对应坐标视图':
    'Shared track ID, expanded into a coordinate view when building IRPlot',
  '只作用于当前 mark 数据视图的变换链': "Transform pipeline applied only to this mark's data view",
  '绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值；cartesian1D / polar1D 单维亦用 x）。\n可选：一维用 x，二维用 x/y；必填性由坐标系在 lowering 校验':
    'Field path for x, interpreted as the angular value in polar coordinates; one-dimensional coordinates also use x. Required roles are checked by the coordinate system during lowering',
  '适配器专用糖：把图元绑定到命名 x 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named x axis; expanded to `coordinateView` before producing IRPlot',
  '绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值；cartesian2D / polar2D 必填，1D 省略）':
    'Field path for y, interpreted as radius in polar coordinates; required in two dimensions and omitted in one dimension',
  '适配器专用糖：把图元绑定到命名 y 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named y axis; expanded to `coordinateView` before producing IRPlot',
  '自定义坐标系可消费的第三位置 role；内置坐标系不使用':
    'Third position role available to custom coordinate systems; unused by built-in coordinates',
  绘制顺序提示: 'Drawing order hint',
};
const missing = new Set<string>();

/** 翻译公开声明说明，保留代码标识符 */
export const translatePlotPoint = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated !== undefined) return translated;
  missing.add(source);
  return source;
};

/** 缺少已审阅翻译时阻止英文参考写入 */
export const assertPlotPointTranslated = (): void => {
  if (missing.size) throw new Error(`Missing point translations: ${JSON.stringify([...missing], null, 2)}`);
};
