/** label 字号（估算占位 + 实绘 label 共用），无显式 fontSize 时的默认 */
export const DEFAULT_FONT_SIZE = 11;
/** 数字字宽经验系数（字宽 ≈ 0.6em），用于无 measureText 时估算 label 像素宽 */
export const CHAR_WIDTH_FACTOR = 0.6;
/** 刻度线长（user units）；ADR-04 画刻度线复用，导出避免跨文件复制常量 */
export const AXIS_TICK_LENGTH = 6;
/** 刻度线到 label 的间距（user units）；ADR-04 复用 */
export const AXIS_LABEL_GAP = 4;

/** 矩形区域（绘图区 plot area 用） */
export type Rect = {
  /** 左上角 x（user units） */
  x: number;
  /** 左上角 y（user units） */
  y: number;
  /** 宽（user units） */
  width: number;
  /** 高（user units） */
  height: number;
};

/** 四边留白（整图边缘到 plot area 的距离） */
export type Margins = {
  /** 顶部留白 */
  top: number;
  /** 右侧留白 */
  right: number;
  /** 底部留白 */
  bottom: number;
  /** 左侧留白 */
  left: number;
};

/**
 * 估算一段文字的像素宽
 * @description plot lowering 在 core compile 前跑、无 measureText，按字符数 × 字号 × 经验系数估。
 *   单一来源：ADR-03 的 left margin 与 ADR-04 的 y label 水平偏移都调它，避免两处各算一份。
 */
export const estimateLabelWidth = (text: string, fontSize: number): number => text.length * fontSize * CHAR_WIDTH_FACTOR;

/** 四边 legend 预留带宽（user units）：legend 占某边时该边在 axis margin 之外再让出的带宽 */
export type LegendReserve = {
  /** 右侧预留带宽 */
  right?: number;
  /** 左侧预留带宽 */
  left?: number;
  /** 顶部预留带高 */
  top?: number;
  /** 底部预留带高 */
  bottom?: number;
};

/** computePlotArea 输入：哪些维度有 axis + 其刻度标签（估算占位用）+ legend 各边预留 */
export type PlotAreaInput = {
  /** x 维度是否有坐标轴（决定是否留 bottom margin） */
  hasXAxis: boolean;
  /** y 维度是否有坐标轴（决定是否留 left margin） */
  hasYAxis: boolean;
  /** x 轴刻度标签（估算最右 label 半宽防溢出） */
  xLabels: ReadonlyArray<string>;
  /** y 轴刻度标签（估算最宽 label 定 left margin） */
  yLabels: ReadonlyArray<string>;
  /** legend 各边预留带宽（在 axis margin 之外叠加；缺省无 legend 占位）（ADR-03 决策 ⑩） */
  legendReserve?: LegendReserve;
};

/** computePlotArea 选项：字号 + 用户覆盖 margin */
export type PlotAreaOptions = {
  /** label 字号（估算 + 实绘共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** 逐边覆盖估算的 margin */
  margin?: Partial<Margins>;
};

/** 一组 label 中最宽的估算像素宽（空集 0） */
const maxLabelWidth = (labels: ReadonlyArray<string>, fontSize: number): number =>
  labels.length === 0 ? 0 : Math.max(...labels.map(label => estimateLabelWidth(label, fontSize)));

/**
 * 由整图尺寸 + axis 占位估算 plot area（d3 margin convention）
 * @description margin 仅在对应维度有 axis 时才留；无 axis → 全 0 → plot area = 整图（向后兼容无轴的 alpha.1）。
 *   用户 options.margin 逐边覆盖估算。估算用 fontSize × 字符数，不精确但对数字轴足够（用户可 margin 覆盖）。
 *   margin 之和 ≥ 尺寸（plot area 非正）→ 抛清晰错误，不静默出退化坏图。
 */
