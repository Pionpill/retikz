import type { ValueOf } from '@retikz/core';

/**
 * mark 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'point'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotMark.x)（不用 z.enum）。
 *   6 个抽象 mark = 4 个维度 mark（point / path / region / interval，描述数据在坐标空间的 k 维几何）
 *   + 2 个特殊 mark（link / reference，复用维度 mark 投影但语义不等同）。
 */
export const PlotMark = {
  /** 维度 mark / 0D：坐标元组上的实体 / glyph / 文本 anchor（散点 + 文本标签） */
  Point: 'point',
  /** 维度 mark / 1D：有序点连成的一维轨迹（折线 / 闭合轮廓） */
  Path: 'path',
  /** 维度 mark / 2D：边界围出的可填充区域（面积 / 填充雷达 / 置信带） */
  Region: 'region',
  /** 维度 mark / 区间积：各位置 role 正交区间积，经坐标系投影成段 / 矩形 / 扇区 / cell（柱 / histogram / heatmap / 径向柱 / 饼环） */
  Interval: 'interval',
  /** 特殊 mark / relation：source→target 关系几何（sankey / alluvial 流带） */
  Link: 'link',
  /** 特殊 mark / reference：固定位置 / 区间的参考约束（阈值线 / 容差带） */
  Reference: 'reference',
} as const;

/** mark 类型 */
export type PlotMarkValue = ValueOf<typeof PlotMark>;

/**
 * 流带主轴取向关键字（暴露给用户；裸 `'horizontal'` / `'vertical'` 同样可用）
 * @description 决定 link 的出 / 入切向与四角半宽方向：horizontal 出入沿 x（半宽沿 y），vertical 出入沿 y（半宽沿 x）。
 */
export const LinkOrientation = {
  /** 水平流：出 / 入切向沿 x，半宽沿 y（sankey 左右流） */
  Horizontal: 'horizontal',
  /** 竖直流：出 / 入切向沿 y，半宽沿 x（自上而下流） */
  Vertical: 'vertical',
} as const;

/** 流带主轴取向 */
export type LinkOrientationValue = ValueOf<typeof LinkOrientation>;

/**
 * PathMark 相邻点连接方式。
 * @description 面向图表层的曲线类型；底层会下沉为 core Path 的 line / cubic / smooth steps。
 */
export const PathCurve = {
  /** 折线连接：每相邻两点用直线段连接 */
  Linear: 'linear',
  /** 阶梯线：水平段在相邻点中间切换 */
  Step: 'step',
  /** 前置阶梯：先切换到下一个 y，再沿 x 前进 */
  StepBefore: 'stepBefore',
  /** 后置阶梯：先沿 x 前进，再切换到下一个 y */
  StepAfter: 'stepAfter',
  /** 基础 B 样条：平滑但通常不穿过每个中间点 */
  Basis: 'basis',
  /** Cardinal 样条：穿过数据点，曲率较柔和 */
  Cardinal: 'cardinal',
  /** Catmull-Rom 样条：穿过数据点，局部形状跟随相邻点 */
  CatmullRom: 'catmullRom',
  /** x 单调三次插值：适合 x 递增的趋势线，减少极值过冲 */
  MonotoneX: 'monotoneX',
  /** y 单调三次插值：适合 y 递增的轨迹，减少极值过冲 */
  MonotoneY: 'monotoneY',
  /** 自然三次样条：整体连续、端点二阶导为 0 */
  Natural: 'natural',
} as const;

/**
 * interval 单维区间来源关键字（暴露给用户；裸 `'band'` 等同样可用）
 * @description interval 各位置 role 的区间 [lo,hi] 怎么来：band（band 宽）/ span（baseline→值）/ extent（两字段区间）/ full（满域）。
 */
export const IntervalBoundKind = {
  /** 中心取位置通道、宽取 band scale bandwidth；可选 group 字段把 band 切等分子带（分组柱 / dodge） */
  Band: 'band',
  /** baseline（默认 0）→ 位置通道值；经典柱高 / 径向柱 */
  Span: 'span',
  /** 两字段显式区间：histogram 箱边 / 堆叠 y0,y1 / 累积饼角 start,end */
  Extent: 'extent',
  /** 满铺该 role 的坐标域（极坐标 inner→outer 半径；饼 / 环半径方向） */
  Full: 'full',
} as const;

/** interval 单维区间来源 */
export type IntervalBoundKindValue = ValueOf<typeof IntervalBoundKind>;

export const MarkValueKind = {
  /** 从数据字段解析视觉值 */
  Field: 'field',
  /** 直接使用常量视觉值 */
  Constant: 'constant',
} as const;

/** 内置 mark type 集合；自定义 mark 的 type 不能与之冲突。 */
export const BUILTIN_MARK_TYPES = new Set<string>(Object.values(PlotMark));
