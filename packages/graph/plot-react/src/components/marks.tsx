import type { FC } from 'react';
import type {
  BlendModeStyle,
  BlendModeValue,
  Channel,
  DropShadow,
  ExternalRow,
  IRArrowDetail,
  IRBoundary,
  IRFont,
  IRPaintSpec,
  IRPathScale,
  IRShapeRef,
  IntervalBounds,
  JsonValue,
  MarkValueType,
  NodeBooleanStyle,
  NodeBoundaryStyle,
  NodeDashPatternStyle,
  NodeFontStyle,
  NodePositiveNumberStyle,
  NodeTextAlignStyle,
  NodeTextAlignValue,
  PathArrowDetailStyle,
  PathArrowStyle,
  PathClosure,
  PathCurveValue,
  PathFillRuleStyle,
  PathScaleStyle,
  PathThicknessStyle,
  PointColorStyle,
  PointFillStyle,
  PointNonnegativeNumberStyle,
  PointNumberStyle,
  PointOpacityStyle,
  PointShapeStyle,
  PointSizeStyle,
  PointStrokeStyle,
  PointStrokeWidthStyle,
  PointZIndexStyle,
  ShadowPresetValue,
  ShadowStyle,
} from '@retikz/plot';

/** 数据字段名或字段路径；例如 `month` / `user.age`，用于 React DSL 的数据通道 props。 */
export type FieldName = string;

export type MarkValueProp<T> = FieldName | T | MarkValueType<T>;
export type LineCapValue = 'butt' | 'round' | 'square';
export type LineJoinValue = 'miter' | 'round' | 'bevel';
export type FillRuleValue = 'nonzero' | 'evenodd';
export type ThicknessValue = 'ultraThin' | 'veryThin' | 'thin' | 'semithick' | 'thick' | 'veryThick' | 'ultraThick';
export type ArrowValue = 'none' | '->' | '<-' | '<->';
export type NodeShapeChannelValue = string | IRShapeRef;
export type ExtensionChannelProp = FieldName | JsonValue | Channel | MarkValueType<JsonValue>;

export type CoreNodeChannelProps = {
  align?: MarkValueProp<NodeTextAlignValue> | NodeTextAlignStyle;
  lineHeight?: MarkValueProp<number> | NodePositiveNumberStyle;
  maxTextWidth?: MarkValueProp<number> | NodePositiveNumberStyle;
  cornerRadius?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  scale?: MarkValueProp<number> | NodePositiveNumberStyle;
  xScale?: MarkValueProp<number> | NodePositiveNumberStyle;
  yScale?: MarkValueProp<number> | NodePositiveNumberStyle;
  innerXSep?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  innerYSep?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  outerSep?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  margin?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  dashed?: MarkValueProp<boolean> | NodeBooleanStyle;
  dotted?: MarkValueProp<boolean> | NodeBooleanStyle;
  dashPattern?: MarkValueProp<Array<number>> | NodeDashPatternStyle;
  font?: MarkValueProp<IRFont> | NodeFontStyle;
  boundary?: MarkValueProp<IRBoundary> | NodeBoundaryStyle;
  shadow?: MarkValueProp<ShadowPresetValue | DropShadow> | ShadowStyle;
  blendMode?: MarkValueProp<BlendModeValue> | BlendModeStyle;
};

export type CorePathChannelProps = {
  fill?: FieldName | IRPaintSpec | PointFillStyle;
  stroke?: FieldName | IRPaintSpec | PointStrokeStyle;
  drawOpacity?: MarkValueProp<number> | PointOpacityStyle;
  zIndex?: MarkValueProp<number> | PointZIndexStyle;
  rotate?: MarkValueProp<number> | PointNumberStyle;
  scale?: MarkValueProp<IRPathScale> | PathScaleStyle;
  fillRule?: MarkValueProp<FillRuleValue> | PathFillRuleStyle;
  thickness?: MarkValueProp<ThicknessValue> | PathThicknessStyle;
  arrow?: MarkValueProp<ArrowValue> | PathArrowStyle;
  dashPattern?: MarkValueProp<Array<number>> | NodeDashPatternStyle;
  arrowDetail?: MarkValueProp<IRArrowDetail> | PathArrowDetailStyle;
  shadow?: MarkValueProp<ShadowPresetValue | DropShadow> | ShadowStyle;
  blendMode?: MarkValueProp<BlendModeValue> | BlendModeStyle;
};

