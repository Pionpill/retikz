import type {
  BlendModeValue,
  IRAxisScale,
  IRBoundary,
  IRBoxSize,
  IRBoxSpacing,
  IRDropShadow,
  IRFont,
  IRPaintSpec,
  IRPathScale,
  IRShapeRef,
  JsonValue,
  NodeTextAlignValue,
  ShadowPresetValue,
} from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import type {
  IRPlotAnchorIdSpec,
  IRPlotBlendModeStyle,
  IRPlotChannel,
  IRPlotIntervalBounds,
  IRPlotLayer,
  IRPlotNodeAxisScaleStyle,
  IRPlotNodeBooleanStyle,
  IRPlotNodeBoundaryStyle,
  IRPlotNodeBoxSizeStyle,
  IRPlotNodeBoxSpacingStyle,
  IRPlotNodeDashPatternStyle,
  IRPlotNodeFontStyle,
  IRPlotNodePositiveNumberStyle,
  IRPlotNodeTextAlignStyle,
  IRPlotPathClosure,
  IRPlotPathFillRuleStyle,
  IRPlotPathScaleStyle,
  IRPlotPathThicknessStyle,
  IRPlotPointColorStyle,
  IRPlotPointFillStyle,
  IRPlotPointNonnegativeNumberStyle,
  IRPlotPointNumberStyle,
  IRPlotPointOpacityStyle,
  IRPlotPointShapeStyle,
  IRPlotPointSizeStyle,
  IRPlotPointStrokeStyle,
  IRPlotPointStrokeWidthStyle,
  IRPlotPointZIndexStyle,
  IRPlotRelationPathSpecificOptions,
  IRPlotRelationPrimitiveStyle,
  IRPlotRelationRibbonOptions,
  IRPlotShadowStyle,
  IRPlotTargetRef,
  IRPlotTransform,
  MarkGeometryLabelInput,
  MarkNodeLabelInput,
  MarkValueType,
  PathCurveValue,
  RelationGeometryKindValue,
  RelationPathGeometryInput,
} from '@retikz/plot';
import type { FC } from 'react';

/** 数据字段名或字段路径；例如 `month` / `user.age`，用于 React DSL 的数据通道 props */
export type FieldName = string;

/** mark 样式值输入：字段名、直接常量或显式的字段 / 常量绑定 */
export type MarkValueProp<T> = FieldName | T | MarkValueType<T>;

/** 路径端点样式 */
export type LineCapValue = 'butt' | 'round' | 'square';

/** 路径折点连接样式 */
export type LineJoinValue = 'miter' | 'round' | 'bevel';

/** 路径填充规则 */
export type FillRuleValue = 'nonzero' | 'evenodd';

/** 路径预设粗细 */
export type ThicknessValue = 'ultraThin' | 'veryThin' | 'thin' | 'semithick' | 'thick' | 'veryThick' | 'ultraThick';

/** 节点形状通道值：内置 / 自定义形状名或完整形状引用 */
export type NodeShapeChannelValue = string | IRShapeRef;

/** 扩展通道属性：字段名、JSON 常量、通道绑定或显式 mark 值 */
export type ExtensionChannelProp = FieldName | JsonValue | IRPlotChannel | MarkValueType<JsonValue>;

/** 所有 mark 共享的局部数据变换与语义图层属性 */
export type MarkTransformProps = {
  /** 只作用于当前 mark 数据视图的变换链 */
  transform?: Array<IRPlotTransform>;
  /** 语义图层覆盖；控制该 mark 外层 scope 在 plot 内的 zIndex */
  layer?: IRPlotLayer;
};

/** mark 绑定组合坐标视图的共享属性 */
export type CoordinateScopeProps = {
  /** 直接绑定的坐标视图 id */
  coordinateView?: string;
  /** 分面声明 id；构建 PlotSpec 时展开为对应坐标视图 */
  facetId?: string;
  /** 共享轨道 id；构建 PlotSpec 时展开为对应坐标视图 */
  trackId?: string;
};

