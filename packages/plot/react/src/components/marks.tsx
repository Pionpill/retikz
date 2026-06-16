import type { FC } from 'react';
import type { ExternalRow } from '@retikz/plot';

/**
 * priority-1 宿主 datum label 扁平 props（ADR-04）：给位置 mark（point / bar / line / area）加 datum 标签
 * @description label 顶层 string 默认按字段解析（装成 IR label.content 的 field）；labelFormat 进 IR（d3-format / d3-time-format 串）；
 *   labelPosition / labelDistance / labelPin 摊进 core NodeLabelSchema；resolveLabel 是运行时逃生舱（不进 IR、按 mark id 经 options 注入，需配 id）。
 */
export type DatumLabelProps = {
  /** datum 标签内容字段名（→ IR label.content.field；优先级低于 resolveLabel、高于无）；缺省不挂标签 */
  label?: string;
  /** 标签格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 label 字段同用 */
  labelFormat?: string;
  /** 标签相对宿主 Node 边框方位：8 方向枚举或数字角度（度）；缺省 above（对齐 core NodeLabelSchema.position） */
  labelPosition?: 'above' | 'below' | 'left' | 'right' | 'above-left' | 'above-right' | 'below-left' | 'below-right' | number;
  /** 标签离宿主边框距离（user units）；缺省 12（对齐 core NodeLabelSchema.distance） */
  labelDistance?: number;
  /** 从宿主边框拉引线到标签（core leader）；缺省 false */
  labelPin?: boolean;
  /** 完全自定义标签逃生舱（运行时函数，不进 IR；最高优先，覆盖 label/labelFormat）；需配 mark id 经 options 注入 */
  resolveLabel?: (row: ExternalRow) => string;
};