/**
 * priority-1 宿主 datum label 扁平 props：给位置 mark（point / interval / path）加 datum 标签
 * @description label 顶层 string 默认按字段解析（装成 IR label.content 的 field）；labelDisplayFormat 进 IR（d3-format / d3-time-format 串）；
 *   labelPosition / labelDistance / labelPin 摊进 core NodeLabelSchema；resolveLabel 是运行时逃生舱（不进 IR、按 mark id 经 options 注入，需配 id）。
 */
export type DatumLabelProps = {
  /** Extension channel bindings forwarded to `encoding.channels`; string values are field names. */
  channels?: Record<string, ExtensionChannelProp>;
  /** datum 标签内容字段名（→ IR label.content.field；优先级低于 resolveLabel、高于无）；缺省不挂标签 */
  label?: FieldName;
  /** 标签格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 label 字段同用 */
  labelDisplayFormat?: string;
  /** 标签相对宿主 Node 边框方位：8 方向枚举或数字角度（度）；缺省 above（对齐 core NodeLabelSchema.position） */
  labelPosition?: 'above' | 'below' | 'left' | 'right' | 'above-left' | 'above-right' | 'below-left' | 'below-right' | number;
  /** 标签离宿主边框距离（user units）；缺省 12（对齐 core NodeLabelSchema.distance） */
  labelDistance?: number;
  /** 从宿主边框拉引线到标签（core leader）；缺省 false */
  labelPin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number> };
  labelTextColor?: string;
  labelOpacity?: number;
  labelFont?: { family?: string; size?: number; weight?: 'normal' | 'bold' | number; style?: 'normal' | 'italic' | 'oblique' };
  labelRotate?: 'none' | 'radial' | 'tangent' | number;
  labelKeepUpright?: boolean;
  /** 完全自定义标签逃生舱（运行时函数，不进 IR；最高优先，覆盖 label/labelDisplayFormat）；需配 mark id 经 options 注入 */
  resolveLabel?: (row: ExternalRow) => string;
};

/** <PathMark> props：折线图层，按 order（缺省按数据顺序）连点成一维轨迹 */
export type PathMarkProps = DatumLabelProps & CorePathChannelProps & {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: FieldName;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: FieldName;
  /** 驱动连接顺序的字段；缺省按数据数组顺序 */
  order?: FieldName;
  /** 系列字段：按其拆成多条折线（多系列）；缺省单线 */
  series?: FieldName;
  /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多条线；缺省取 series。连续 / 时间字段报错 */
  color?: FieldName;
  strokeWidth?: MarkValueProp<number> | PointStrokeWidthStyle;
  opacity?: MarkValueProp<number> | PointOpacityStyle;
  lineCap?: FieldName | LineCapValue | MarkValueType<LineCapValue>;
  lineJoin?: FieldName | LineJoinValue | MarkValueType<LineJoinValue>;
  roundedCorners?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  /** 末点回连首点闭合成多边形（polar 下即雷达轮廓）；缺省 false */
  closed?: boolean;
  /** 闭合并填充路径：cycle 首尾闭合，baseline 回到常量基线，stack 回到逐行基线字段 */
  closure?: PathClosure;
  /** 相邻点连接方式；缺省 linear */
  curve?: PathCurveValue;
  /** 可选 mark 句柄（预留 scope/anchor） */
  id?: string;
};

