/** Cell plan 来源的判别值 */
export const TableCellPlanSourceKind = {
  /** 内置默认值 */
  Default: 'default',
  /** 正式 Source defaults 来源 */
  Defaults: 'defaults',
  /** Structure 显式 Cell 值 */
  Structure: 'structure',
  /** Ordered visual encoding */
  Encoding: 'encoding',
  /** 按声明顺序应用的 root rule */
  RootRule: 'rootRule',
} as const;

/** Cell appearance winner trace 的规范叶路径 */
export const TableCellAppearanceTracePath = {
  /** Cell 背景填充 */
  BackgroundFill: '/background/fill',
  /** Cell 背景填充不透明度 */
  BackgroundFillOpacity: '/background/fillOpacity',
  /** Cell 内容主颜色 */
  ContentColor: '/content/style/color',
  /** Cell 内容填充 */
  ContentFill: '/content/style/fill',
  /** Cell 内容填充不透明度 */
  ContentFillOpacity: '/content/style/fillOpacity',
  /** Cell 内容描边 */
  ContentStroke: '/content/style/stroke',
  /** Cell 内容描边宽度 */
  ContentStrokeWidth: '/content/style/strokeWidth',
  /** Cell 内容描边不透明度 */
  ContentStrokeOpacity: '/content/style/strokeOpacity',
  /** Cell 内容整体不透明度 */
  ContentOpacity: '/content/style/opacity',
  /** Cell 内容样式重置配置 */
  ContentResetStyle: '/content/defaults/reset',
  /** Node 默认主颜色 */
  ContentNodeDefaultColor: '/content/defaults/node/style/color',
  /** Node 默认填充 */
  ContentNodeDefaultFill: '/content/defaults/node/style/fill',
  /** Node 默认填充不透明度 */
  ContentNodeDefaultFillOpacity: '/content/defaults/node/style/fillOpacity',
  /** Node 默认描边 */
  ContentNodeDefaultStroke: '/content/defaults/node/style/stroke',
  /** Node 默认描边宽度 */
  ContentNodeDefaultStrokeWidth: '/content/defaults/node/style/strokeWidth',
  /** Node 默认描边不透明度 */
  ContentNodeDefaultStrokeOpacity: '/content/defaults/node/style/strokeOpacity',
  /** Node 默认整体不透明度 */
  ContentNodeDefaultOpacity: '/content/defaults/node/style/opacity',
  /** Node 默认阴影 */
  ContentNodeDefaultShadow: '/content/defaults/node/style/shadow',
  /** Node 默认混合模式 */
  ContentNodeDefaultBlendMode: '/content/defaults/node/style/blendMode',
  /** Node 默认形状 */
  ContentNodeDefaultShape: '/content/defaults/node/shape',
  /** Node 默认边界 */
  ContentNodeDefaultBoundary: '/content/defaults/node/boundary',
  /** Node 默认旋转角度 */
  ContentNodeDefaultRotate: '/content/defaults/node/rotate',
  /** Node 默认对齐方式 */
  ContentNodeDefaultAlign: '/content/defaults/node/layout/align',
  /** Node 默认行高 */
  ContentNodeDefaultLineHeight: '/content/defaults/node/layout/lineHeight',
  /** Node 默认文本最大宽度 */
  ContentNodeDefaultMaxTextWidth: '/content/defaults/node/layout/maxTextWidth',
  /** Node 默认虚线开关 */
  ContentNodeDefaultDashed: '/content/defaults/node/style/dashed',
  /** Node 默认点线开关 */
  ContentNodeDefaultDotted: '/content/defaults/node/style/dotted',
  /** Node 默认虚线图案 */
  ContentNodeDefaultDashPattern: '/content/defaults/node/style/dashPattern',
  /** Node 默认虚线偏移 */
  ContentNodeDefaultDashOffset: '/content/defaults/node/style/dashOffset',
  /** Node 默认圆角半径 */
  ContentNodeDefaultCornerRadius: '/content/defaults/node/cornerRadius',
  /** Node 默认最小尺寸 */
  ContentNodeDefaultMinimumSize: '/content/defaults/node/layout/minimumSize',
  /** Node 默认缩放 */
  ContentNodeDefaultScale: '/content/defaults/node/scale',
  /** Node 默认文本颜色 */
  ContentNodeDefaultTextColor: '/content/defaults/node/style/textColor',
  /** Node 默认内边距 */
  ContentNodeDefaultPadding: '/content/defaults/node/layout/padding',
  /** Node 默认外边距 */
  ContentNodeDefaultMargin: '/content/defaults/node/layout/margin',
  /** Node 默认字体族 */
  ContentNodeDefaultFontFamily: '/content/defaults/node/style/font/family',
  /** Node 默认字体大小 */
  ContentNodeDefaultFontSize: '/content/defaults/node/style/font/size',
  /** Node 默认字体粗细 */
  ContentNodeDefaultFontWeight: '/content/defaults/node/style/font/weight',
  /** Node 默认字体样式 */
  ContentNodeDefaultFontStyle: '/content/defaults/node/style/font/style',
  /** Path 默认主颜色 */
  ContentPathDefaultColor: '/content/defaults/path/style/color',
  /** Path 默认填充 */
  ContentPathDefaultFill: '/content/defaults/path/style/fill',
  /** Path 默认填充不透明度 */
  ContentPathDefaultFillOpacity: '/content/defaults/path/style/fillOpacity',
  /** Path 默认描边 */
  ContentPathDefaultStroke: '/content/defaults/path/style/stroke',
  /** Path 默认描边宽度 */
  ContentPathDefaultStrokeWidth: '/content/defaults/path/style/strokeWidth',
  /** Path 默认描边不透明度 */
  ContentPathDefaultStrokeOpacity: '/content/defaults/path/style/strokeOpacity',
  /** Path 默认整体不透明度 */
  ContentPathDefaultOpacity: '/content/defaults/path/style/opacity',
  /** Path 默认阴影 */
  ContentPathDefaultShadow: '/content/defaults/path/style/shadow',
  /** Path 默认混合模式 */
  ContentPathDefaultBlendMode: '/content/defaults/path/style/blendMode',
  /** Path 默认虚线图案 */
  ContentPathDefaultDashPattern: '/content/defaults/path/style/dashPattern',
  /** Path 默认虚线偏移 */
  ContentPathDefaultDashOffset: '/content/defaults/path/style/dashOffset',
  /** Path 默认填充规则 */
  ContentPathDefaultFillRule: '/content/defaults/path/style/fillRule',
  /** Path 默认线帽 */
  ContentPathDefaultLineCap: '/content/defaults/path/style/lineCap',
  /** Path 默认线连接 */
  ContentPathDefaultLineJoin: '/content/defaults/path/style/lineJoin',
  /** Path 默认圆角 */
  ContentPathDefaultRoundedCorners: '/content/defaults/path/roundedCorners',
  /** Path 默认旋转角度 */
  ContentPathDefaultRotate: '/content/defaults/path/rotate',
  /** Path 默认缩放 */
  ContentPathDefaultScale: '/content/defaults/path/scale',
  /** Label 默认主颜色 */
  ContentLabelDefaultColor: '/content/defaults/label/color',
  /** Label 默认文本颜色 */
  ContentLabelDefaultTextColor: '/content/defaults/label/textColor',
  /** Label 默认整体不透明度 */
  ContentLabelDefaultOpacity: '/content/defaults/label/opacity',
  /** Label 默认字体族 */
  ContentLabelDefaultFontFamily: '/content/defaults/label/font/family',
  /** Label 默认字体大小 */
  ContentLabelDefaultFontSize: '/content/defaults/label/font/size',
  /** Label 默认字体粗细 */
  ContentLabelDefaultFontWeight: '/content/defaults/label/font/weight',
  /** Label 默认字体样式 */
  ContentLabelDefaultFontStyle: '/content/defaults/label/font/style',
  /** Arrow 默认形状 */
  ContentArrowDefaultShape: '/content/defaults/arrow/shape',
  /** Arrow 默认缩放 */
  ContentArrowDefaultScale: '/content/defaults/arrow/scale',
  /** Arrow 默认长度 */
  ContentArrowDefaultLength: '/content/defaults/arrow/length',
  /** Arrow 默认宽度 */
  ContentArrowDefaultWidth: '/content/defaults/arrow/width',
  /** Arrow 默认主颜色 */
  ContentArrowDefaultColor: '/content/defaults/arrow/color',
  /** Arrow 默认填充 */
  ContentArrowDefaultFill: '/content/defaults/arrow/fill',
  /** Arrow 默认整体不透明度 */
  ContentArrowDefaultOpacity: '/content/defaults/arrow/opacity',
  /** Arrow 默认线宽 */
  ContentArrowDefaultLineWidth: '/content/defaults/arrow/lineWidth',
  /** Arrow 默认起点配置 */
  ContentArrowDefaultStart: '/content/defaults/arrow/start',
  /** Arrow 默认终点配置 */
  ContentArrowDefaultEnd: '/content/defaults/arrow/end',
  /** Cell 上侧边框 */
  BorderTop: '/borders/top',
  /** Cell 右侧边框 */
  BorderRight: '/borders/right',
  /** Cell 下侧边框 */
  BorderBottom: '/borders/bottom',
  /** Cell 左侧边框 */
  BorderLeft: '/borders/left',
} as const;
