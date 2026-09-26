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
    frame: '子图下方的包络装饰',
    localNamespace: '为子节点与嵌套作用域启用局部命名空间',
    meta: '编译与渲染不解释的 JSON 元数据',
    placement: '作用域变换后的对齐定位',
    style: '当前作用域的稀疏视觉覆盖',
    theme: '后代复合组件的主题覆盖',
    transforms: '作用域局部变换',
    zIndex: '作用域整体在同级中的绘制次序',
    'bounds.start': '第一个笛卡尔角点',
    'bounds.end': '第二个笛卡尔角点',
    'bounds.position': '由 Core 解析的几何中心位置',
    'bounds.width': '非负宽度',
    'bounds.height': '非负高度',
    'border.padding': '均匀外扩距离',
    'border.order': '边框在格线前方或后方绘制',
    'border.extendLines': '是否延长格线到外扩边框',
    'border.style': '边框路径样式',
  },
};

/** 单方向格线的中文字段说明 */
export const GridLineSchemaZhLocalization = {
  descriptions: {
    spacing: '相邻格线的正间距',
    origin: '该方向可选的格点原点坐标',
    includeBoundary: '是否将缺失的边界补为格线',
    style: '普通格线样式',
    major: '可选的主线间隔与样式覆盖',
    'major.every': '相对格点原点的正整数间隔',
    'major.offset': '相对格点原点的整数索引偏移',
    'major.style': '覆盖普通格线的主线样式',
  },
};
