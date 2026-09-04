import { RetikzPlotError } from '../error';

/** 默认整图宽度（user units），用于 lowering 与 locator 缺省尺寸 */
export const DEFAULT_PLOT_WIDTH = 480;

/** 默认整图高度（user units），用于 lowering 与 locator 缺省尺寸 */
export const DEFAULT_PLOT_HEIGHT = 300;

/** label 字号（估算占位 + 实绘 label 共用），无显式 fontSize 时的默认值 */
export const DEFAULT_FONT_SIZE = 11;

/** 数字字宽经验系数（字宽约等于 0.6em），用于无 measureText 时估算 label 像素宽 */
export const CHAR_WIDTH_FACTOR = 0.6;

/** 默认刻度线长（user units）；axis 与 guide 复用 */
export const DEFAULT_AXIS_TICK_LENGTH = 6;

/** 默认刻度线到 label 的间距（user units）；axis 与 guide 共用 */
export const DEFAULT_AXIS_LABEL_GAP = 4;

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

/**
 * 估算一段文字的像素宽。
 * @description plot lowering 在 core compile 前运行、无 measureText，按字符数 * 字号 * 经验系数估算。
 *   作为 margin 估算与 guide label 偏移的单一来源，避免多处各算一份
 */
export const estimateLabelWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * CHAR_WIDTH_FACTOR;

/** computePlotArea 输入：哪些维度有 axis + 其刻度标签（估算占位用）+ legend 各边预留 */
export type PlotAreaLayoutContext = {
  /** x 维度是否有坐标轴（决定是否留 bottom margin） */
  hasXAxis: boolean;
  /** y 维度是否有坐标轴（决定是否留 left margin） */
  hasYAxis: boolean;
  /** x 轴刻度标签（估算最右 label 半宽防溢出） */
  xLabels: ReadonlyArray<string>;
  /** y 轴刻度标签（估算最宽 label 定 left margin） */
  yLabels: ReadonlyArray<string>;
  /** legend 各边预留带宽（在 axis margin 之外叠加；缺省无 legend 占位） */
  legendReserve?: LegendReserve;
};

/** computePlotArea 选项：字号 + 用户覆盖 margin */
export type PlotAreaOptions = {
  /** label 字号（估算 + 实绘共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** layout / decoration 额外预留，只叠加到自动 margin；显式 margin 仍逐边覆盖 */
  reserve?: Partial<Margins>;
  /** 逐边覆盖估算的 margin */
  margin?: Partial<Margins>;
};

/** 一组 label 中最宽的估算像素宽（空集 0） */
const maxLabelWidth = (labels: ReadonlyArray<string>, fontSize: number): number =>
  labels.length === 0 ? 0 : Math.max(...labels.map(label => estimateLabelWidth(label, fontSize)));

/**
 * 由整图尺寸 + axis 占位估算 plot area（d3 margin convention）
 * @description margin 仅在对应维度有 axis 时才留；无 axis → 全 0 → plot area = 整图。
 *   用户 options.margin 逐边覆盖估算。估算用 fontSize × 字符数，不精确但对数字轴足够（用户可 margin 覆盖）。
 *   margin 之和 ≥ 尺寸（plot area 非正）→ 抛清晰错误，不静默出退化坏图
 */
