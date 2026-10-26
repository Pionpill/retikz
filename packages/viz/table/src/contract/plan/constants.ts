import type { ValueOf } from '@retikz/foundation';

/** Cell plan 来源的判别值 */
export const TableCellPlanSourceKind = {
  /** 内置默认值 */
  Default: 'default',
  /** 正式 Source defaults 来源 */
  Defaults: 'defaults',
  /** Structure 显式 Cell 值 */
  Structure: 'structure',
  /** 按顺序应用的视觉编码 */
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
  ContentColor: '/content/defaults/style/color',
  /** Cell 内容填充 */
  ContentFill: '/content/defaults/style/fill',
  /** Cell 内容填充不透明度 */
  ContentFillOpacity: '/content/defaults/style/opacity/fill',
  /** Cell 内容描边 */
  ContentStroke: '/content/defaults/style/stroke',
  /** Cell 内容描边宽度 */
  ContentStrokeWidth: '/content/defaults/style/strokeWidth',
  /** Cell 内容描边不透明度 */
  ContentStrokeOpacity: '/content/defaults/style/opacity/stroke',
  /** Cell 内容整体不透明度 */
  ContentOpacity: '/content/defaults/style/opacity/overall',
  /** 共享默认 shadow */
  ContentShadow: '/content/defaults/style/shadow',
  /** 共享默认 blendMode */
  ContentBlendMode: '/content/defaults/style/blendMode',
  /** 共享默认 dashPattern */
  ContentDashPattern: '/content/defaults/style/dashPattern',
  /** 共享默认 dashOffset */
  ContentDashOffset: '/content/defaults/style/dashOffset',
  /** 共享默认 lineCap */
  ContentLineCap: '/content/defaults/style/lineCap',
  /** 共享默认 lineJoin */
  ContentLineJoin: '/content/defaults/style/lineJoin',
  /** 共享默认 lineCap */
  ContentNodeDefaultLineCap: '/content/defaults/node/style/lineCap',
  /** 共享默认 lineJoin */
  ContentNodeDefaultLineJoin: '/content/defaults/node/style/lineJoin',
  /** Cell 内容样式重置配置 */
  ContentResetStyle: '/content/defaults/reset',
  /** Node 默认主颜色 */
  ContentNodeDefaultColor: '/content/defaults/node/style/color',
  /** Node 默认填充 */
  ContentNodeDefaultFill: '/content/defaults/node/style/fill',
  /** Node 默认填充不透明度 */
  ContentNodeDefaultFillOpacity: '/content/defaults/node/style/opacity/fill',
  /** Node 默认描边 */
  ContentNodeDefaultStroke: '/content/defaults/node/style/stroke',
  /** Node 默认描边宽度 */
  ContentNodeDefaultStrokeWidth: '/content/defaults/node/style/strokeWidth',
  /** Node 默认描边不透明度 */
  ContentNodeDefaultStrokeOpacity: '/content/defaults/node/style/opacity/stroke',
  /** Node 默认整体不透明度 */
  ContentNodeDefaultOpacity: '/content/defaults/node/style/opacity/overall',
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
  /** Node 默认精确边框宽度 */
  ContentNodeDefaultWidth: '/content/defaults/node/layout/width',
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
  ContentPathDefaultFillOpacity: '/content/defaults/path/style/opacity/fill',
  /** Path 默认描边 */
  ContentPathDefaultStroke: '/content/defaults/path/style/stroke',
  /** Path 默认描边宽度 */
  ContentPathDefaultStrokeWidth: '/content/defaults/path/style/strokeWidth',
  /** Path 默认描边不透明度 */
  ContentPathDefaultStrokeOpacity: '/content/defaults/path/style/opacity/stroke',
  /** Path 默认整体不透明度 */
  ContentPathDefaultOpacity: '/content/defaults/path/style/opacity/overall',
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
  ContentPathDefaultCornerRadius: '/content/defaults/path/cornerRadius',
  /** Path 默认旋转角度 */
  ContentPathDefaultRotate: '/content/defaults/path/rotate',
  /** Path 默认缩放 */
  ContentPathDefaultScale: '/content/defaults/path/scale',
  /** node 标签默认 color */
  ContentNodeLabelDefaultColor: '/content/defaults/node/label/color',
  /** node 标签默认 textColor */
  ContentNodeLabelDefaultTextColor: '/content/defaults/node/label/textColor',
  /** node 标签默认 opacity */
  ContentNodeLabelDefaultOpacity: '/content/defaults/node/label/opacity',
  /** node 标签默认 position */
  ContentNodeLabelDefaultPosition: '/content/defaults/node/label/position',
  /** node 标签默认 align */
  ContentNodeLabelDefaultAlign: '/content/defaults/node/label/align',
  /** node 标签默认 placement */
  ContentNodeLabelDefaultPlacement: '/content/defaults/node/label/placement',
  /** node 标签默认 distance */
  ContentNodeLabelDefaultDistance: '/content/defaults/node/label/distance',
  /** node 标签默认 rotate */
  ContentNodeLabelDefaultRotate: '/content/defaults/node/label/rotate',
  /** node 标签默认 keepUpright */
  ContentNodeLabelDefaultKeepUpright: '/content/defaults/node/label/keepUpright',
  /** node 标签默认 pin */
  ContentNodeLabelDefaultPin: '/content/defaults/node/label/pin',
  /** node 标签字体 family */
  ContentNodeLabelDefaultFontFamily: '/content/defaults/node/label/font/family',
  /** node 标签字体 size */
  ContentNodeLabelDefaultFontSize: '/content/defaults/node/label/font/size',
  /** node 标签字体 weight */
  ContentNodeLabelDefaultFontWeight: '/content/defaults/node/label/font/weight',
  /** node 标签字体 style */
  ContentNodeLabelDefaultFontStyle: '/content/defaults/node/label/font/style',
  /** path 标签默认 color */
  ContentPathLabelDefaultColor: '/content/defaults/path/label/color',
  /** path 标签默认 textColor */
  ContentPathLabelDefaultTextColor: '/content/defaults/path/label/textColor',
  /** path 标签默认 opacity */
  ContentPathLabelDefaultOpacity: '/content/defaults/path/label/opacity',
  /** path 标签默认 position */
  ContentPathLabelDefaultPosition: '/content/defaults/path/label/position',
  /** path 标签默认 side */
  ContentPathLabelDefaultSide: '/content/defaults/path/label/side',
  /** path 标签默认 sloped */
  ContentPathLabelDefaultSloped: '/content/defaults/path/label/sloped',
  /** path 标签默认 interrupt */
  ContentPathLabelDefaultInterrupt: '/content/defaults/path/label/interrupt',
  /** path 标签默认 gap */
  ContentPathLabelDefaultGap: '/content/defaults/path/label/gap',
  /** path 标签默认 distance */
  ContentPathLabelDefaultDistance: '/content/defaults/path/label/distance',
  /** path 标签字体 family */
  ContentPathLabelDefaultFontFamily: '/content/defaults/path/label/font/family',
  /** path 标签字体 size */
  ContentPathLabelDefaultFontSize: '/content/defaults/path/label/font/size',
  /** path 标签字体 weight */
  ContentPathLabelDefaultFontWeight: '/content/defaults/path/label/font/weight',
  /** path 标签字体 style */
  ContentPathLabelDefaultFontStyle: '/content/defaults/path/label/font/style',
  /** 路径箭头默认 shape */
  ContentPathArrowDefaultShape: '/content/defaults/path/arrow/shape',
  /** 路径箭头默认 scale */
  ContentPathArrowDefaultScale: '/content/defaults/path/arrow/scale',
  /** 路径箭头默认 length */
  ContentPathArrowDefaultLength: '/content/defaults/path/arrow/length',
  /** 路径箭头默认 width */
  ContentPathArrowDefaultWidth: '/content/defaults/path/arrow/width',
  /** 路径箭头默认 color */
  ContentPathArrowDefaultColor: '/content/defaults/path/arrow/color',
  /** 路径箭头默认自定义参数 */
  ContentPathArrowDefaultParams: '/content/defaults/path/arrow/params',
  /** 路径箭头默认 fill */
  ContentPathArrowDefaultFill: '/content/defaults/path/arrow/fill',
  /** 路径箭头默认 opacity */
  ContentPathArrowDefaultOpacity: '/content/defaults/path/arrow/opacity',
  /** 路径箭头默认 lineWidth */
  ContentPathArrowDefaultLineWidth: '/content/defaults/path/arrow/lineWidth',
  /** 路径箭头默认 start */
  ContentPathArrowDefaultStart: '/content/defaults/path/arrow/start',
  /** 路径箭头默认 end */
  ContentPathArrowDefaultEnd: '/content/defaults/path/arrow/end',
  /** 路径箭头默认 stroke */
  ContentPathArrowDefaultStroke: '/content/defaults/path/arrow/stroke',
  /** 路径箭头默认 dashPattern */
  ContentPathArrowDefaultDashPattern: '/content/defaults/path/arrow/dashPattern',
  /** 路径箭头默认 dashOffset */
  ContentPathArrowDefaultDashOffset: '/content/defaults/path/arrow/dashOffset',
  /** 路径箭头默认 lineCap */
  ContentPathArrowDefaultLineCap: '/content/defaults/path/arrow/lineCap',
  /** 路径箭头默认 lineJoin */
  ContentPathArrowDefaultLineJoin: '/content/defaults/path/arrow/lineJoin',
  /** Cell 上侧边框 */
  BorderTop: '/borders/top',
  /** Cell 右侧边框 */
  BorderRight: '/borders/right',
  /** Cell 下侧边框 */
  BorderBottom: '/borders/bottom',
  /** Cell 左侧边框 */
  BorderLeft: '/borders/left',
} as const;

/** Cell plan 来源判别值 */
export type TableCellPlanSourceKind = ValueOf<typeof TableCellPlanSourceKind>;

/** Cell appearance winner trace 的规范叶路径 */
export type TableCellAppearanceTracePath = ValueOf<typeof TableCellAppearanceTracePath>;
