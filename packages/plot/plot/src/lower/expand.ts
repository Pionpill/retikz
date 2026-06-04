import { type CompositeDefinition, type IRChild, defineComposite } from '@retikz/core';
import { type ExternalDatasets, type PlotSpec, PlotSpecSchema } from '../ir';
import { channelValue, isFiniteNumber } from './field';
import { type Margins, computePlotArea } from './layout';
import { lowerMark } from './mark';
import { createCartesianProjector } from './project';
import { type TickSet, resolveLinearScale, scaleTicks } from './scale';

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
  const rows = datasets[node.data.ref];

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

  const axisValues = (axis: 'x' | 'y'): Array<number> => {
    const out: Array<number> = [];
    for (const mark of node.marks) {
      const channel = mark.encoding[axis];
      if (!channel) continue;
      for (const row of rows) {
        const value = channelValue(channel, row);
        if (isFiniteNumber(value)) out.push(value);
      }
    }
    return out;
  };

  // 先按 domain 建 scale（range 暂用整图，后续按 plot area 改）；ticks 只依赖 domain + count，与 range 无关
  const xScale = resolveLinearScale(xScaleDef, axisValues('x'), [0, width]);
  const yScale = resolveLinearScale(yScaleDef, axisValues('y'), [height, 0]);

  // 哪些维度有坐标轴（决定 margin / 是否算 ticks）；alpha.2 guide 仅 axis 类型，按 dimension 取
  const guides = node.guides ?? [];
  const xAxis = guides.find(guide => guide.dimension === 'x');
  const yAxis = guides.find(guide => guide.dimension === 'y');
  const xTicks: TickSet | undefined = xAxis ? scaleTicks(xScale, xAxis.tickCount) : undefined;
  const yTicks: TickSet | undefined = yAxis ? scaleTicks(yScale, yAxis.tickCount) : undefined;

  // 由整图尺寸 + axis 占位缩出 plot area（无 axis → margin 全 0 → plot area = 整图，向后兼容）
  const { plotArea } = computePlotArea(
    width,
    height,
    { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [] },
    { fontSize: options.fontSize, margin: options.margin },
  );

  // range 收敛到 plot area（y 屏幕向下，故倒置）；显式 range 的 scale 不覆盖——尊重用户手设
  if (!xScaleDef.range) xScale.range([plotArea.x, plotArea.x + plotArea.width]);
  if (!yScaleDef.range) yScale.range([plotArea.y + plotArea.height, plotArea.y]);
  const project = createCartesianProjector(xScale, yScale);

  // 每个 mark 下沉成一个图层 Scope（样式上提到 nodeDefault/pathDefault）；空图层（无可绘制点）丢弃
  const children: Array<IRChild> = node.marks
    .map(mark => lowerMark(mark, rows, project))
    .filter((layer): layer is IRChild => layer !== null);

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
