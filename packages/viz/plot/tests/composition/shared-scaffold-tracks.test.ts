import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const rows = [
  { eventX: 0, eventY: 0, volumeX: 10, volumeY: 100, angleA: 0, radiusA: 1, angleB: 300, radiusB: 10 },
  { eventX: 1, eventY: 1, volumeX: 11, volumeY: 200, angleA: 30, radiusA: 2, angleB: 330, radiusB: 20 },
];

const cartesianScaffoldSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'lanesPlot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'xShared' },
    { type: 'linear', name: 'yLane' },
  ],
  composition: {
    defaultView: 'events',
    arrangements: [
      {
        kind: 'tracks',
        id: 'lanes',
        coordinate: { type: 'cartesian2D', x: 'xShared', y: 'yLane' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'events', view: 'events', band: { role: 'y', start: 0, end: 0.45 } },
          { id: 'volume', view: 'volume', band: { role: 'y', start: 0.55, end: 1 } },
        ],
      },
    ],
  },
  marks: [
    {
      contributeToDomain: true,
      type: 'point',
      coordinateView: 'events',
      encodings: { position: { x: { field: 'eventX' }, y: { field: 'eventY' } } },
      properties: { autoPadding: 'max-radius' },
    },
    {
      contributeToDomain: true,
      type: 'point',
      coordinateView: 'volume',
      encodings: { position: { x: { field: 'volumeX' }, y: { field: 'volumeY' } } },
      properties: { autoPadding: 'max-radius' },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'x', coordinateView: 'events' },
    { type: 'axis', dimension: 'y', coordinateView: 'volume', placement: { kind: 'side', side: 'right' } },
  ],
};

const polarScaffoldSpec = {
  namespace: 'plot',
  type: 'plot',
  id: 'ringsPlot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'angleShared' },
    { type: 'linear', name: 'radiusTrack' },
  ],
  composition: {
    defaultView: 'inner',
    arrangements: [
      {
        kind: 'tracks',
        id: 'rings',
        coordinate: { type: 'polar2D', angle: 'angleShared', radius: 'radiusTrack' },
        sharedRoles: ['x'],
        tracks: [
          { id: 'inner', view: 'inner', band: { role: 'y', start: 0.2, end: 0.5 } },
          { id: 'outer', view: 'outer', band: { role: 'y', start: 0.7, end: 1 } },
        ],
      },
    ],
  },
  marks: [
    {
      contributeToDomain: true,
      type: 'point',
      coordinateView: 'inner',
      encodings: { position: { x: { field: 'angleA' }, y: { field: 'radiusA' } } },
      properties: { autoPadding: 'max-radius' },
    },
    {
      contributeToDomain: true,
      type: 'point',
      coordinateView: 'outer',
      encodings: { position: { x: { field: 'angleB' }, y: { field: 'radiusB' } } },
      properties: { autoPadding: 'max-radius' },
    },
  ],
};

const parsePlotIR = (spec: unknown) => PlotSchema.parse(spec);

const expandOf = (spec: unknown, provenance = false): IRScope => {
  return lowerPlot(
    parsePlotIR(spec),
    { d: rows },
    { layout: { width: 480, height: 300 }, textMeasurer: measureLabel, provenance },
  ) as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

const isNode = (child: IRChild): child is IRNode => child.type === 'node';

const innerContentOf = (scope: IRScope): IRScope => scope.children.filter(isScope)[0];

const markLayersOf = (scope: IRScope): Array<IRScope> =>
  innerContentOf(scope)
    .children.filter(isScope)
    .filter(child => child.meta?.source === 'plot' && child.meta.layer === 'mark');

const axisLayersOf = (scope: IRScope): Array<IRScope> =>
  innerContentOf(scope)
    .children.filter(isScope)
    .filter(child => child.meta?.source === 'plot' && child.meta.layer === 'axis');

const nodesOf = (scope: IRScope): Array<IRNode> => scope.children.filter(isNode);

const xValuesOf = (scope: IRScope): Array<number> => nodesOf(scope).map(node => (node.position as [number, number])[0]);

const yValuesOf = (scope: IRScope): Array<number> => nodesOf(scope).map(node => (node.position as [number, number])[1]);

const distancesFromCenter = (scope: IRScope, center: [number, number]): Array<number> =>
  nodesOf(scope).map(node => {
    const [x, y] = node.position as [number, number];
    return Math.hypot(x - center[0], y - center[1]);
  });

describe('共享基础结构跟踪 schema', () => {
  it('共享基础结构规格保留 JSON 往返', () => {
    const parsed = parsePlotIR(JSON.parse(JSON.stringify(cartesianScaffoldSpec)));

    expect(parsed).toEqual(cartesianScaffoldSpec);
  });

  it('轨迹视图可以继承基础结构坐标', () => {
    const parsed = parsePlotIR(cartesianScaffoldSpec);
    const tracks = parsed.composition?.arrangements?.find(arrangement => arrangement.kind === 'tracks')?.tracks ?? [];

    expect(tracks.every(track => track.coordinate === undefined)).toBe(true);
  });

  it('带子可以接触基础结构边缘', () => {
    expect(() => parsePlotIR(cartesianScaffoldSpec)).not.toThrow();
  });

  it('不良频带范围被拒绝', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            tracks: [{ id: 'events', band: { role: 'y', start: 0.8, end: 0.2 } }],
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/band|start|end/i);
  });

  it('同一角色上的重叠带被拒绝', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            tracks: [
              { id: 'a', band: { role: 'y', start: 0, end: 0.6 } },
              { id: 'b', band: { role: 'y', start: 0.5, end: 1 } },
            ],
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/overlap|band/i);
  });

  it('重复的轨道 ID 被拒绝', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            tracks: [
              { id: 'events', band: { role: 'y', start: 0, end: 0.4 } },
              { id: 'events', band: { role: 'y', start: 0.6, end: 1 } },
            ],
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/duplicate track/i);
  });

  it('本地频段角色不得共享', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            sharedRoles: ['x', 'y'],
          },
        ],
      },
    };

    expect(() => parsePlotIR(spec)).toThrow(/sharedRoles|band/i);
  });
});