/** 可通过通道逐 datum 下发到 core Node 的样式属性 */
export type CoreNodeChannelProps = {
  /** 文本水平对齐方式 */
  align?: MarkValueProp<NodeTextAlignValue> | IRPlotNodeTextAlignStyle;
  /** 文本行高 */
  lineHeight?: MarkValueProp<number> | IRPlotNodePositiveNumberStyle;
  /** 文本最大宽度 */
  maxTextWidth?: MarkValueProp<number> | IRPlotNodePositiveNumberStyle;
  /** 节点圆角半径 */
  cornerRadius?: MarkValueProp<number> | IRPlotPointNonnegativeNumberStyle;
  /** 节点缩放值或轴向缩放配置 */
  scale?: MarkValueProp<number | IRAxisScale> | IRPlotNodeAxisScaleStyle;
  /** 节点内边距 */
  padding?: MarkValueProp<number | IRBoxSpacing> | IRPlotNodeBoxSpacingStyle;
  /** 节点外边距 */
  margin?: MarkValueProp<number | IRBoxSpacing> | IRPlotNodeBoxSpacingStyle;
  /** 是否使用虚线描边 */
  dashed?: MarkValueProp<boolean> | IRPlotNodeBooleanStyle;
  /** 是否使用点线描边 */
  dotted?: MarkValueProp<boolean> | IRPlotNodeBooleanStyle;
  /** 自定义描边间隔 */
  dashPattern?: MarkValueProp<Array<number>> | IRPlotNodeDashPatternStyle;
  /** 字体配置 */
  font?: MarkValueProp<IRFont> | IRPlotNodeFontStyle;
  /** 节点边界策略 */
  boundary?: MarkValueProp<IRBoundary> | IRPlotNodeBoundaryStyle;
  /** 节点阴影 */
  shadow?: MarkValueProp<ShadowPresetValue | IRDropShadow> | IRPlotShadowStyle;
  /** 节点混合模式 */
  blendMode?: MarkValueProp<BlendModeValue> | IRPlotBlendModeStyle;
};

/** 可通过通道逐 datum 下发到 core Path 的样式属性 */
export type CorePathChannelProps = {
  /** 路径填充；字符串优先按字段名解析 */
  fill?: FieldName | IRPaintSpec | IRPlotPointFillStyle;
  /** 路径描边；字符串优先按字段名解析 */
  stroke?: FieldName | IRPaintSpec | IRPlotPointStrokeStyle;
  /** 描边透明度 */
  strokeOpacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
  /** 路径绘制顺序提示 */
  zIndex?: MarkValueProp<number> | IRPlotPointZIndexStyle;
  /** 路径旋转角度 */
  rotate?: MarkValueProp<number> | IRPlotPointNumberStyle;
  /** 路径缩放配置 */
  scale?: MarkValueProp<IRPathScale> | IRPlotPathScaleStyle;
  /** 路径填充规则 */
  fillRule?: MarkValueProp<FillRuleValue> | IRPlotPathFillRuleStyle;
  /** 路径预设粗细 */
  thickness?: MarkValueProp<ThicknessValue> | IRPlotPathThicknessStyle;
  /** 路径上的标记配置 */
  marks?: IRPlotRelationPathSpecificOptions['marks'];
  /** 自定义描边间隔 */
  dashPattern?: MarkValueProp<Array<number>> | IRPlotNodeDashPatternStyle;
  /** 路径阴影 */
  shadow?: MarkValueProp<ShadowPresetValue | IRDropShadow> | IRPlotShadowStyle;
  /** 路径混合模式 */
  blendMode?: MarkValueProp<BlendModeValue> | IRPlotBlendModeStyle;
};

/**
 * 宿主 datum label 扁平属性：给位置 mark（point / interval / path）添加最高优先级的 datum 标签。
 * @description label 顶层 string 默认按字段解析（装成 IR label.content 的 field）；labelDisplayFormat 进 IR（d3-format / d3-time-format 串）；
 *   labelPosition / labelDistance / labelPin 摊进 core NodeLabelSchema；resolveLabel 是运行时逃生舱（不进 IR、按 mark id 经 options 注入，需配 id）
 */
