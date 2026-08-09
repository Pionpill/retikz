/** Cell plan 来源的判别值 */
export const TableCellPlanSourceKind = {
  /** 内置默认值 */
  Default: 'default',
  /** Structure 显式 Cell 值 */
  Structure: 'structure',
  /** Resolved style token */
  StyleToken: 'styleToken',
  /** Ordered visual encoding */
  Encoding: 'encoding',
  /** 按声明顺序应用的 root rule */
  RootRule: 'rootRule',
} as const;

/** Table theme token 的最终 cascade 来源 */
export const TableThemeTokenSourceKind = {
  Preset: 'preset',
  SharedCategorical: 'shared-categorical',
  LocalThemeToken: 'local-theme-token',
} as const;

/** Cell appearance winner trace 的规范叶路径 */
export const TableCellAppearanceTracePath = {
  /** Cell 背景填充 */
  BackgroundFill: '/background/fill',
  /** Cell 背景填充不透明度 */
  BackgroundFillOpacity: '/background/fillOpacity',
  /** Cell 内容主颜色 */
  ContentColor: '/content/color',
  /** Cell 内容填充 */
  ContentFill: '/content/fill',
  /** Cell 内容填充不透明度 */
  ContentFillOpacity: '/content/fillOpacity',
  /** Cell 内容描边 */
  ContentStroke: '/content/stroke',
  /** Cell 内容描边宽度 */
  ContentStrokeWidth: '/content/strokeWidth',
  /** Cell 内容描边不透明度 */
  ContentStrokeOpacity: '/content/strokeOpacity',
  /** Cell 内容整体不透明度 */
  ContentOpacity: '/content/opacity',
  /** Cell 内容样式重置配置 */
  ContentResetStyle: '/content/resetStyle',
  /** Node 默认主颜色 */
  ContentNodeDefaultColor: '/content/nodeDefault/color',
  /** Node 默认填充 */
  ContentNodeDefaultFill: '/content/nodeDefault/fill',
  /** Node 默认填充不透明度 */
  ContentNodeDefaultFillOpacity: '/content/nodeDefault/fillOpacity',
  /** Node 默认描边 */
  ContentNodeDefaultStroke: '/content/nodeDefault/stroke',
  /** Node 默认描边宽度 */
  ContentNodeDefaultStrokeWidth: '/content/nodeDefault/strokeWidth',
  /** Node 默认描边不透明度 */
  ContentNodeDefaultStrokeOpacity: '/content/nodeDefault/strokeOpacity',
  /** Node 默认整体不透明度 */
  ContentNodeDefaultOpacity: '/content/nodeDefault/opacity',
  /** Node 默认阴影 */
  ContentNodeDefaultShadow: '/content/nodeDefault/shadow',
  /** Node 默认混合模式 */
  ContentNodeDefaultBlendMode: '/content/nodeDefault/blendMode',
  /** Node 默认形状 */
  ContentNodeDefaultShape: '/content/nodeDefault/shape',
  /** Node 默认边界 */
  ContentNodeDefaultBoundary: '/content/nodeDefault/boundary',
  /** Node 默认旋转角度 */
  ContentNodeDefaultRotate: '/content/nodeDefault/rotate',
  /** Node 默认对齐方式 */
  ContentNodeDefaultAlign: '/content/nodeDefault/align',
  /** Node 默认行高 */
  ContentNodeDefaultLineHeight: '/content/nodeDefault/lineHeight',
  /** Node 默认文本最大宽度 */
  ContentNodeDefaultMaxTextWidth: '/content/nodeDefault/maxTextWidth',
  /** Node 默认虚线开关 */
  ContentNodeDefaultDashed: '/content/nodeDefault/dashed',
  /** Node 默认点线开关 */
  ContentNodeDefaultDotted: '/content/nodeDefault/dotted',
  /** Node 默认虚线图案 */
  ContentNodeDefaultDashPattern: '/content/nodeDefault/dashPattern',
  /** Node 默认虚线偏移 */
  ContentNodeDefaultDashOffset: '/content/nodeDefault/dashOffset',
  /** Node 默认圆角半径 */
  ContentNodeDefaultCornerRadius: '/content/nodeDefault/cornerRadius',
  /** Node 默认最小尺寸 */
  ContentNodeDefaultMinimumSize: '/content/nodeDefault/minimumSize',
  /** Node 默认缩放 */
  ContentNodeDefaultScale: '/content/nodeDefault/scale',
  /** Node 默认文本颜色 */
  ContentNodeDefaultTextColor: '/content/nodeDefault/textColor',
  /** Node 默认内边距 */
  ContentNodeDefaultPadding: '/content/nodeDefault/padding',
  /** Node 默认外边距 */
  ContentNodeDefaultMargin: '/content/nodeDefault/margin',
  /** Node 默认字体族 */
  ContentNodeDefaultFontFamily: '/content/nodeDefault/font/family',
  /** Node 默认字体大小 */
  ContentNodeDefaultFontSize: '/content/nodeDefault/font/size',
  /** Node 默认字体粗细 */
  ContentNodeDefaultFontWeight: '/content/nodeDefault/font/weight',
  /** Node 默认字体样式 */
  ContentNodeDefaultFontStyle: '/content/nodeDefault/font/style',
  /** Path 默认主颜色 */
  ContentPathDefaultColor: '/content/pathDefault/color',
  /** Path 默认填充 */
  ContentPathDefaultFill: '/content/pathDefault/fill',
  /** Path 默认填充不透明度 */
  ContentPathDefaultFillOpacity: '/content/pathDefault/fillOpacity',
  /** Path 默认描边 */
  ContentPathDefaultStroke: '/content/pathDefault/stroke',
  /** Path 默认描边宽度 */
  ContentPathDefaultStrokeWidth: '/content/pathDefault/strokeWidth',
  /** Path 默认描边不透明度 */
  ContentPathDefaultStrokeOpacity: '/content/pathDefault/strokeOpacity',
  /** Path 默认整体不透明度 */
  ContentPathDefaultOpacity: '/content/pathDefault/opacity',
  /** Path 默认阴影 */
  ContentPathDefaultShadow: '/content/pathDefault/shadow',
  /** Path 默认混合模式 */
  ContentPathDefaultBlendMode: '/content/pathDefault/blendMode',
  /** Path 默认虚线图案 */
  ContentPathDefaultDashPattern: '/content/pathDefault/dashPattern',
  /** Path 默认虚线偏移 */
  ContentPathDefaultDashOffset: '/content/pathDefault/dashOffset',
  /** Path 默认填充规则 */
  ContentPathDefaultFillRule: '/content/pathDefault/fillRule',
  /** Path 默认线帽 */
  ContentPathDefaultLineCap: '/content/pathDefault/lineCap',
  /** Path 默认线连接 */
  ContentPathDefaultLineJoin: '/content/pathDefault/lineJoin',
  /** Path 默认圆角 */
  ContentPathDefaultRoundedCorners: '/content/pathDefault/roundedCorners',
  /** Path 默认旋转角度 */
  ContentPathDefaultRotate: '/content/pathDefault/rotate',
  /** Path 默认缩放 */
  ContentPathDefaultScale: '/content/pathDefault/scale',
  /** Label 默认主颜色 */
  ContentLabelDefaultColor: '/content/labelDefault/color',
  /** Label 默认文本颜色 */
  ContentLabelDefaultTextColor: '/content/labelDefault/textColor',
  /** Label 默认整体不透明度 */
  ContentLabelDefaultOpacity: '/content/labelDefault/opacity',
  /** Label 默认字体族 */
  ContentLabelDefaultFontFamily: '/content/labelDefault/font/family',
  /** Label 默认字体大小 */
  ContentLabelDefaultFontSize: '/content/labelDefault/font/size',
  /** Label 默认字体粗细 */
  ContentLabelDefaultFontWeight: '/content/labelDefault/font/weight',
  /** Label 默认字体样式 */
  ContentLabelDefaultFontStyle: '/content/labelDefault/font/style',
  /** Arrow 默认形状 */
  ContentArrowDefaultShape: '/content/arrowDefault/shape',
  /** Arrow 默认缩放 */
  ContentArrowDefaultScale: '/content/arrowDefault/scale',
  /** Arrow 默认长度 */
  ContentArrowDefaultLength: '/content/arrowDefault/length',
  /** Arrow 默认宽度 */
  ContentArrowDefaultWidth: '/content/arrowDefault/width',
  /** Arrow 默认主颜色 */
  ContentArrowDefaultColor: '/content/arrowDefault/color',
  /** Arrow 默认填充 */
  ContentArrowDefaultFill: '/content/arrowDefault/fill',
  /** Arrow 默认整体不透明度 */
  ContentArrowDefaultOpacity: '/content/arrowDefault/opacity',
  /** Arrow 默认线宽 */
  ContentArrowDefaultLineWidth: '/content/arrowDefault/lineWidth',
  /** Arrow 默认起点配置 */
  ContentArrowDefaultStart: '/content/arrowDefault/start',
  /** Arrow 默认终点配置 */
  ContentArrowDefaultEnd: '/content/arrowDefault/end',
  /** Cell 上侧边框 */
  BorderTop: '/borders/top',
  /** Cell 右侧边框 */
  BorderRight: '/borders/right',
  /** Cell 下侧边框 */
  BorderBottom: '/borders/bottom',
  /** Cell 左侧边框 */
  BorderLeft: '/borders/left',
} as const;