describe('共用基础结构轨道下降', () => {
  it('笛卡尔通道共享 x 并使用独立的 y 波段', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const [events, volume] = markLayersOf(outer);

    expect(Math.max(...xValuesOf(events))).toBeLessThan(Math.min(...xValuesOf(volume)));
    expect(Math.min(...yValuesOf(events))).toBeGreaterThan(Math.max(...yValuesOf(volume)));
  });

  it('极环共享角支架并使用不同的半径带', () => {
    const outer = expandOf(polarScaffoldSpec, true);
    const [inner, outerRing] = markLayersOf(outer);
    const center: [number, number] = [150, 150];

    expect(Math.max(...distancesFromCenter(inner, center))).toBeLessThan(
      Math.min(...distancesFromCenter(outerRing, center)),
    );
  });

  it('单轨基础结构像本地带一样下沉', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        defaultView: 'events',
        arrangements: [
          {
            kind: 'tracks',
            id: 'single',
            coordinate: { type: 'cartesian2D', x: 'xShared', y: 'yLane' },
            sharedRoles: ['x'],
            tracks: [{ id: 'events', view: 'events', band: { role: 'y', start: 0, end: 1 } }],
          },
        ],
      },
      marks: [cartesianScaffoldSpec.marks[0]],
      guides: [],
    };

    expect(markLayersOf(expandOf(spec, true))).toHaveLength(1);
  });

  it('空 sharedRoles 只能共用基础结构框架', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            sharedRoles: [],
            frame: 'shared',
          },
        ],
      },
    };

    expect(markLayersOf(expandOf(spec, true))).toHaveLength(2);
  });

  it('辅助线可以绑定到轨迹视图', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const axes = axisLayersOf(outer);

    expect(axes.map(axis => axis.meta?.dimension)).toEqual(['x', 'y']);
  });

  it('来源追溯元携带排列和曲目标识', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const [events, volume] = markLayersOf(outer);

    expect(events.meta).toMatchObject({ arrangement: 'lanes', track: 'events' });
    expect(volume.meta).toMatchObject({ arrangement: 'lanes', track: 'volume' });
    expect(events.meta?.scaffold).toBeUndefined();
    expect(volume.meta?.scaffold).toBeUndefined();
  });

  it('未知的共享角色在下降过程中失败', () => {
    const spec = {
      ...cartesianScaffoldSpec,
      composition: {
        ...cartesianScaffoldSpec.composition,
        arrangements: [
          {
            ...cartesianScaffoldSpec.composition.arrangements[0],
            sharedRoles: ['theta'],
          },
        ],
      },
    };

    expect(() => expandOf(spec, true)).toThrow(/shared role|theta/i);
  });
});

describe('轨道放置遏制', () => {
  it('保持轨迹轴边界，同时抖动缩小映射位置', () => {
    const baseline = expandOf(cartesianScaffoldSpec, true);
    const jittered = expandOf(
      {
        ...cartesianScaffoldSpec,
        marks: cartesianScaffoldSpec.marks.map(mark => ({
          ...mark,
          properties: {
            ...mark.properties,
            placement: { adjustments: [{ kind: 'jitter', role: 'y', span: 20, seed: 7 }] },
          },
        })),
      },
      true,
    );
    const axisLines = (scope: IRScope) =>
      axisLayersOf(scope).map(layer => layer.children.find(child => child.type === 'path'));
    expect(axisLines(baseline)).toHaveLength(2);
    expect(axisLines(jittered)).toEqual(axisLines(baseline));
    expect(markLayersOf(jittered).map(yValuesOf)).not.toEqual(markLayersOf(baseline).map(yValuesOf));
  });
});