/** <PointMark> props：散点 / 文本图层，每行一个 glyph（给 text → 无边框文本 Node） */
export type PointMarkProps = DatumLabelProps & CoreNodeChannelProps & {
  /**
   * 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值；cartesian1D / polar1D 单维亦用 x）。
   * 可选：一维用 x，二维用 x/y，ternary2D 用 x/y/z；必填性由坐标系在 lowering 校验。
   */
  x?: FieldName;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值；cartesian2D / polar2D 必填，1D 省略） */
  y?: FieldName;
  /** 三元坐标第三分量字段；ternary2D 下与 x / y 一起使用 */
  z?: FieldName;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale） */
  color?: FieldName | PointColorStyle;
  textColor?: FieldName | PointColorStyle;
  /** 填充：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }` */
  fill?: FieldName | IRPaintSpec | PointFillStyle;
  /** 描边颜色：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }` */
  stroke?: FieldName | IRPaintSpec | PointStrokeStyle;
  /** 描边宽度：字符串优先按数据字段解析，数字为常量糖；需要显式控制时用 `{ kind, value }` */
  strokeWidth?: FieldName | number | PointStrokeWidthStyle;
  /** 填充透明度：字符串按字段解析，数字为常量糖 */
  fillOpacity?: MarkValueProp<number> | PointOpacityStyle;
  /** 描边透明度：字符串按字段解析，数字为常量糖 */
  drawOpacity?: MarkValueProp<number> | PointOpacityStyle;
  /** 旋转角度：字符串按字段解析，数字为常量糖 */
  rotate?: MarkValueProp<number> | PointNumberStyle;
  /** node padding：字符串按字段解析，数字为常量糖 */
  padding?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  /** 最小视觉尺寸；size 通道逐 datum 优先 */
  minimumSize?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  /** 最小视觉宽度 */
  minimumWidth?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  /** 最小视觉高度 */
  minimumHeight?: MarkValueProp<number> | PointNonnegativeNumberStyle;
  /** 绘制顺序提示 */
  zIndex?: MarkValueProp<number> | PointZIndexStyle;
  /** 尺寸字段（数值）：→ size 通道，经 sqrt 半径 scale 映射成 glyph 半径（面积感知正确）；负值报错 */
  size?: FieldName | number | PointSizeStyle;
  /** 不透明度：字符串按字段解析，数字为常量糖 */
  opacity?: MarkValueProp<number> | PointOpacityStyle;
  /** 形状字段（分类）：→ shape 通道，按类别映射到 glyph 调色板（circle/rectangle/diamond）；连续/时间字段报错 */
  shape?: FieldName | NodeShapeChannelValue | PointShapeStyle;
  /** 文本内容字段名：给定则该 point 下沉为无边框带文本的 Node（吸收旧 text mark），否则散点 glyph */
  text?: FieldName;
  /** 文本格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 text 字段同用 */
  displayFormat?: string;
  /** 文本相对锚点水平微调（user units，正 = 右）；仅文本 point 有意义 */
  dx?: number;
  /** 文本相对锚点垂直微调（user units，正 = 屏幕下）；仅文本 point 有意义 */
  dy?: number;
  /** 可选 mark 句柄（预留 scope/anchor） */
  id?: string;
};

/**
 * <IntervalMark> props：区间图层；统一柱 / 直方 / 饼环 / heatmap。
 * @description 便捷 props 是 authoring 糖（自动拼 transform + 抽象 bounds）：x/y 画柱、angle 画饼/环、x0/x1 画直方、
 *   series(+stack) 分组/堆叠；heatmap（双 band）经显式 bounds={{x:{kind:'band'},y:{kind:'band'}}}。
 */
export type IntervalMarkProps = DatumLabelProps & CoreNodeChannelProps & {
  /** 绑 x 位置通道的字段路径（分类，自动 band scale；polar 下作角向类别）；直方连续 x 用 x0/x1 取代 */
  x?: FieldName;
  /** 绑 y 位置通道的字段路径（数值；polar 下作径向值；直方下作箱高度 binValue） */
  y?: FieldName;
  /** polar 饼图 / 环图的份额值字段；设置后自动累积成角界（extent×full bounds），下沉为扇区 */
  angle?: FieldName;
  /** 直方连续 x 区间下界字段（如 bin 的 binStart）；与 x1 配对 → bounds.x = extent(x0,x1) */
  x0?: FieldName;
  /** 直方连续 x 区间上界字段（如 bin 的 binEnd）；与 x0 配对 */
  x1?: FieldName;
  /** 颜色字段（→ color 通道 + 自动色 scale）；缺省取 series */
  color?: FieldName;
  /** 系列字段：拆成多组 / 多系列柱；缺省单系列 */
  series?: FieldName;
  /** 多系列时是否堆叠（true=stack，自动 stack transform + bounds.y=extent）；否则并排（dodge，bounds.x=band{group}） */
  stack?: boolean;
  /** 显式 per-role 区间来源（高级 / heatmap 双 band）：给定则直接落 IR bounds，便捷 props 之外的逃生舱 */
  bounds?: IntervalBounds;
  fill?: FieldName | IRPaintSpec | PointFillStyle;
  stroke?: FieldName | IRPaintSpec | PointStrokeStyle;
  strokeWidth?: MarkValueProp<number> | PointStrokeWidthStyle;
  fillOpacity?: MarkValueProp<number> | PointOpacityStyle;
  opacity?: MarkValueProp<number> | PointOpacityStyle;
  /** 可选 mark 句柄（预留 scope/anchor） */
  id?: string;
};