export const computePlotArea = (
  width: number,
  height: number,
  context: PlotAreaLayoutContext,
  options: PlotAreaOptions = {},
): { plotArea: Rect; margins: Margins } => {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const reserve = context.legendReserve ?? {};
  const layoutReserve = options.reserve ?? {};
  // legend 预留叠加在 axis margin 之外：legend 占某边 → 该边 margin += 预留带宽，plotArea 在该边收窄
  const auto: Margins = {
    top: (context.hasYAxis ? fontSize * 0.5 : 0) + (reserve.top ?? 0) + (layoutReserve.top ?? 0),
    right:
      (context.hasXAxis ? maxLabelWidth(context.xLabels.slice(-1), fontSize) * 0.5 : 0) +
      (reserve.right ?? 0) +
      (layoutReserve.right ?? 0),
    bottom:
      (context.hasXAxis ? DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP + fontSize : 0) +
      (reserve.bottom ?? 0) +
      (layoutReserve.bottom ?? 0),
    left:
      (context.hasYAxis
        ? DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP + maxLabelWidth(context.yLabels, fontSize)
        : 0) +
      (reserve.left ?? 0) +
      (layoutReserve.left ?? 0),
  };
  const margins: Margins = { ...auto, ...options.margin };
  // 用户 margin 可能传入 NaN / 负值——会一路污染出坏坐标，逐边校验有限非负（与 width/height 入口校验同思路）
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new RetikzPlotError(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }
  const plotArea: Rect = {
    x: margins.left,
    y: margins.top,
    width: width - margins.left - margins.right,
    height: height - margins.top - margins.bottom,
  };
  if (plotArea.width <= 0 || plotArea.height <= 0) {
    throw new RetikzPlotError(
      `lowerPlots: margins (left ${margins.left} + right ${margins.right}, top ${margins.top} + bottom ${margins.bottom}) exceed the ${width}×${height} canvas, leaving no plot area`,
    );
  }
  return { margins, plotArea };
};

/** 极坐标角向标签的布局输入 */
export type PolarAngularLabel = {
  /** 标签所在角度，单位为度 */
  angle: number;
  /** 标签文本 */
  text: string;
};

/** 极坐标角向标签的屏幕空间布局结果 */
export type PolarAngularLabelLayout = {
  /** 标签视觉盒中心 */
  position: [number, number];
  /** 随象限变化的默认文字对齐 */
  align: 'start' | 'middle' | 'end';
};

/** 极坐标方向分量视为轴向的误差阈值 */
const POLAR_AXIS_EPSILON = 1e-9;

/** 将方向分量归为负向、轴向或正向 */
const polarDirectionSign = (component: number): -1 | 0 | 1 => {
  if (Math.abs(component) <= POLAR_AXIS_EPSILON) return 0;
  return component < 0 ? -1 : 1;
};

/** 标签矩形沿给定径向单位向量的支撑距离 */
const polarLabelRadialSupport = (horizontal: number, vertical: number, width: number, height: number): number =>
  Math.abs(horizontal) * (width / 2) + Math.abs(vertical) * (height / 2);

/**
 * 把角向标签的视觉盒放到外圈锚点之外
 * @description 标签中心沿径向连续外移其矩形支撑距离，使视觉盒内侧与 tick + gap 锚点相切
 */
export const layoutPolarAngularLabel = (
  center: readonly [number, number],
  outerRadius: number,
  label: PolarAngularLabel,
  fontSize: number,
  radialOffset = DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP,
): PolarAngularLabelLayout => {
  const radians = (label.angle * Math.PI) / 180;
  const horizontal = Math.cos(radians);
  const vertical = Math.sin(radians);
  const horizontalSign = polarDirectionSign(horizontal);
  const verticalSign = polarDirectionSign(vertical);
  const projectedHorizontal = horizontalSign === 0 ? 0 : horizontal;
  const projectedVertical = verticalSign === 0 ? 0 : vertical;
  const width = estimateLabelWidth(label.text, fontSize);
  const support = polarLabelRadialSupport(projectedHorizontal, projectedVertical, width, fontSize);
  const labelRadius = outerRadius + radialOffset + support;
  return {
    position: [center[0] + projectedHorizontal * labelRadius, center[1] + projectedVertical * labelRadius],
    align: horizontalSign < 0 ? 'end' : horizontalSign > 0 ? 'start' : 'middle',
  };
};

/** computePolarCoordinate 输入：角向刻度的实际角度与标签文本 */
export type PolarLayoutContext = {
  /** 可见角向刻度标签 */
  angularLabels: ReadonlyArray<PolarAngularLabel>;
};

