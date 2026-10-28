import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import type { IRPlot } from '../../src/schemas';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const rows = [
  { day: 0, temperature: 10, rainfall: 0, x: 1, y: 0, z: 0 },
  { day: 1, temperature: 20, rainfall: 100, x: 0, y: 1, z: 0 },
  { day: 2, temperature: 15, rainfall: 50, x: 0, y: 0, z: 1 },
];

const dualAxisSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'weather',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xDay' },
    { type: 'linear', name: 'yTemp' },
    { type: 'linear', name: 'yRain' },
  ],
  composition: {
    defaultView: 'temp',
    views: [
      {
        id: 'temp',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' },
        placement: { kind: 'root' },
      },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yRain' },
        placement: { kind: 'overlay', target: 'temp', zIndex: 10 },
      },
    ],
  },
  marks: [
    {
      contributeToDomain: true,
      type: 'path',
      encodings: { order: 'day', position: { x: { field: 'day' }, y: { field: 'temperature' } } },
    },
    {
      contributeToDomain: true,
      type: 'interval',
      coordinateView: 'rain',
      encodings: { position: { x: { field: 'day' }, y: { field: 'rainfall' } } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateView: 'temp', placement: { kind: 'side', side: 'left' } },
    { type: 'axis', dimension: 'y', coordinateView: 'rain', placement: { kind: 'side', side: 'right' } },
    { type: 'axis', dimension: 'x', coordinateView: 'temp', placement: { kind: 'side', side: 'bottom' } },
  ],
};

const sharedYOverlaySpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'release',
  data: { reference: 'weather' },
  scales: [
    { type: 'linear', name: 'xElapsed' },
    { type: 'linear', name: 'xCalendar' },
    { type: 'linear', name: 'yShared' },
  ],
  composition: {
    defaultView: 'elapsed',
    views: [
      {
        id: 'elapsed',
        coordinate: { type: 'cartesian2D', x: 'xElapsed', y: 'yShared' },
      },
      {
        id: 'calendar',
        coordinate: { type: 'cartesian2D', x: 'xCalendar', y: 'yShared' },
        placement: { kind: 'overlay', target: 'elapsed' },
      },
    ],
  },
  marks: [
    {
      contributeToDomain: true,
      type: 'path',
      encodings: { order: 'day', position: { x: { field: 'day' }, y: { field: 'temperature' } } },
    },
    {
      contributeToDomain: true,
      type: 'path',
      coordinateView: 'calendar',
      encodings: { order: 'rainfall', position: { x: { field: 'rainfall' }, y: { field: 'rainfall' } } },
    },
  ],
};

const parsePlotIR = (spec: unknown): IRPlot => PlotSchema.parse(spec);

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlotWithDataArtifact(
    spec,
    { weather: rows },
    { layout: { width: 480, height: 300 }, textMeasurer: measureLabel, provenance: true },
  ).child as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const isPath = (child: IRChild): child is IRPath => child.type === 'path';

const innerContentOf = (scope: IRScope): IRScope => scope.children.filter(isScope)[0];

const axisLayersOf = (scope: IRScope): Array<IRScope> =>
  innerContentOf(scope)
    .children.filter(isScope)
    .filter(child => child.meta?.source === 'plot' && child.meta.layer === 'axis');

const markLayersOf = (scope: IRScope): Array<IRScope> =>
  innerContentOf(scope)
    .children.filter(isScope)
    .filter(child => child.meta?.source === 'plot' && child.meta.layer === 'mark');

const firstPathOf = (scope: IRScope): IRPath => scope.children.find(isPath) as IRPath;

const moveXOf = (path: IRPath): number => {
  const move = path.children.find(step => step.kind === 'move');
  return (move!.to as [number, number])[0];
};

const allNodes = (child: IRChild): Array<IRNode> => {
  if (isNode(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allNodes);
};

const allPaths = (child: IRChild): Array<IRPath> => {
  if (isPath(child)) return [child];
  if (!isScope(child)) return [];
  return child.children.flatMap(allPaths);
};

const nodeHeight = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return size?.height ?? size?.default ?? 0;
};

const pathYValues = (path: IRPath): Array<number> =>
  path.children.flatMap(step => ('to' in step && Array.isArray(step.to) ? [step.to[1]] : []));

