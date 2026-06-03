import {
  type CompositeDefinition,
  type IRChild,
  type IRNode,
  type IRPath,
  type IRScope,
  type IRStep,
  defineComposite,
} from '@retikz/core';
import {
  type Channel,
  type ExternalDatasets,
  type ExternalRow,
  type Mark,
  type PlotSpec,
  PlotSpecSchema,
} from '../ir';

/** 默认绘图区尺寸（user units）；尺寸是渲染选项、不进 IR */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;
/** 散点 glyph 默认直径（minimumSize，user units） */
const POINT_SIZE = 6;

/** lowerPlots 运行时选项：绘图区尺寸（不进 IR） */
export type LowerPlotsOptions = {
  /** 绘图区宽（user units），默认 480 */
  width?: number;
  /** 绘图区高（user units），默认 300 */
  height?: number;
};

/** 解析字段路径 a.b.c，返回叶子值（任一段缺失返回 undefined） */
const resolveFieldPath = (row: ExternalRow, path: string): unknown => {
  let current: unknown = row;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

/** 取通道值：value 常量优先，否则 field 路径解析 */
const channelValue = (channel: Channel | undefined, row: ExternalRow): unknown => {
  if (!channel) return undefined;
  if (channel.value !== undefined) return channel.value;
  if (channel.field !== undefined) return resolveFieldPath(row, channel.field);
  return undefined;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** 线性映射 domain→range；d0=d1 时取区间中点防除零 */
const linear =
  (domain: readonly [number, number], range: readonly [number, number]) =>
  (value: number): number => {
    const [d0, d1] = domain;
    const [r0, r1] = range;
    return d1 === d0 ? (r0 + r1) / 2 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
  };

const extent = (values: Array<number>): [number, number] =>
  values.length === 0 ? [0, 1] : [Math.min(...values), Math.max(...values)];

/** 按字段路径比较两行（数值升序，否则字符串序）——line 的连接顺序 */
const compareByPath = (a: ExternalRow, b: ExternalRow, path: string): number => {
  const va = resolveFieldPath(a, path);
  const vb = resolveFieldPath(b, path);
  if (isFiniteNumber(va) && isFiniteNumber(vb)) return va - vb;
  return String(va).localeCompare(String(vb));
};

/**
 * 把一个 Plot IR 根节点 + 外部数据下沉成一个 core Scope
 * @description cartesian2D + linear + point/line 的最薄投影；root id 绑到 Scope.id（plot-design §8.1）
 */
const expandPlot = (
  node: PlotSpec,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions,
): IRChild => {
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

  const xScale = linear(xScaleDef.domain ?? extent(axisValues('x')), xScaleDef.range ?? [0, width]);
  const yScale = linear(yScaleDef.domain ?? extent(axisValues('y')), yScaleDef.range ?? [height, 0]);

  const projectRow = (mark: Mark, row: ExternalRow): [number, number] | null => {
    const xValue = channelValue(mark.encoding.x, row);
    const yValue = channelValue(mark.encoding.y, row);
    if (!isFiniteNumber(xValue) || !isFiniteNumber(yValue)) return null;
    return [xScale(xValue), yScale(yValue)];
  };

  const children: Array<IRChild> = [];
  for (const mark of node.marks) {
    if (mark.type === 'point') {
      for (const row of rows) {
        const point = projectRow(mark, row);
        if (!point) continue;
        const dot: IRNode = {
          type: 'node',
          shape: 'circle',
          position: point,
          minimumSize: POINT_SIZE,
          fill: 'black',
          stroke: 'black',
        };
        children.push(dot);
      }
    } else {
      const ordered = mark.order
        ? [...rows].sort((a, b) => compareByPath(a, b, mark.order as string))
        : rows;
      const points = ordered
        .map(row => projectRow(mark, row))
        .filter((point): point is [number, number] => point !== null);
      if (points.length < 2) continue;
      const steps: Array<IRStep> = [
        { type: 'step', kind: 'move', to: points[0] },
        ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
      ];
      const path: IRPath = { type: 'path', stroke: 'black', strokeWidth: 1, children: steps };
      children.push(path);
    }
  }

  const scope: IRScope = node.id
    ? { type: 'scope', id: node.id, localNamespace: true, children }
    : { type: 'scope', localNamespace: true, children };
  return scope;
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