/**
 * <ReferenceMark> props：参考标注图层（阈值线 / 容差带）。取向由给 x（竖直）还是 y（水平）决定，二选一。
 * @description 扁平 props：数字 → IR 常量 value、字符串 → IR field（per-datum）。只给下界（x / y）→ line；
 *   配上界（xTo 与 x 配对 / yTo 与 y 配对）→ band [lo,hi]。extent 给对侧维起止字段截成部分长度。
 */
export type ReferenceMarkProps = Omit<CoreNodeChannelProps, 'scale' | 'dashPattern' | 'shadow' | 'blendMode'> & CorePathChannelProps & {
  /** 竖直参考的常量轴绑定（x=const 跨满 y 域）：数字 → 常量 value、字符串 → 字段 field（每行一条） */
  x?: number | FieldName;
  /** 水平参考的常量轴绑定（y=const 跨满 x 域）：数字 → 常量 value、字符串 → 字段 field（每行一条） */
  y?: number | FieldName;
  /** 竖直 band 上界（与 x 配对 → x∈[x,xTo] 填充带）：数字 → 常量、字符串 → 字段；缺 → line */
  xTo?: number | FieldName;
  /** 水平 band 上界（与 y 配对 → y∈[y,yTo] 填充带）：数字 → 常量、字符串 → 字段；缺 → line */
  yTo?: number | FieldName;
  /** 对侧维部分长度起点字段（与 extentToField 成对）；缺 → 满铺对侧轴域 */
  extentField?: FieldName;
  /** 对侧维部分长度终点字段（与 extentField 成对）；缺 → 满铺对侧轴域 */
  extentToField?: FieldName;
  /** 颜色：数字 / 颜色串常量 → value（line→stroke / band→fill）；字段名 → field（per-datum 按色分组） */
  color?: string;
  strokeWidth?: MarkValueProp<number> | PointStrokeWidthStyle;
  fillOpacity?: MarkValueProp<number> | PointOpacityStyle;
  opacity?: MarkValueProp<number> | PointOpacityStyle;
  /** Extension channel bindings forwarded to `encoding.channels`; string values are field names. */
  channels?: Record<string, ExtensionChannelProp>;
  /** 可选 mark 句柄（预留 scope/anchor） */
  id?: string;
};

/**
 * <LinkMark> props：流带图层（sankey / alluvial 流量），每行一条源 → 目标的可填充 cubic 曲带。
 * @description 扁平 props：端点拆成 sourceX/sourceY/targetX/targetY 顶层字段串（经坐标系投影），value 字段 → 带宽。
 *   布局（节点排布 / 流量堆叠）须由 transform / 预处理算好写回数据。
 */
export type LinkMarkProps = CorePathChannelProps & {
  /** 源端 x 位置通道字段（经坐标系投影成屏幕点） */
  sourceX: FieldName;
  /** 源端 y 位置通道字段 */
  sourceY: FieldName;
  /** 目标端 x 位置通道字段 */
  targetX: FieldName;
  /** 目标端 y 位置通道字段 */
  targetY: FieldName;
  /** 流量字段：经合成 width 线性 scale 映射成源端带宽 */
  value: FieldName;
  /** 目标端宽度字段：缺省 = 与源端等宽（等宽带）；给定 → 喇叭带 */
  endWidth?: FieldName;
  /** cubic 控制点沿主轴外推比例 0..1（0=准直、大=更 S）；缺省 0.5 */
  curvature?: number;
  /** 主轴取向：horizontal 出入切向沿 x、半宽沿 y（左右流）；vertical 反之；缺省 horizontal */
  orientation?: 'horizontal' | 'vertical';
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省按图层序取默认色 */
  color?: FieldName;
  fillOpacity?: MarkValueProp<number> | PointOpacityStyle;
  opacity?: MarkValueProp<number> | PointOpacityStyle;
  /** Extension channel bindings forwarded to `encoding.channels`; string values are field names. */
  channels?: Record<string, ExtensionChannelProp>;
  /** 可选 mark 句柄（预留 scope/anchor） */
  id?: string;
};

/**
 * 折线图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const PathMark: FC<PathMarkProps> = () => null;

/** 散点 / 文本图层声明组件（给 text → 无边框文本 Node） */
export const PointMark: FC<PointMarkProps> = () => null;

/** 区间图层声明组件（柱 / 直方 / 饼环 / heatmap，统一） */
export const IntervalMark: FC<IntervalMarkProps> = () => null;


/** 参考标注（阈值线 / 容差带）图层声明组件 */
export const ReferenceMark: FC<ReferenceMarkProps> = () => null;

/** 流带（sankey / alluvial）图层声明组件 */
export const LinkMark: FC<LinkMarkProps> = () => null;