const spanOf = (values: ReadonlyArray<number>): number => Math.max(...values) - Math.min(...values);

describe('同面板多轴叠加方案', () => {
  it('轴放置和叠加 zindex 往返', () => {
    const parsed = parsePlotIR(JSON.parse(JSON.stringify(dualAxisSpec)));

    expect(parsed).toEqual(dualAxisSpec);
  });

  it('轴放置需要已知类型', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'corner' } }],
    };

    expect(() => parsePlotIR(spec)).toThrow();
  });

  it('轴侧需要基侧', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'center' } }],
    };

    expect(() => parsePlotIR(spec)).toThrow();
  });

  it('覆盖循环被拒绝', () => {
    const spec = {
      ...dualAxisSpec,
      composition: {
        defaultView: 'a',
        views: [
          {
            id: 'a',
            coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yTemp' },
            placement: { kind: 'overlay', target: 'b' },
          },
          {
            id: 'b',
            coordinate: { type: 'cartesian2D', x: 'xDay', y: 'yRain' },
            placement: { kind: 'overlay', target: 'a' },
          },
        ],
      },
      marks: [
        {
          contributeToDomain: true,
          type: 'path',
          coordinateView: 'a',
          encodings: { order: 'day', position: { x: { field: 'day' }, y: { field: 'temperature' } } },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'y', coordinateView: 'a' },
        { type: 'axis', dimension: 'y', coordinateView: 'b' },
      ],
    };

    expect(() => parsePlotIR(spec)).toThrow(/cycle|overlay/i);
  });
});

describe('同面板多轴叠加下降', () => {
  it('左和右 y 轴可以共存', () => {
    const outer = expandOf(parsePlotIR(dualAxisSpec));
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');

    expect(yAxes).toHaveLength(2);
    expect(moveXOf(firstPathOf(yAxes[1]))).toBeGreaterThan(moveXOf(firstPathOf(yAxes[0])));
  });

  it('重复轴相同范围尺寸和放置被拒绝', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [
        { type: 'axis', dimension: 'y', coordinateView: 'temp', placement: { kind: 'side', side: 'left' } },
        { type: 'axis', dimension: 'y', coordinateView: 'temp', placement: { kind: 'side', side: 'left' } },
      ],
    };

    expect(() => expandOf(parsePlotIR(spec))).toThrow(/duplicate axis/i);
  });

  it('笛卡尔坐标拒绝不兼容的方位边', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'right' } }],
    };

    expect(() => expandOf(parsePlotIR(spec))).toThrow(/cartesian x axis.*top or bottom/i);
  });

  it('笛卡尔拒绝未知的本机边缘', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'y', placement: { kind: 'edge', edge: 'hypotenuse' } }],
    };

    expect(() => expandOf(parsePlotIR(spec))).toThrow(/cartesian axis edge.*top, right, bottom, or left/i);
  });

  it('叠加范围使用目标绘图区域进行投影', () => {
    const outer = expandOf(parsePlotIR(dualAxisSpec));
    const marks = markLayersOf(outer);
    const intervalNodes = allNodes(marks[1]);
    const pathYMin = Math.min(...allPaths(marks[0]).flatMap(pathYValues));
    const intervalYMin = Math.min(
      ...intervalNodes.map(node => (node.position as [number, number])[1] - nodeHeight(node) / 2),
    );

    expect(intervalYMin).toBeCloseTo(pathYMin, 6);
  });

  it('具有相同比例名称的叠加范围共享域', () => {
    const outer = expandOf(parsePlotIR(sharedYOverlaySpec));
    const marks = markLayersOf(outer);
    const temperatureSpan = spanOf(pathYValues(firstPathOf(marks[0])));
    const rainfallSpan = spanOf(pathYValues(firstPathOf(marks[1])));

    expect(temperatureSpan).toBeLessThan(rainfallSpan / 5);
  });

  it('覆盖 zindex 更改标记层顺序', () => {
    const outer = expandOf(parsePlotIR(dualAxisSpec));
    const marks = markLayersOf(outer);

    expect(marks.map(mark => mark.meta?.mark)).toEqual(['path', 'interval']);
  });

  it('仅在目标范围上声明的 x 轴不会复制到覆盖', () => {
    const outer = expandOf(parsePlotIR(dualAxisSpec));
    const xAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'x');

    expect(xAxes).toHaveLength(1);
  });
});