/** <LineMark> props：折线图层，按 order（缺省按数据顺序）连点 */
export type LineMarkProps = DatumLabelProps & {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: string;
  /** 驱动连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 系列字段：按其拆成多条折线（多系列）；缺省单线 */
  series?: string;
  /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多条线；缺省取 series。连续 / 时间字段报错 */
  color?: string;
  /** 末点回连首点闭合成多边形（polar 下即雷达轮廓）；缺省 false */
  closed?: boolean;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <PointMark> props：散点图层，每行一个 glyph */
export type PointMarkProps = DatumLabelProps & {
  /**
   * 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值；cartesian1D / polar1D 单维亦用 x）。
   * 可选：1D-2D 坐标系用 x/y、ternary2D 用 a/b/c；必填性由坐标系在 lowering 校验。
   */
  x?: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值；cartesian2D / polar2D 必填，1D 省略） */
  y?: string;
  /** ternary2D 的 a 分量字段（顶点朝上 = a 100%）；与 b / c 一起用于三元散点 */
  a?: string;
  /** ternary2D 的 b 分量字段（右下顶点 = b 100%） */
  b?: string;
  /** ternary2D 的 c 分量字段（左下顶点 = c 100%） */
  c?: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale） */
  color?: string;
  /** 尺寸字段（数值）：→ size 通道，经 sqrt 半径 scale 映射成 glyph 半径（面积感知正确）；负值报错 */
  size?: string;
  /** 不透明度字段（连续）：→ opacity 通道，经 clamp linear scale 映射到 [minOpacity, 1]；时间/分类字段报错 */
  opacity?: string;
  /** 形状字段（分类）：→ shape 通道，按类别映射到 glyph 调色板（circle/rectangle/diamond）；连续/时间字段报错 */
  shape?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <BarMark> props：柱状图层，从 baseline 到值的矩形（cartesian 下 x 自动 band；polar 下自动成径向柱、角向自动 band） */
export type BarMarkProps = DatumLabelProps & {
  /** 绑 x 位置通道的字段路径（分类，自动 band scale；polar 下作角向类别） */
  x: string;
  /** 绑 y 位置通道的字段路径（数值；polar 下作径向值） */
  y: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省取 series */
  color?: string;
  /** 系列字段：拆成多组柱；缺省单系列 */
  series?: string;
  /** 多系列时是否堆叠（true=stack，自动装配 stack transform）；否则并排（dodge） */
  stack?: boolean;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <SectorMark> props：扇形图层（饼 / 环），按 angle 值字段自动累积成角界 */
export type SectorMarkProps = {
  /** 角向值字段：内建自动累积成 [起角, 止角]（同 <BarMark stack> 约定，DSL 层不暴露 transform） */
  angle: string;
  /** 颜色字段（→ color 通道 + 自动 ordinal 色 scale）；缺省取 angle 字段本身分类上色 */
  color?: string;
  /** 系列字段：累积时按其排序分段；缺省按数据顺序 */
  series?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <AreaMark> props：面积图层（上沿折线 ↔ baseline 围成可填充区域；polar 下闭合成填充雷达） */
export type AreaMarkProps = DatumLabelProps & {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值） */
  x: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y: string;
  /** 上沿连接顺序的字段；缺省按数据数组顺序 */
  order?: string;
  /** 系列字段：拆成多块面积（多系列）；缺省单块 */
  series?: string;
  /** 回边贴附的 baseline 值；缺省 0 */
  baseline?: number;
  /** 末点回连首点闭合成多边形（polar 下即填充雷达）；缺省 false */
  closed?: boolean;
  /** 颜色字段（categorical，自动 ordinal 色 scale）：无显式 series 时按此字段隐式拆多个面；缺省取 series。连续 / 时间字段报错 */
  color?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/**
 * <RuleMark> props：参考标注图层（阈值线 / 容差带）。取向由给 x（竖直）还是 y（水平）决定，二选一。
 * @description 扁平 props：数字 → IR 常量 value、字符串 → IR field（per-datum）。只给下界（x / y）→ line；
 *   配上界（xTo 与 x 配对 / yTo 与 y 配对）→ band [lo,hi]。extent 给对侧维起止字段截成部分长度。
 */
export type RuleMarkProps = {
  /** 竖直 rule 的常量轴绑定（x=const 跨满 y 域）：数字 → 常量 value、字符串 → 字段 field（每行一条） */
  x?: number | string;
  /** 水平 rule 的常量轴绑定（y=const 跨满 x 域）：数字 → 常量 value、字符串 → 字段 field（每行一条） */
  y?: number | string;
  /** 竖直 band 上界（与 x 配对 → x∈[x,xTo] 填充带）：数字 → 常量、字符串 → 字段；缺 → line */
  xTo?: number | string;
  /** 水平 band 上界（与 y 配对 → y∈[y,yTo] 填充带）：数字 → 常量、字符串 → 字段；缺 → line */
  yTo?: number | string;
  /** 对侧维部分长度起点字段（与 extentToField 成对）；缺 → 满铺对侧轴域 */
  extentField?: string;
  /** 对侧维部分长度终点字段（与 extentField 成对）；缺 → 满铺对侧轴域 */
  extentToField?: string;
  /** 颜色：数字 / 颜色串常量 → value（line→stroke / band→fill）；字段名 → field（per-datum 按色分组） */
  color?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/** <RectMark> props：矩形格图层（heatmap），x / y 均分类（双 band），值经 color 通道映射成格子填充 */
export type RectMarkProps = {
  /** 绑 x 位置通道的字段路径（分类，自动 band scale，定格宽） */
  x: string;
  /** 绑 y 位置通道的字段路径（分类，自动 band scale，定格高） */
  y: string;
  /** 颜色字段（→ color 通道 + 自动色 scale）：值映射成格子填充；连续字段配 model 时自动派生 sequential 色阶。缺省纯网格（回退默认填充） */
  color?: string;
  /** 可选 mark 句柄（预留 scope/anchor，解析留 alpha.5） */
  id?: string;
};

/**
 * 折线图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const LineMark: FC<LineMarkProps> = () => null;

/**
 * 散点图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const PointMark: FC<PointMarkProps> = () => null;

/**
 * 柱状图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 type + props 装配进 PlotSpec
 */
export const BarMark: FC<BarMarkProps> = () => null;

/**
 * 扇形（饼 / 环）图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec；
 *   内建自动累积——同步装配 stack transform（无分组单链）+ sector mark 读累积界为角度
 */
export const SectorMark: FC<SectorMarkProps> = () => null;

/**
 * 面积图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec
 */
export const AreaMark: FC<AreaMarkProps> = () => null;

/**
 * 矩形格（heatmap）图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec；
 *   x / y 双 band 由 build-plot-spec 自动推断（heatmap 双轴分类定格），值经 color 通道映射成格子填充
 */
export const RectMark: FC<RectMarkProps> = () => null;

/**
 * 参考标注（阈值线 / 容差带）图层声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec；
 *   数字 → IR value 常量、字符串 → IR field；取向 / band 上界 / extent 配对的校验在 build-plot-spec fail-loud
 */
export const RuleMark: FC<RuleMarkProps> = () => null;

/**
 * <TextMark> props：自由文本图层（priority-2 兜底，ADR-04）。无宿主、投影同 point、新建带 text 的 core Node。
 * @description 标注另一 mark 的 datum 请优先用该 mark 的 label 通道（priority-1）；本组件用于无宿主的自由浮动文本 / 注解。
 *   x / y / text / color 顶层 string 默认按字段解析；dx / dy 是相对锚点的像素级微调逃生舱（首选用宿主 label 的 position/distance）。
 */
export type TextMarkProps = {
  /** 绑 x 位置通道的字段路径（polar 下坐标系重解释为角向值；与 point 同源投影） */
  x?: string;
  /** 绑 y 位置通道的字段路径（polar 下坐标系重解释为径向值） */
  y?: string;
  /** ternary2D 的 a 分量字段 */
  a?: string;
  /** ternary2D 的 b 分量字段 */
  b?: string;
  /** ternary2D 的 c 分量字段 */
  c?: string;
  /** 文本内容字段名（装成 IR encoding.text.field；默认按字段解析）；自由文本必填内容 */
  text: string;
  /** 文本格式串（d3-format 数值 / d3-time-format 时间，进 IR）；仅与 text 字段同用 */
  format?: string;
  /** 文本颜色字段（color 通道 + 自动 ordinal 色 scale；落 Node textColor 按色分子 Scope） */
  color?: string;
  /** 相对锚点水平微调（user units，正 = 右）；逃生舱，首选用宿主 label position/distance */
  dx?: number;
  /** 相对锚点垂直微调（user units，正 = 屏幕下）；逃生舱 */
  dy?: number;
  /** 完全自定义文本逃生舱（运行时函数，不进 IR；最高优先，覆盖 text/format）；需配 mark id 经 options 注入 */
  resolveLabel?: (row: ExternalRow) => string;
  /** 可选 mark 句柄（预留 scope/anchor；resolveLabel 注入也按此 id 命中） */
  id?: string;
};

/**
 * 自由文本图层声明组件（priority-2 兜底，ADR-04）
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装配进 PlotSpec；
 *   投影同 point（坐标系无关），新建带 text 的 core Node。标注别的 mark 的 datum 优先用该 mark 的 label 通道
 */
export const TextMark: FC<TextMarkProps> = () => null;