export type DatumLabelProps = {
  /** 扩展通道绑定，会转发到 `encoding.channels`；字符串值按字段名处理 */
  channels?: Record<string, ExtensionChannelProp>;
  /** datum 标签内容字段名（→ IR label.content.field；优先级低于 resolveLabel、高于无）；缺省不挂标签 */
  label?: FieldName;
  /** 标签格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 label 字段同用 */
  labelDisplayFormat?: string;
  /** 标签相对宿主 Node 边框方位；Web 名为 canonical，compass 写法作为输入别名 */
  labelPosition?: MarkNodeLabelInput['position'];
  /** 标签离宿主边框距离（user units）；缺省 12（对齐 core NodeLabelSchema.distance） */
  labelDistance?: number;
  /** 从宿主边框拉引线到标签（core leader）；缺省 false */
  labelPin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number> };
  labelTextColor?: string;
  labelOpacity?: number;
  labelFont?: {
    family?: string;
    size?: number;
    weight?: 'normal' | 'bold' | number;
    style?: 'normal' | 'italic' | 'oblique';
  };
  labelRotate?: 'none' | 'radial' | 'tangent' | number;
  labelKeepUpright?: boolean;
  /** 完全自定义标签逃生舱（运行时函数，不进 IR；最高优先，覆盖 label/labelDisplayFormat）；需配 mark id 经 options 注入 */
  resolveLabel?: (row: ExternalRow) => string;
};

/** <PathMark> props：折线图层，按 order（缺省按数据顺序）连点成一维轨迹 */
export type PathMarkProps = MarkTransformProps &
  CoordinateScopeProps &
  CorePathChannelProps & {
    /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
    x: FieldName;
    /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
    y: FieldName;
    /** 适配器专用糖：把图元绑定到命名 x 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    xAxisId?: string;
    /** 适配器专用糖：把图元绑定到命名 y 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    yAxisId?: string;
    /** 驱动连接顺序的字段；缺省按数据数组顺序 */
    order?: FieldName;
    /** 系列字段：按其拆成多条折线（多系列）；缺省单线 */
    series?: FieldName;
    /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多条线；缺省取 series。连续 / 时间字段报错 */
    color?: FieldName;
    label?: MarkGeometryLabelInput | Array<MarkGeometryLabelInput>;
    resolveLabel?: (row: ExternalRow) => string;
    strokeWidth?: MarkValueProp<number> | IRPlotPointStrokeWidthStyle;
    opacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    lineCap?: FieldName | LineCapValue | MarkValueType<LineCapValue>;
    lineJoin?: FieldName | LineJoinValue | MarkValueType<LineJoinValue>;
    roundedCorners?: MarkValueProp<number> | IRPlotPointNonnegativeNumberStyle;
    /** 末点回连首点闭合成多边形（polar 下即雷达轮廓）；cartesian 缺省 false，polar2D 缺省 true */
    closed?: boolean;
    /** 是否跨过缺失 / 无效点继续连接；缺省 false 时会切成多个 core Path */
    connectNulls?: boolean;
    /** 构建闭合路径：cycle 首尾闭合，baseline 回到基线，stack 回到逐行基线字段；是否填充由 fill 控制 */
    closure?: IRPlotPathClosure;
    /** 相邻点连接方式；缺省 linear */
    curve?: PathCurveValue;
    /** 可选 mark 句柄（预留 scope/anchor） */
    id?: string;
    anchorId?: IRPlotAnchorIdSpec;
    /** 扩展通道绑定，会转发到 `encoding.channels`；字符串值按字段名处理 */
    channels?: Record<string, ExtensionChannelProp>;
  };

