import { type CompositeDefinition, type IRChild, type IRScope, defineComposite } from '@retikz/core';
import { type ExternalDatasets, type Guide, PlotScale, type PlotSpec, PlotSpecSchema } from '../ir';
import { channelValue } from './field';
import { type GuideContext, lowerGuide } from './guide';
import { DEFAULT_FONT_SIZE, type Margins, type Rect, computePlotArea } from './layout';
import { lowerMark } from './mark';
import { createCartesianProjector } from './project';
import { type TickSet, resolvePositionScale } from './scale';
import { applyTransforms } from './transform';

/** 空刻度集（某维度无 axis 时给 GuideContext 的占位；实际不会被该维度的 guide 触达） */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/**
 * 一根定位维度只画一根轴：重复同 dimension 的 axis → 刻度数不确定，抛清晰错误。
 * @description 多轴（dual-axis / 上下双轴，靠 placement 区分、副轴可绑不同 scale）是后续非破坏放宽，目前不支持。
 */
const assertUniqueAxisDimension = (guides: Array<Guide>): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    if (seen.has(guide.dimension)) {
      throw new Error(`lowerPlots: duplicate axis for dimension "${guide.dimension}"; one axis per dimension`);
    }
    seen.add(guide.dimension);
  }
};

/** 默认整图尺寸（user units）；尺寸是渲染选项、不进 IR */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;