export const computePlotArea = (
  width: number,
  height: number,
  input: PlotAreaInput,
  options: PlotAreaOptions = {},
): { plotArea: Rect; margins: Margins } => {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const reserve = input.legendReserve ?? {};
  // legend 预留叠加在 axis margin 之外：legend 占某边 → 该边 margin += 预留带宽，plotArea 在该边收窄
  const auto: Margins = {
    top: (input.hasYAxis ? fontSize * 0.5 : 0) + (reserve.top ?? 0),
    right: (input.hasXAxis ? maxLabelWidth(input.xLabels.slice(-1), fontSize) * 0.5 : 0) + (reserve.right ?? 0),
    bottom: (input.hasXAxis ? AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize : 0) + (reserve.bottom ?? 0),
    left: (input.hasYAxis ? AXIS_TICK_LENGTH + AXIS_LABEL_GAP + maxLabelWidth(input.yLabels, fontSize) : 0) + (reserve.left ?? 0),
  };
  const margins: Margins = { ...auto, ...options.margin };
  // 用户 margin 可能传入 NaN / 负值——会一路污染出坏坐标，逐边校验有限非负（与 width/height 入口校验同思路）
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }
  const plotArea: Rect = {
    x: margins.left,
    y: margins.top,
    width: width - margins.left - margins.right,
    height: height - margins.top - margins.bottom,
  };
  if (plotArea.width <= 0 || plotArea.height <= 0) {
    throw new Error(
      `lowerPlots: margins (left ${margins.left} + right ${margins.right}, top ${margins.top} + bottom ${margins.bottom}) exceed the ${width}×${height} canvas, leaving no plot area`,
    );
  }
  return { margins, plotArea };
};

/** computePolarFrame 输入：哪个维度有角向轴 + 角向刻度标签（估算外圈标签留白用） */
export type PolarFrameInput = {
  /** 是否有角向坐标轴（决定是否为外圈角向标签预留留白） */
  hasAngularAxis: boolean;
  /** 角向刻度标签（估算最宽标签、为外圈留白） */
  angularLabels: ReadonlyArray<string>;
};

/** computePolarFrame 结果：圆心（屏幕坐标）+ 外半径（user units，整圆 bbox 内接） */
export type PolarLayout = {
  /** 圆心（plot area 中心，屏幕坐标） */
  center: [number, number];
  /** 外半径（user units，可用外半径，已减角向标签留白） */
  outerRadius: number;
};

/**
 * 由整图尺寸估算极坐标布局：圆心 = plot area 中心、外半径 = 可用尺寸减角向标签留白
 * @description ADR-01 用整圆 bbox 定 center / outerRadius（partial-arc 紧包围留后续）。
 *   有角向轴时为外圈刻度标签预留一圈留白（按最宽标签估），让标签不溢出画布；ADR-04 只消费本 frame、不回写 layout。
 *   margin 之大 → 外半径 ≤ 0 → 抛清晰错误，不静默出退化坏图。
 */
export const computePolarFrame = (
  width: number,
  height: number,
  input: PolarFrameInput,
  options: PlotAreaOptions = {},
): PolarLayout => {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  // 角向标签贴外圈一圈，最坏在左右两侧吃掉一个最宽标签宽 + 一个字高（顶/底），故四向各按需预留
  const labelReserve = input.hasAngularAxis
    ? Math.max(maxLabelWidth(input.angularLabels, fontSize), fontSize) + AXIS_TICK_LENGTH + AXIS_LABEL_GAP
    : 0;
  const explicit: Partial<Margins> = options.margin ?? {};
  const margins: Margins = {
    top: explicit.top ?? labelReserve,
    right: explicit.right ?? labelReserve,
    bottom: explicit.bottom ?? labelReserve,
    left: explicit.left ?? labelReserve,
  };
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }
  const availableWidth = width - margins.left - margins.right;
  const availableHeight = height - margins.top - margins.bottom;
  const outerRadius = Math.min(availableWidth, availableHeight) / 2;
  if (outerRadius <= 0) {
    throw new Error(`lowerPlots: polar label reserve / margins exceed the ${width}×${height} canvas, leaving no radius`);
  }
  return {
    center: [margins.left + availableWidth / 2, margins.top + availableHeight / 2],
    outerRadius,
  };
};
