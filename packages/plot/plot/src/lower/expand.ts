import { type CompositeDefinition, type IRChild, defineComposite } from '@retikz/core';
import { type ExternalDatasets, type PlotSpec, PlotSpecSchema } from '../ir';
import { channelValue, isFiniteNumber } from './field';
import { lowerMark } from './mark';
import { createCartesianProjector } from './project';
import { resolveLinearScale } from './scale';

/** 默认绘图区尺寸（user units）；尺寸是渲染选项、不进 IR */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;

/** lowerPlots 运行时选项：绘图区尺寸（不进 IR） */
export type LowerPlotsOptions = {
  /** 绘图区宽（user units），默认 480 */
  width?: number;
  /** 绘图区高（user units），默认 300 */
  height?: number;
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description 编排：校验 ref/scale → 收集轴值 → 建归一化 scale → 建投影器 → 各 mark 下沉 → 包 localNamespace Scope（root id → Scope.id，plot-design §8.1）
 */
const expandPlot = (node: PlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions): IRChild => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

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

  const xScale = resolveLinearScale(xScaleDef, axisValues('x'), [0, width]);
  const yScale = resolveLinearScale(yScaleDef, axisValues('y'), [height, 0]);
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