/** lowerPlots 运行时选项：整图尺寸 + label 字号 + margin（均不进 IR） */
export type LowerPlotsOptions = {
  /** 整图宽（user units），默认 480 */
  width?: number;
  /** 整图高（user units），默认 300 */
  height?: number;
  /** label 字号（估算占位 + 实绘 label 共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器 → 各 mark 下沉 → 包 localNamespace Scope（root id → Scope.id，plot-design §8.1）
 */
const expandPlot = (node: PlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions): IRChild => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  // 绘图区尺寸是 scale range / 投影的单一来源；非有限或非正数会一路污染出 cx="NaN" 等坏坐标——入口抛清晰错误
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`lowerPlots: width must be a positive finite number, got ${width}`);
  }
  if (!Number.isFinite(height) || height <= 0) {
    throw new Error(`lowerPlots: height must be a positive finite number, got ${height}`);
  }

  if (!(node.data.ref in datasets)) {
    throw new Error(`lowerPlots: dataset "${node.data.ref}" not found in provided datasets`);
  }
  // 取数后先过 transform 管线（sort / stack…）：域推断与 mark 下沉都用变换后的行
  const rows = applyTransforms(datasets[node.data.ref], node.transform);

  const coordinate = node.coordinate;
  const scaleByName = new Map(node.scales.map(scale => [scale.name, scale] as const));
  const xScaleDef = scaleByName.get(coordinate.x);
  const yScaleDef = scaleByName.get(coordinate.y);
  if (!xScaleDef) {
    throw new Error(`lowerPlots: coordinate.x references unknown scale "${coordinate.x}"`);
  }
  if (!yScaleDef) {
    throw new Error(`lowerPlots: coordinate.y references unknown scale "${coordinate.y}"`);
  }

  // 收集某维所有 mark 的通道原始值（不预过滤）：连续 scale 内部过滤为有限数求 extent、分类 scale 按数据序去重推断 domain
  const axisValues = (axis: 'x' | 'y'): Array<unknown> => {
    const out: Array<unknown> = [];
    for (const mark of node.marks) {
      const channel = mark.encoding[axis];
      if (!channel) continue;
      for (const row of rows) {
        out.push(channelValue(channel, row));
      }
    }
    // 柱从 baseline 0 起：把 0 纳入 y 域，保证连续 y 域容得下 baseline（即便所有值同号）
    if (axis === 'y' && node.marks.some(mark => mark.type === 'interval')) out.push(0);
    return out;
  };

  // 先按 domain 建 scale（range 暂用整图，后续按 plot area 改）；ticks 只依赖 domain + count，与 range 无关
  const xScale = resolvePositionScale(xScaleDef, axisValues('x'), [0, width]);
  const yScale = resolvePositionScale(yScaleDef, axisValues('y'), [height, 0]);

  // 哪些维度有坐标轴（决定 margin / 是否算 ticks）；alpha.2 guide 仅 axis 类型，按 dimension 取
  const guides = node.guides ?? [];
  assertUniqueAxisDimension(guides);
  const xAxis = guides.find(guide => guide.dimension === 'x');
  const yAxis = guides.find(guide => guide.dimension === 'y');
  const xTicks: TickSet | undefined = xAxis ? xScale.ticks(xAxis.tickCount) : undefined;
  const yTicks: TickSet | undefined = yAxis ? yScale.ticks(yAxis.tickCount) : undefined;

  // 由整图尺寸 + axis 占位缩出 plot area（无 axis → margin 全 0 → plot area = 整图，向后兼容）
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const { plotArea } = computePlotArea(
    width,
    height,
    { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [] },
    { fontSize, margin: options.margin },
  );

  // range 收敛到 plot area（y 屏幕向下，故倒置）；显式 range 的 scale 不覆盖——尊重用户手设
  // 仅连续 scale 可带显式 range（band / point 的 range 始终派生）
  const xHasExplicitRange = xScaleDef.type === PlotScale.Linear && xScaleDef.range !== undefined;
  const yHasExplicitRange = yScaleDef.type === PlotScale.Linear && yScaleDef.range !== undefined;
  if (!xHasExplicitRange) xScale.setRange([plotArea.x, plotArea.x + plotArea.width]);
  if (!yHasExplicitRange) yScale.setRange([plotArea.y + plotArea.height, plotArea.y]);
  const project = createCartesianProjector(xScale, yScale);

  // guide 的轴线/网格框取 scale 的实际 range（而非 margin 算的 plotArea）：无显式 range 时两者相同，
  // 有显式 range 时轴线/网格随实际绘制区走，与刻度/mark 严格对齐（不因显式 range 而错位）
  const [xRangeStart, xRangeEnd] = xScale.range();
  const [yRangeStart, yRangeEnd] = yScale.range();
  const guideFrame: Rect = {
    x: Math.min(xRangeStart, xRangeEnd),
    y: Math.min(yRangeStart, yRangeEnd),
    width: Math.abs(xRangeEnd - xRangeStart),
    height: Math.abs(yRangeEnd - yRangeStart),
  };

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  const markLayers: Array<IRChild> = node.marks
    .map(mark => lowerMark(mark, rows, project))
    .filter((layer): layer is IRChild => layer !== null);

  // guide 下沉：每个 axis → 网格层（垫底）+ 轴层（压顶），刻度与 mark 共用同一投影器（严格对齐）
  const guideContext: GuideContext = {
    plotArea: guideFrame,
    projectX: xScale,
    projectY: yScale,
    xTicks: xTicks ?? EMPTY_TICKS,
    yTicks: yTicks ?? EMPTY_TICKS,
    fontSize,
  };
  const lowered = guides.map(guide => lowerGuide(guide, guideContext));
  const gridLayers = lowered.map(layer => layer.gridLayer).filter((layer): layer is IRScope => layer !== null);
  const axisLayers = lowered.map(layer => layer.axisLayer).filter((layer): layer is IRScope => layer !== null);

  // z-order：所有网格层 → marks → 所有轴层（网格垫底、坐标轴压顶不被数据盖）
  const children: Array<IRChild> = [...gridLayers, ...markLayers, ...axisLayers];

  return node.id
    ? { type: 'scope', id: node.id, localNamespace: true, children }
    : { type: 'scope', localNamespace: true, children };
};

/**
 * 构造 plot 的 Tier 2 下沉逻辑，供 core `CompileOptions.composites` 注入
 * @description 数据闭进函数、不进 IR；返回的 CompositeDefinition 把 plot composite 节点展开成 core Scope/Node/Path
 */
export const lowerPlots = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): Array<CompositeDefinition> => [
  defineComposite({
    schema: PlotSpecSchema,
    expand: (node: PlotSpec) => expandPlot(node, datasets, options),
  }),
];
