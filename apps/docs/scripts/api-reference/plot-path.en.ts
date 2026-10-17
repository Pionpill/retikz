/** 路径公开属性的人工审阅英文说明 */
const translations: Partial<Record<string, string>> = {
  为路径数据目标生成可引用锚点的命名规则: 'Naming rule for addressable path data anchors',
  路径混合模式: 'Path blend mode',
  '扩展通道绑定，会转发到 `encoding.channels`；字符串值按字段名处理':
    'Extension bindings forwarded to `encoding.channels`; strings denote field names',
  '末点回连首点闭合成多边形（polar 下即雷达轮廓）；cartesian 缺省 false，polar2D 缺省 true':
    'Connect the last point to the first to form a polygon or polar radar outline; defaults to false in Cartesian coordinates and true in polar2D',
  '构建闭合路径：cycle 首尾闭合，baseline 回到基线，stack 回到逐行基线字段；是否填充由 fill 控制':
    'Construct a closed path: cycle joins the endpoints, baseline returns to a constant baseline, and stack returns along a per-row baseline field; fill controls whether the region is filled',
  '颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多条线；缺省取 series。连续 / 时间字段报错':
    'Categorical color field with an automatic ordinal scale; implicitly splits paths when series is absent and defaults to series. Continuous and temporal fields are rejected',
  '开放轨迹跨缺值段默认虚线；对象覆盖该段描边，省略或 false 断开':
    'Bridge gaps in open paths with a dashed stroke by default; an object overrides the bridge stroke. Omit or use false to break at gaps',
  '直接绑定的坐标视图 id': 'Coordinate view ID bound directly to this mark',
  '相邻点连接方式；缺省 linear': 'Connection between neighboring points; defaults to linear',
  自定义描边间隔: 'Custom stroke dash pattern',
  '分面声明 id；构建 IRPlot 时展开为对应坐标视图':
    'Facet declaration ID, expanded into a coordinate view when building IRPlot',
  '路径填充；字符串优先按字段名解析': 'Path fill; strings are first resolved as field names',
  路径填充规则: 'Path fill rule',
  '可选 mark 句柄（预留 scope/anchor）': 'Optional mark handle for scope and anchor references',
  'Polar2D 连接空间局部覆盖；省略时继承坐标系':
    'Local override of the polar2D connection space; inherits the coordinate setting when omitted',
  按路径几何放置的单个或多个标签: 'One or more labels placed along path geometry',
  '语义图层覆盖；控制该 mark 外层 scope 在 plot 内的 zIndex':
    'Semantic layer override controlling the outer mark scope zIndex within the plot',
  路径端点形状的常量或字段映射: 'Constant or field mapping for path line caps',
  路径连接处形状的常量或字段映射: 'Constant or field mapping for path line joins',
  路径上的标记配置: 'Markers placed along the path',
  路径整体透明度的常量或数据映射: 'Constant or data mapping for overall path opacity',
  '驱动连接顺序的字段；缺省按数据数组顺序': 'Field controlling connection order; defaults to data array order',
  '按有效数据行生成标签文字的运行时回调，需配合 mark id 使用':
    'Runtime callback generating label text from valid data rows; requires a mark ID',
  路径旋转角度: 'Path rotation angle',
  路径折角圆角半径的常量或数据映射: 'Constant or data mapping for the radius of rounded path corners',
  路径缩放配置: 'Path scale configuration',
  '系列字段：按其拆成多条折线（多系列）；缺省单线':
    'Series field splitting rows into multiple paths; defaults to one path',
  路径阴影: 'Path shadow',
  '路径描边；字符串优先按字段名解析': 'Path stroke; strings are first resolved as field names',
  路径描边宽度的常量或数据映射: 'Constant or data mapping for path stroke width',
  路径预设粗细: 'Path thickness preset',
  '共享轨道 id；构建 IRPlot 时展开为对应坐标视图':
    'Shared track ID, expanded into a coordinate view when building IRPlot',
  '只作用于当前 mark 数据视图的变换链': 'Transform pipeline applied only to this mark data view',
  '绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值）':
    'Field path for x, interpreted as angle in polar coordinates',
  '适配器专用糖：把图元绑定到命名 x 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named x axis; expanded to `coordinateView` before producing IRPlot',
  '绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值）':
    'Field path for y, interpreted as radius in polar coordinates',
  '适配器专用糖：把图元绑定到命名 y 轴；输出 IRPlot 前会展开为 `coordinateView`':
    'Adapter shorthand binding the mark to a named y axis; expanded to `coordinateView` before producing IRPlot',
  路径绘制顺序提示: 'Path drawing order hint',
  'path mark（折线 / 轮廓）': 'Path mark for lines and outlines',
};
const missing = new Set<string>();

/** 翻译公开声明说明，保留代码标识符 */
export const translatePlotPath = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translated = translations[source];
  if (translated !== undefined) return translated;
  missing.add(source);
  return source;
};

/** 缺少已审阅翻译时阻止英文参考写入 */
export const assertPlotPathTranslated = (): void => {
  if (missing.size) throw new Error(`Missing path translations: ${JSON.stringify([...missing], null, 2)}`);
};