/** <PointMark> props：散点 / 文本图层，每行一个 glyph（给 text → 无边框文本 Node） */
export type PointMarkProps = MarkTransformProps &
  CoordinateScopeProps &
  DatumLabelProps &
  CoreNodeChannelProps & {
    /**
     * 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值；cartesian1D / polar1D 单维亦用 x）。
     * 可选：一维用 x，二维用 x/y；必填性由坐标系在 lowering 校验
     */
    x?: FieldName;
    /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值；cartesian2D / polar2D 必填，1D 省略） */
    y?: FieldName;
    /** 自定义坐标系可消费的第三位置 role；内置坐标系不使用 */
    z?: FieldName;
    /** 适配器专用糖：把图元绑定到命名 x 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    xAxisId?: string;
    /** 适配器专用糖：把图元绑定到命名 y 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    yAxisId?: string;
    /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale） */
    color?: FieldName | IRPlotPointColorStyle;
    textColor?: FieldName | IRPlotPointColorStyle;
    /** 填充：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }` */
    fill?: FieldName | IRPaintSpec | IRPlotPointFillStyle;
    /** 描边颜色：字符串优先按数据字段解析；需要强制常量时用 `{ kind: 'constant', value }` */
    stroke?: FieldName | IRPaintSpec | IRPlotPointStrokeStyle;
    /** 描边宽度：字符串优先按数据字段解析，数字为常量糖；需要显式控制时用 `{ kind, value }` */
    strokeWidth?: FieldName | number | IRPlotPointStrokeWidthStyle;
    /** 填充透明度：字符串按字段解析，数字为常量糖 */
    fillOpacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    /** 描边透明度：字符串按字段解析，数字为常量糖 */
    strokeOpacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    /** 旋转角度：字符串按字段解析，数字为常量糖 */
    rotate?: MarkValueProp<number> | IRPlotPointNumberStyle;
    /** node padding：字符串按字段解析，数字或对象为常量糖 */
    padding?: MarkValueProp<number | IRBoxSpacing> | IRPlotNodeBoxSpacingStyle;
    /** 最小视觉尺寸；size 通道逐 datum 优先 */
    minimumSize?: MarkValueProp<number | IRBoxSize> | IRPlotNodeBoxSizeStyle;
    /** 绘制顺序提示 */
    zIndex?: MarkValueProp<number> | IRPlotPointZIndexStyle;
    /** 尺寸字段（数值）：→ size 通道，经 sqrt 半径 scale 映射成 glyph 半径（面积感知正确）；负值报错 */
    size?: FieldName | number | IRPlotPointSizeStyle;
    /** 不透明度：字符串按字段解析，数字为常量糖 */
    opacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    /** 形状字段（分类）：→ shape 通道，按类别映射到 glyph 调色板（circle/rectangle/diamond）；连续/时间字段报错 */
    shape?: FieldName | NodeShapeChannelValue | IRPlotPointShapeStyle;
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
    anchorId?: IRPlotAnchorIdSpec;
  };

/**
 * <IntervalMark> props：区间图层；统一柱 / 直方 / 饼环 / heatmap。
 * @description 便捷 props 是 authoring 糖（自动拼 transform + 抽象 bounds）：x/y 画柱、angle 画饼/环、x0/x1 画直方、
 *   series(+stack) 分组/堆叠；heatmap（双 band）经显式 bounds={{x:{kind:'band'},y:{kind:'band'}}}
 */
export type IntervalMarkProps = MarkTransformProps &
  CoordinateScopeProps &
  DatumLabelProps &
  CoreNodeChannelProps & {
    /** 绑 x 位置通道的字段路径（分类，自动 band scale；polar 下作角向类别）；直方连续 x 用 x0/x1 取代 */
    x?: FieldName;
    /** 绑 y 位置通道的字段路径（数值；polar 下作径向值；直方下作箱高度 binCount 或自定义 metric 字段） */
    y?: FieldName;
    /** 适配器专用糖：把图元绑定到命名 x 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    xAxisId?: string;
    /** 适配器专用糖：把图元绑定到命名 y 轴；输出 PlotSpec 前会展开为 `coordinateView` */
    yAxisId?: string;
    /** polar 饼图 / 环图的份额值字段；设置后自动累积成角界（extent×full bounds），下沉为扇区 */
    angle?: FieldName;
    /** 直方连续 x 区间下界字段（如 bin 的 binStart）；与 x1 配对 → bounds.x = extent(x0,x1) */
    x0?: FieldName;
    /** 直方连续 x 区间上界字段（如 bin 的 binEnd）；与 x0 配对 */
    x1?: FieldName;
    /** 比例区间宽度字段；按行顺序推导连续区间 */
    width?: FieldName;
    /** 柱方向；horizontal 会把 x 当作数值、y 当作类别 */
    direction?: 'vertical' | 'horizontal';
    /** 颜色字段（→ color 通道 + 自动色 scale）；缺省取 series */
    color?: FieldName;
    /** 系列字段：拆成多组 / 多系列柱；缺省单系列 */
    series?: FieldName;
    /** 多系列排布的分组字段，供 dodge / stack / normalize-stack 使用 */
    group?: FieldName;
    /** 多系列区间的并排、堆叠或百分比堆叠策略 */
    arrangement?: 'dodge' | 'stack' | 'normalize-stack';
    /** arrangement="stack" 使用的堆叠基线策略 */
    stackOffset?: 'zero' | 'normalize' | 'diverging' | 'center' | 'overlap';
    /** 百分比堆叠简写，等价于 arrangement="normalize-stack" */
    percent?: boolean;
    /** 多系列时是否堆叠（true=stack，自动 stack transform + bounds.y=extent）；否则并排（dodge，bounds.x=band{group}） */
    stack?: boolean;
    /** 显式 per-role 区间来源（高级 / heatmap 双 band）：给定则直接落 IR bounds，便捷 props 之外的逃生舱 */
    bounds?: IRPlotIntervalBounds;
    fill?: FieldName | IRPaintSpec | IRPlotPointFillStyle;
    stroke?: FieldName | IRPaintSpec | IRPlotPointStrokeStyle;
    strokeWidth?: MarkValueProp<number> | IRPlotPointStrokeWidthStyle;
    fillOpacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    opacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    /** 极坐标扇区或环形区间之间的角度间隔 */
    padAngle?: number;
    /** 极坐标扇区沿半径方向的静态视觉偏移 */
    pull?: MarkValueProp<number> | IRPlotPointNonnegativeNumberStyle;
    /** 可选 mark 句柄（预留 scope/anchor） */
    id?: string;
    anchorId?: IRPlotAnchorIdSpec;
  };

