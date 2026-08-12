import type { IRChild, IRNode, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSpecSchema } from '../../src/schemas';

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
    { type: 'point', coordinateView: 'events', encoding: { x: { field: 'eventX' }, y: { field: 'eventY' } } },
    { type: 'point', coordinateView: 'volume', encoding: { x: { field: 'volumeX' }, y: { field: 'volumeY' } } },
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
    { type: 'point', coordinateView: 'inner', encoding: { x: { field: 'angleA' }, y: { field: 'radiusA' } } },
    { type: 'point', coordinateView: 'outer', encoding: { x: { field: 'angleB' }, y: { field: 'radiusB' } } },
  ],
};

const parsePlotSpec = (spec: unknown) => PlotSpecSchema.parse(spec);

const expandOf = (spec: unknown, provenance = false): IRScope => {
  const [definition] = lowerPlots({ d: rows }, { width: 480, height: 300, provenance });
  return definition.expand(parsePlotSpec(spec)).children[0] as IRScope;
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

describe('shared scaffold tracks schema', () => {
  it('shared scaffold spec preserves JSON round trip', () => {
    const parsed = parsePlotSpec(JSON.parse(JSON.stringify(cartesianScaffoldSpec)));
    expect(parsed).toEqual(cartesianScaffoldSpec);
  });

  it('track view can inherit scaffold coordinate', () => {
    const parsed = parsePlotSpec(cartesianScaffoldSpec);
    const tracks = parsed.composition?.arrangements?.find(arrangement => arrangement.kind === 'tracks')?.tracks ?? [];
    expect(tracks.every(track => track.coordinate === undefined)).toBe(true);
  });

  it('band can touch scaffold edges', () => {
    expect(() => parsePlotSpec(cartesianScaffoldSpec)).not.toThrow();
  });

  it('bad band range is rejected', () => {
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
    expect(() => parsePlotSpec(spec)).toThrow(/band|start|end/i);
  });

  it('overlapping bands on the same role are rejected', () => {
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
    expect(() => parsePlotSpec(spec)).toThrow(/overlap|band/i);
  });

  it('duplicate track id is rejected', () => {
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
    expect(() => parsePlotSpec(spec)).toThrow(/duplicate track/i);
  });

  it('local band role must not be shared', () => {
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
    expect(() => parsePlotSpec(spec)).toThrow(/sharedRoles|band/i);
  });
});

describe('shared scaffold tracks lowering', () => {
  it('cartesian lanes share x and use independent y bands', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const [events, volume] = markLayersOf(outer);
    expect(Math.max(...xValuesOf(events))).toBeLessThan(Math.min(...xValuesOf(volume)));
    expect(Math.min(...yValuesOf(events))).toBeGreaterThan(Math.max(...yValuesOf(volume)));
  });

  it('polar rings share angle scaffold and use different radius bands', () => {
    const outer = expandOf(polarScaffoldSpec, true);
    const [inner, outerRing] = markLayersOf(outer);
    const center: [number, number] = [240, 150];
    expect(Math.max(...distancesFromCenter(inner, center))).toBeLessThan(
      Math.min(...distancesFromCenter(outerRing, center)),
    );
  });

  it('single track scaffold lowers like a local band', () => {
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

  it('empty sharedRoles can share only the scaffold frame', () => {
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

  it('guide can bind to a track view', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const axes = axisLayersOf(outer);
    expect(axes.map(axis => axis.meta?.dimension)).toEqual(['x', 'y']);
  });

  it('provenance meta carries arrangement and track identity', () => {
    const outer = expandOf(cartesianScaffoldSpec, true);
    const [events, volume] = markLayersOf(outer);
    expect(events.meta).toMatchObject({ arrangement: 'lanes', track: 'events' });
    expect(volume.meta).toMatchObject({ arrangement: 'lanes', track: 'volume' });
    expect(events.meta?.scaffold).toBeUndefined();
    expect(volume.meta?.scaffold).toBeUndefined();
  });

  it('unknown shared role fails loud during lowering', () => {
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
