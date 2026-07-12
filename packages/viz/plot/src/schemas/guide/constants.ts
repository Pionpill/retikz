import { GeometryLabelPosition } from '@retikz/core';

/**
 * guide 类型关键字（暴露给用户；成员值即 IR 判别串，裸字面量 `'axis'` 同样可用）
 * @description grammar-of-graphics 的 guide 是 scale 的可视化身（坐标轴 / 图例等）。
 */
export const PlotGuide = {
  /** 坐标轴：轴线 + 刻度 + 刻度标签，可选对齐网格 */
  Axis: 'axis',
  /** 图例：把非位置 scale（颜色 / 尺寸 / 透明度 / 形状）可视化为 swatch / 色带 ramp / 分箱 / 梯度符号 */
  Legend: 'legend',
} as const;

/**
 * 坐标轴摆放方式关键字。
 * @description auto 由坐标系按维度推断；side 使用笛卡尔式四边；edge 使用坐标系原生边。
 */
export const AxisPlacementKind = {
  /** 由坐标系和 dimension 自动推断。 */
  Auto: 'auto',
  /** 放在 plotArea 的四个方向之一。 */
  Side: 'side',
  /** 放在坐标系原生 edge 上，供 ternary / custom coordinate 使用。 */
  Edge: 'edge',
  /** 穿过另一维指定数据值，仅 cartesian axis 支持。 */
  Origin: 'origin',
} as const;

/**
 * 笛卡尔式四方向轴位置。
 * @description 只表达 top/right/bottom/left；非四边形坐标系应使用 auto 或 edge。
 */
export const AxisCardinalSide = {
  /** plotArea 上边。 */
  Top: 'top',
  /** plotArea 右边。 */
  Right: 'right',
  /** plotArea 下边。 */
  Bottom: 'bottom',
  /** plotArea 左边。 */
  Left: 'left',
} as const;

/**
 * 坐标轴网格投放模式。
 * @description `local` 只投放到坐标轴绑定的坐标视图；`all` 投放到组合结构选中的坐标视图；`selected` 使用显式选择器。
 */
export const AxisGridApplyTo = {
  /** 只投放到坐标轴绑定的坐标视图。 */
  Local: 'local',
  /** 投放到组合结构选中的所有坐标视图。 */
  All: 'all',
  /** 不为该坐标轴投放网格。 */
  None: 'none',
  /** 只投放到选择器命中的坐标视图、分面面板或轨道。 */
  Selected: 'selected',
} as const;

/** 固定间隔 tick source kind。 */
export const GuideTickIntervalKind = {
  /** 数值轴按固定数值步长生成 tick。 */
  Number: 'number',
  /** 时间轴按固定 UTC 时间单位生成 tick。 */
  Time: 'time',
  /** 分类型轴按类别序号间隔抽取 tick。 */
  Category: 'category',
} as const;

/** 时间间隔单位。 */
export const GuideTickTimeUnit = {
  Millisecond: 'millisecond',
  Second: 'second',
  Minute: 'minute',
  Hour: 'hour',
  Day: 'day',
  Week: 'week',
  Month: 'month',
  Quarter: 'quarter',
  Year: 'year',
} as const;

/** tick 可见密度策略 kind。 */
export const AxisTickDensityKind = {
  /** 保留全部候选 tick。 */
  All: 'all',
  /** 对候选 tick 做确定性抽样。 */
  Sample: 'sample',
} as const;

/** tick mark 形态 kind。 */
export const AxisTickMarkKind = {
  /** 短线 tick mark。 */
  Line: 'line',
  /** 圆形 tick mark。 */
  Circle: 'circle',
  /** 方形 tick mark。 */
  Square: 'square',
  /** 三角形 tick mark。 */
  Triangle: 'triangle',
  /** 菱形 tick mark。 */
  Diamond: 'diamond',
  /** 自定义 core Node shape tick mark。 */
  Custom: 'custom',
} as const;

/** tick 端点避让影响范围。 */
export const AxisTickEndpointAffect = {
  /** 只隐藏 tick mark，保留 tick label 与 grid。 */
  Mark: 'mark',
  /** 同时隐藏 tick mark 与 tick label，grid 仍使用原 tick source。 */
  MarkAndLabel: 'mark-and-label',
} as const;