/** <RelationMark> props：连接两个目标的路径或 ribbon 关系图层 */
export type RelationMarkProps = MarkTransformProps &
  CoordinateScopeProps & {
    /** 可选 mark 句柄，用于生成稳定的关系图层 id */
    id?: string;
    /** 关系几何类型 */
    kind?: RelationGeometryKindValue;
    /** 关系起点引用 */
    source: IRPlotTargetRef;
    /** 关系终点引用 */
    target: IRPlotTargetRef;
    /** 关系几何上的标签 */
    label?: MarkGeometryLabelInput | Array<MarkGeometryLabelInput>;
    /** 关系 primitive 的视觉样式 */
    style?: IRPlotRelationPrimitiveStyle;
    /** 路径关系的几何配置 */
    path?: RelationPathGeometryInput;
    /** ribbon 关系的宽度与轮廓配置 */
    ribbon?: IRPlotRelationRibbonOptions;
    /** 驱动关系颜色的字段名 */
    color?: FieldName;
    /** 扩展通道绑定；字符串值按字段名处理 */
    channels?: Record<string, ExtensionChannelProp>;
  };

type ReferenceMarkLabel =
  | MarkNodeLabelInput
  | Array<MarkNodeLabelInput>
  | MarkGeometryLabelInput
  | Array<MarkGeometryLabelInput>;

/**
 * <ReferenceMark> props：参考标注图层（阈值线 / 容差带 / 参考区域）。
 * @description 扁平 props：数字 → IR 常量 value、字符串 → IR field（per-datum）。只给下界（x / y）→ line；
 *   配上界（xTo 与 x 配对 / yTo 与 y 配对）→ band [lo,hi]。kind="region" 时 x/xTo/y/yTo 围出二维区域。
 *   extent 给对侧维起止字段截成部分长度
 */
export type ReferenceMarkProps = MarkTransformProps &
  CoordinateScopeProps &
  Omit<CoreNodeChannelProps, 'scale' | 'dashPattern' | 'shadow' | 'blendMode'> &
  CorePathChannelProps & {
    /** 参考形态覆写；设为 region 时 x/xTo/y/yTo 四个边界共同围出二维区域 */
    kind?: 'region';
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
    label?: ReferenceMarkLabel;
    strokeWidth?: MarkValueProp<number> | IRPlotPointStrokeWidthStyle;
    fillOpacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    opacity?: MarkValueProp<number> | IRPlotPointOpacityStyle;
    /** 转发到 `encoding.channels` 的扩展通道绑定；字符串值按字段名处理 */
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

/** 起点到终点的关系路径图层声明组件 */
export const RelationMark: FC<RelationMarkProps> = () => null;
