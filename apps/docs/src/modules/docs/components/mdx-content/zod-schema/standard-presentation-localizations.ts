/** 格线、主线与边框复用的描边字段说明 */
const gridStrokeDescriptions = {
  color: '主几何的主色；描边、填充、标签和箭头在未单独覆盖时可继承此颜色',
  stroke: '主几何的描边画笔，可使用上下文颜色或 IRPaint',
  strokeWidth: '描边宽度，单位为用户坐标单位',
  dashPattern: '虚线各段长度，单位为用户坐标单位；省略时为实线',
  dashOffset: '虚线起始偏移，单位为用户坐标单位；允许有限的正数或负数',
  lineCap: '线段端点形状；省略时为 butt，round 添加半圆端帽，square 向端点外延伸',
  lineJoin: '描边转角形状；省略时为 miter，round 使用圆角，bevel 将转角削平',
  opacity: '作用于主几何整体的不透明度',
  strokeOpacity: '仅作用于轮廓描边的不透明度',
  zIndex: '同级 IR 子节点的显式绘制层级，数值越大越靠上；省略时为 0，按源码顺序排列，同一父组内保持稳定排序',
};

/** 为共享描边说明生成对应匿名对象的点路径 */
const gridStrokeDescriptionsAt = (prefix: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(gridStrokeDescriptions).map(([field, description]) => [`${prefix}.${field}`, description]),
  );

/** Grid 的中文字段说明，API 生成与 Schema 展示共用 */
export const GridSchemaZhLocalization = {
  descriptions: {
    namespace: 'Standard 复合组件命名空间',
    type: '规则笛卡尔网格的类型标识',
    bounds: '无序笛卡尔角点，或中心位置与非负尺寸',
    line: '关闭、共享或按方向独立配置格线',
    border: '可选的外扩边框及其绘制顺序',
    id: '可选引用身份',
    animations: '作用于整个作用域的声明式动画',
    boundingShape: '作用域的合成引用边界形状',
    clip: '作用域局部坐标中的裁剪区域',
    defaults: '后代默认样式及继承屏障',
    'defaults.node': '作用域内节点的默认样式，与其它默认样式通道独立',
    'defaults.path': '作用域内路径类图元的默认样式；箭头使用独立的 defaults.arrow 通道',
    'defaults.label': '作用域内节点标签与路径步骤标签的默认样式',
    'defaults.arrow': '作用域内箭头的默认样式',
    'defaults.reset': '默认样式的继承屏障；true 重置全部通道，也可列出需要重置的 node、path、label、arrow 通道',
    frame: '子图下方的包络装饰',
    localNamespace: '为子节点与嵌套作用域启用局部命名空间',
    meta: '编译与渲染不解释的 JSON 元数据',
    placement: '作用域变换后的对齐定位',
    style: '当前作用域的稀疏视觉覆盖',
    theme: '后代复合组件的主题覆盖',
    transforms: '作用域局部变换',
    zIndex: '作用域整体在同级中的绘制次序',
    'border.padding': '均匀外扩距离',
    'border.order': '边框在格线前方或后方绘制',
    'border.extendLines': '是否延长格线到外扩边框',
    'border.style': '边框路径样式',
    ...gridStrokeDescriptionsAt('border.style'),
    'border.style.fill': '主几何的填充画笔，可使用上下文颜色或 IRPaint',
    'border.style.fillOpacity': '仅作用于填充区域的不透明度',
    'border.style.fillRule':
      '自交或嵌套子路径的填充规则；默认 nonzero 按方向累计绕数，evenodd 在每次穿越边界时切换填充状态，适合环形图形',
  },
};

/** 单方向格线的中文字段说明 */
export const GridLineSchemaZhLocalization = {
  description: '单个网格线方向共用的配置',
  descriptions: {
    spacing: '相邻格线的正间距',
    origin: '该方向可选的格点原点坐标',
    includeBoundary: '是否将缺失的边界补为格线',
    style: '普通格线样式',
    ...gridStrokeDescriptionsAt('style'),
    major: '可选的主线间隔与样式覆盖',
    'major.every': '相对格点原点的正整数间隔',
    'major.offset': '相对格点原点的整数索引偏移',
    'major.style': '覆盖普通格线的主线样式',
    ...gridStrokeDescriptionsAt('major.style'),
  },
};