/** computePolarCoordinate 结果：圆心（屏幕坐标）+ 外半径（user units） */
export type PolarLayout = {
  /** 圆心（显式留白后的可用区域中心，屏幕坐标） */
  center: [number, number];
  /** 外半径（user units，满足圆与角向标签包围盒约束） */
  outerRadius: number;
};

/**
 * 由整图尺寸与角向标签包围盒计算极坐标布局
 * @description 圆心位于显式留白后的可用区域中心；外半径取圆与各角向标签都不越界时的最大值。
 *   标签宽度沿实际角度参与对应边界约束，不把最长标签宽度重复扣在四边；调用方只消费本 frame、不回写 layout。
 *   margin 之大 → 外半径 ≤ 0 → 抛清晰错误，不静默出退化坏图。
 */
export const computePolarCoordinate = (
  width: number,
  height: number,
  context: PolarLayoutContext,
  options: PlotAreaOptions = {},
): PolarLayout => {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const explicit: Partial<Margins> = options.margin ?? {};
  const layoutReserve = options.reserve ?? {};
  const margins: Margins = {
    top: explicit.top ?? layoutReserve.top ?? 0,
    right: explicit.right ?? layoutReserve.right ?? 0,
    bottom: explicit.bottom ?? layoutReserve.bottom ?? 0,
    left: explicit.left ?? layoutReserve.left ?? 0,
  };
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const value = margins[side];
    if (!Number.isFinite(value) || value < 0) {
      throw new RetikzPlotError(`lowerPlots: margin.${side} must be a non-negative finite number, got ${value}`);
    }
  }
  const availableWidth = width - margins.left - margins.right;
  const availableHeight = height - margins.top - margins.bottom;
  const center: [number, number] = [margins.left + availableWidth / 2, margins.top + availableHeight / 2];
  const minX = margins.left;
  const maxX = width - margins.right;
  const minY = margins.top;
  const maxY = height - margins.bottom;
  const radialOffset = DEFAULT_AXIS_TICK_LENGTH + DEFAULT_AXIS_LABEL_GAP;
  let outerRadius = Math.min(availableWidth, availableHeight) / 2;

  for (const label of context.angularLabels) {
    if (!Number.isFinite(label.angle)) continue;
    const radians = (label.angle * Math.PI) / 180;
    const horizontal = Math.cos(radians);
    const vertical = Math.sin(radians);
    const horizontalSign = polarDirectionSign(horizontal);
    const verticalSign = polarDirectionSign(vertical);
    const projectedHorizontal = horizontalSign === 0 ? 0 : horizontal;
    const projectedVertical = verticalSign === 0 ? 0 : vertical;
    const labelWidth = estimateLabelWidth(label.text, fontSize);
    const support = polarLabelRadialSupport(projectedHorizontal, projectedVertical, labelWidth, fontSize);

    if (horizontalSign === 0) {
      if (center[0] - labelWidth / 2 < minX || center[0] + labelWidth / 2 > maxX) outerRadius = 0;
    } else {
      const horizontalLimit =
        horizontalSign > 0
          ? (maxX - center[0] - labelWidth / 2) / horizontal - radialOffset - support
          : (center[0] - minX - labelWidth / 2) / -horizontal - radialOffset - support;
      outerRadius = Math.min(outerRadius, horizontalLimit);
    }

    if (verticalSign === 0) {
      if (center[1] - fontSize / 2 < minY || center[1] + fontSize / 2 > maxY) outerRadius = 0;
    } else {
      const verticalLimit =
        verticalSign > 0
          ? (maxY - center[1] - fontSize / 2) / vertical - radialOffset - support
          : (center[1] - minY - fontSize / 2) / -vertical - radialOffset - support;
      outerRadius = Math.min(outerRadius, verticalLimit);
    }
  }
  if (outerRadius <= 0) {
    throw new RetikzPlotError(
      `lowerPlots: polar label reserve / margins exceed the ${width}×${height} canvas, leaving no radius`,
    );
  }
  return { center, outerRadius };
};