/** shape tick mark 方向策略。 */
export const AxisTickShapeOrientation = {
  /** 沿 tick 外法线方向。 */
  Outward: 'outward',
  /** 沿 tick 内法线方向。 */
  Inward: 'inward',
  /** 沿轴线切向。 */
  Axis: 'axis',
  /** 使用显式 rotate 或 0。 */
  Fixed: 'fixed',
} as const;

/** tick label 重叠隐藏策略。 */
export const AxisTickLabelHideStrategy = {
  /** 顺序扫描，保留不与上一个可见 label 重叠的 label。 */
  Greedy: 'greedy',
  /** 先隔一个隐藏一个，不够时继续扩大步长。 */
  Parity: 'parity',
} as const;

/** tick label 超出轴范围时的处理策略。 */
export const AxisTickLabelOverflow = {
  /** 允许超出轴范围。 */
  Allow: 'allow',
  /** 超出容忍范围时隐藏。 */
  Hide: 'hide',
  /** 把首尾附近 label 推回轴范围内。 */
  Flush: 'flush',
} as const;

/** axis title 沿轴线的定位关键字，复用 core path label position 词表。 */
export const AxisTitlePlacementKeyword = GeometryLabelPosition;

/** axis title 对齐锚点。 */
export const AxisTitleAnchor = {
  /** 由坐标轴和 title 位置自动推导。 */
  Auto: 'auto',
  /** 沿轴线负方向一侧对齐。 */
  Start: 'start',
  /** 居中对齐。 */
  Center: 'center',
  /** 沿轴线正方向一侧对齐。 */
  End: 'end',
} as const;

/** axis title 旋转策略。 */
export const AxisTitleOrientation = {
  /** 使用坐标系和轴位置推导的默认旋转。 */
  Auto: 'auto',
  /** 强制标题水平显示。 */
  Horizontal: 'horizontal',
  /** 标题沿轴线切向显示。 */
  Axis: 'axis',
} as const;

/** axis 交叉值处 tick mark 策略。 */
export const AxisCrossingTickPolicy = {
  /** 显示交叉值 tick mark。 */
  Show: 'show',
  /** 隐藏交叉值 tick mark。 */
  Hide: 'hide',
} as const;

/** axis 交叉值处 tick label 策略。 */
export const AxisCrossingLabelPolicy = {
  /** 显示交叉值 tick label。 */
  Show: 'show',
  /** 隐藏交叉值 tick label。 */
  Hide: 'hide',
  /** 将交叉值 tick label 放到交叉点角落。 */
  Corner: 'corner',
} as const;

/** axis 交叉值 label 的角落位置。 */
export const AxisCrossingCorner = {
  /** 左上角。 */
  TopLeft: 'top-left',
  /** 右上角。 */
  TopRight: 'top-right',
  /** 左下角。 */
  BottomLeft: 'bottom-left',
  /** 右下角。 */
  BottomRight: 'bottom-right',
} as const;

/**
 * 图例摆放位置关键字（暴露给用户；裸字面量 `'right'` 同样可用）
 * @description 决定 legend 占据 plotArea 哪一边的预留带；省略默认 right（默认值在 lowering 给）
 */
export const LegendPosition = {
  /** plotArea 右侧 */
  Right: 'right',
  /** plotArea 左侧 */
  Left: 'left',
  /** plotArea 上方 */
  Top: 'top',
  /** plotArea 下方 */
  Bottom: 'bottom',
} as const;

/**
 * 图例条目排布方向关键字（暴露给用户；裸字面量 `'vertical'` 同样可用）
 * @description 省略默认按 position（左右→vertical、上下→horizontal），默认值在 lowering 给
 */
export const LegendOrient = {
  /** 纵向堆叠（条目自上而下） */
  Vertical: 'vertical',
  /** 横向排布（条目自左而右） */
  Horizontal: 'horizontal',
} as const;

/**
 * 图例符号尺寸适配策略。
 * @description fit 会把 size legend 的符号压入 symbolSize 盒子；preserve 保留通道 descriptor 的原始半径。
 */
export const LegendSymbolFit = {
  /** 压入 legend symbol 盒子。 */
  Fit: 'fit',
  /** 保留 descriptor 半径。 */
  Preserve: 'preserve',
} as const;
