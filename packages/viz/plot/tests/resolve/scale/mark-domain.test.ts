import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { pointMarkDefinition } from '../../../src/providers/mark';
import { resolveScaleRegistry } from '../../../src/providers/scale';
import { LinearScaleSchema, PointMarkSchema, PlotSchema } from '../../../src/schemas';

const rows = [
  { x: 0, y: 0, r: 2 },
  { x: 5, y: 5, r: 30 },
  { x: 10, y: 10, r: 2 },
];

/** 用例尺寸尺度将平方根映射到半径范围 */
const radiusOf = (value: number) => 2 + ((Math.sqrt(value) - Math.sqrt(2)) / (Math.sqrt(30) - Math.sqrt(2))) * 28;

const pointPositions = (scope: IRScope): Array<[number, number]> =>
  scope.children.flatMap(child => {
    if (child.type === 'scope' && 'children' in child) return pointPositions(child as IRScope);
    if (child.type === 'node' && 'position' in child) return [(child as IRNode).position as [number, number]];
    return [];
  });
const plotOf = (padding: unknown = { kind: 'mark', marks: ['dots'] }, guides: Array<unknown> = []) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    width: 100,
    height: 100,
    data: { reference: 'rows' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: padding },
      { type: 'linear', name: 'y', domainPadding: padding },
      { type: 'sqrt', name: 'size', domain: [2, 30], range: [2, 30] },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    guides,
    marks: [
      {
        id: 'dots',
        type: 'point',
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
        size: { kind: 'field', value: 'r', scale: 'size' },
      },
    ],
  });

describe('mark padding 编译闭环', () => {
  it('实际 size 映射和最终 frame 使用紧凑留白', () => {
    const result = lowerPlotWithDataArtifact(plotOf(), { rows });
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales?.x;
    expect(scale).toBeDefined();
    const [left, right] = scale!.range();
    expect(scale!.coordinate(0) - left).toBeGreaterThanOrEqual(2);
    expect(scale!.coordinate(0) - left).toBeLessThan(2.1);
    expect(right - scale!.coordinate(10)).toBeGreaterThanOrEqual(2);
    expect(scale!.coordinate(5) - left).toBeGreaterThanOrEqual(30);
    expect(right - scale!.coordinate(5)).toBeGreaterThanOrEqual(30);
  });
  it('未知 mark 不回退', () => {
    expect(() => lowerPlotWithDataArtifact(plotOf({ kind: 'mark', marks: ['missing'] }), { rows })).toThrow(/missing/);
  });
  it('非法 schema 保留诊断', () => {
    expect(() => plotOf({ kind: 'mark', marks: [] })).toThrow();
    expect(() => plotOf({ kind: 'mark', marks: ['dots', 'dots'] })).toThrow();
  });
});

describe('shared mark padding', () => {
  it.each(['linear', 'radial'])('shares one padded %s domain across facet panels with different guides', type => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 8, upper: 15 } });
    const { coordinate, ...rest } = base;
    const spec = PlotSchema.parse({
      ...rest,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type } : scale)),
      width: 640,
      height: 300,
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate }],
        arrangements: [
          {
            kind: 'facet',
            id: 'groups',
            view: 'root',
            column: { field: 'group' },
            resolve: { scale: { y: 'independent' } },
          },
        ],
      },
    });
    const data = [
      ...rows.map(row => ({ ...row, group: 'A' })),
      ...rows.map(row => ({ ...row, y: row.y * 100000, group: 'B' })),
    ];
    const result = lowerPlotWithDataArtifact(spec, { rows: data });
    const frames = [...result.dataArtifact.frameByCoordinateScopeId.values()].slice(1);
    expect(frames.length).toBeGreaterThanOrEqual(2);
    const domains = frames.map(frame => frame.roleScales?.x?.domain());
    expect(domains.every(domain => JSON.stringify(domain) === JSON.stringify(domains[0]))).toBe(true);
    for (const frame of frames) {
      const scale = frame.roleScales!.x!;
      expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(10);
      expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(17);
    }
    expect(frames[0].roleScales!.y!.domain()).not.toEqual(frames[1].roleScales!.y!.domain());
  });
  it.each(['log', 'pow', 'sqrt', 'symlog', 'radial'])('protects glyphs with %s position mapping', type => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type, domain: [1, 10] } : scale)),
    });
    const data = [{ x: 1, y: 0, r: 2 }, rows[1], rows[2]];
    const result = lowerPlotWithDataArtifact(spec, { rows: data });
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;
    for (const row of data) {
      expect(scale.coordinate(row.x) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r));
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r));
    }
  });
});

describe('mark padding final geometry', () => {
  it.each(['sqrt', 'pow'])('keeps %s domains valid at zero while preserving edge space', type => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type, ...(type === 'pow' ? { exponent: 0.7 } : {}), domain: [0, 10] } : scale,
      ),
    });
    const scale = [...lowerPlotWithDataArtifact(spec, { rows }).dataArtifact.frameByCoordinateScopeId.values()][0]
      .roleScales!.x!;
    expect(scale.domain()[0]).toBe(0);
    expect(scale.ticks().values.every(value => typeof value === 'number' && value >= 0)).toBe(true);
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
  });

  it.each(['log', 'radial'])('protects reversed %s ranges with directional clearance', type => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 3, upper: 9 } });
    const data = [{ x: 1, y: 0, r: 2 }, rows[1], rows[2]];
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type, range: [100, 0], domain: [1, 10] } : scale,
      ),
    });
    const scale = [...lowerPlotWithDataArtifact(spec, { rows: data }).dataArtifact.frameByCoordinateScopeId.values()][0]
      .roleScales!.x!;
    for (const row of data) {
      expect(100 - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 3);
      expect(scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 9);
    }
  });

  it('protects both annular boundaries using radial scale and screen-unit clearance', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 4 });
    const spec = PlotSchema.parse({
      ...base,
      width: 400,
      height: 400,
      scales: base.scales.map(scale => (scale.name === 'y' ? { ...scale, type: 'radial' } : scale)),
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y', innerRadius: 0.3 },
    });
    const scale = [...lowerPlotWithDataArtifact(spec, { rows }).dataArtifact.frameByCoordinateScopeId.values()][0]
      .roleScales!.y!;
    for (const row of rows) {
      expect(scale.coordinate(row.y) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r) + 4);
      expect(scale.range()[1] - scale.coordinate(row.y)).toBeGreaterThanOrEqual(radiusOf(row.r) + 4);
    }
  });
  it.each(['band', 'point'])('protects categorical %s edges without changing category order', type => {
    const base = plotOf();
    const data = [
      { x: 'a', y: 0, r: 12 },
      { x: 'b', y: 5, r: 30 },
      { x: 'c', y: 10, r: 8 },
    ];
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type } : scale)),
    });
    const frame = [
      ...lowerPlotWithDataArtifact(spec, { rows: data }).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];
    const scale = frame.roleScales!.x!;
    expect(scale.domain()).toEqual(['a', 'b', 'c']);
    for (const row of data) {
      expect(scale.coordinate(row.x) - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(row.r));
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r));
    }
  });

  it.each([360, 90, -90, 270])('protects polar boundaries for a %s degree sweep', endAngle => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      width: 300,
      height: 300,
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y', startAngle: 0, endAngle },
    });
    const frame = [...lowerPlotWithDataArtifact(spec, { rows }).dataArtifact.frameByCoordinateScopeId.values()][0];
    const radial = frame.roleScales!.y!;
    const angular = frame.roleScales!.x!;
    for (const row of rows) {
      const radius = radial.coordinate(row.y);
      expect(radial.range()[1] - radius).toBeGreaterThanOrEqual(radiusOf(row.r));
      if (endAngle !== 360) {
        const angle = (Math.abs(angular.coordinate(row.x)) * Math.PI) / 180;
        const sweep = (Math.abs(endAngle) * Math.PI) / 180;
        expect(radius * Math.sin(Math.min(Math.PI / 2, angle))).toBeGreaterThanOrEqual(radiusOf(row.r) - 1e-10);
        expect(radius * Math.sin(Math.min(Math.PI / 2, sweep - angle))).toBeGreaterThanOrEqual(radiusOf(row.r) - 1e-10);
      }
    }
    if (endAngle === 360) expect(angular.domain()).toEqual([0, 10]);
  });
  it('contains discrete polar points inside their chord boundary', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 3 });
    const data = ['a', 'b', 'c', 'd'].map((x, index) => ({ x, y: index * 3, r: 8 }));
    const spec = PlotSchema.parse({
      ...base,
      width: 400,
      height: 400,
      coordinate: { type: 'polar2D', angle: 'x', radius: 'y' },
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, type: 'band', paddingInner: 0, paddingOuter: 0 } : scale,
      ),
    });
    const frame = [
      ...lowerPlotWithDataArtifact(spec, { rows: data }).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];
    const radial = frame.roleScales!.y!;
    for (const row of data) {
      const mapped = frame.mapRoles!([row.x, row.y])!;
      const extent = frame.placementBoundary!.glyphExtentInRoleUnits('y', mapped, radiusOf(row.r) + 3)!;
      expect(radial.range()[1] - mapped[1]).toBeGreaterThanOrEqual(extent);
    }
    expect(frame.roleScales!.x!.domain()).toEqual(data.map(row => row.x));
  });

  const frameOf = (spec: unknown, data = rows) =>
    [
      ...lowerPlotWithDataArtifact(PlotSchema.parse(spec), {
        rows: data,
      }).dataArtifact.frameByCoordinateScopeId.values(),
    ][0];

  it('preserves a fixed zero end while protecting the opposite end', () => {
    const scale = frameOf(plotOf({ kind: 'mark', marks: ['dots'], lower: 0 })).roleScales!.x!;
    const [start, end] = scale.range();
    expect(scale.coordinate(0)).toBe(start);
    expect(end - scale.coordinate(10)).toBeGreaterThanOrEqual(2);
  });

  it('ignores outside-domain targets without filtering rendered data', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' || scale.name === 'y' ? { ...scale, domain: [0, 10] } : scale,
      ),
    };
    const outside = [...rows, { x: -1, y: 5, r: 30 }];
    expect(frameOf(spec, outside).roleScales!.x!.domain()).toEqual(frameOf(spec).roleScales!.x!.domain());
    expect(lowerPlotWithDataArtifact(PlotSchema.parse(spec), { rows: outside }).dataArtifact).toBeDefined();
  });

  it('recomputes geometry for a changed drawing area', () => {
    const base = plotOf();
    const narrow = frameOf(base).roleScales!.x!;
    const wide = frameOf({ ...base, width: 300 }).roleScales!.x!;
    expect(wide.domain()).not.toEqual(narrow.domain());
    expect(wide.coordinate(0) - wide.range()[0]).toBeGreaterThanOrEqual(2);
    expect(wide.coordinate(0) - wide.range()[0]).toBeLessThan(2.02);
  });

  it('retains fractional time padding below one millisecond', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type: 'time', domain: [0, 10] } : scale)),
    };
    const scale = frameOf(spec).roleScales!.x!;
    expect(scale.tickKind).toBe('time');
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(2);
  });

  it('keeps direction-independent protection for a reversed range', () => {
    const base = plotOf();
    const spec = {
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, range: [100, 0] } : scale)),
    };
    const scale = frameOf(spec).roleScales!.x!;
    expect(Math.abs(scale.coordinate(0) - scale.range()[0])).toBeGreaterThanOrEqual(2);
    expect(Math.abs(scale.coordinate(10) - scale.range()[1])).toBeGreaterThanOrEqual(2);
  });

  it('adds no padding for an empty visible sample set', () => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: 80 });
    const spec = {
      ...base,
      scales: base.scales.map(scale =>
        scale.name === 'x' || scale.name === 'y' ? { ...scale, domain: [0, 10] } : scale,
      ),
    };
    expect(frameOf(spec, []).roleScales!.x!.domain()).toEqual([0, 10]);
  });

  it('reports impossible extent instead of rendering a clipped automatic edge', () => {
    expect(() => frameOf({ ...plotOf(), width: 40 })).toThrow(/feasible/);
  });

  it('protects projected relation endpoints independently', () => {
    const base = plotOf();
    const spec = {
      ...base,
      marks: [
        {
          id: 'dots',
          type: 'relation',
          source: { project: { x: 'x', y: 'y' } },
          target: { project: { x: 'x', y: 'y' } },
          endpoints: {
            source: { size: { kind: 'constant', value: 8 } },
            target: { size: { kind: 'constant', value: 12 } },
          },
        },
      ],
    };
    const scale = frameOf(spec).roleScales!.x!;
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(12);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(12);
  });
});

describe('mark padding capabilities', () => {
  it('dispatches custom scales and marks through their existing definition registries', () => {
    const linear = resolveScaleRegistry().get('linear')!;
    const customScale = { ...linear, schema: LinearScaleSchema.extend({ type: literal('custom-affine') }) };
    const customMark = {
      ...pointMarkDefinition,
      schema: PointMarkSchema.extend({ type: literal('custom-dot') }),
      lower: ((mark, data, frame, channels, context) =>
        pointMarkDefinition.lower(
          { ...mark, type: 'point' },
          data,
          frame,
          channels,
          context,
        )) satisfies typeof pointMarkDefinition.lower,
    };
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type: 'custom-affine' } : scale)),
      marks: base.marks.map(mark => ({ ...mark, type: 'custom-dot' })),
    });
    const result = lowerPlotWithDataArtifact(
      spec,
      { rows },
      { scaleDefinitions: [customScale], markDefinitions: [customMark] },
    );
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;
    expect(scale.coordinate(0) - scale.range()[0]).toBeGreaterThanOrEqual(2);
  });

  it.each([4, { kind: 'ratio', value: 1 }])('protects actual jittered positions for span %j', span => {
    const base = plotOf();
    const spec = PlotSchema.parse({
      ...base,
      width: 180,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, type: 'point', padding: 0 } : scale)),
      marks: base.marks.map(mark => ({
        ...mark,
        placement: { adjustments: [{ kind: 'jitter', role: 'x', span, seed: 1 }] },
      })),
    });
    const result = lowerPlotWithDataArtifact(spec, { rows });
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;
    const positions = pointPositions(result.child as IRScope);
    expect(positions).toHaveLength(rows.length);
    expect(positions.some((position, index) => position[0] !== scale.coordinate(rows[index].x))).toBe(true);
    positions.forEach((position, index) => {
      expect(position[0] - scale.range()[0]).toBeGreaterThanOrEqual(radiusOf(rows[index].r));
      expect(scale.range()[1] - position[0]).toBeGreaterThanOrEqual(radiusOf(rows[index].r));
    });
  });
});

describe('mark padding effective observations', () => {
  it('uses locally transformed positions and sizes', () => {
    const base = plotOf();
    const transformed = PlotSchema.parse({
      ...base,
      marks: base.marks.map(mark => ({
        ...mark,
        transform: [{ kind: 'summarize', groupBy: ['x', 'y'], metrics: [{ kind: 'mean', field: 'r', as: 'r' }] }],
      })),
    });
    const duplicateRows = [
      { x: 0, y: 0, r: 2 },
      { x: 0, y: 0, r: 30 },
      { x: 10, y: 10, r: 2 },
    ];
    const compactRows = [
      { x: 0, y: 0, r: 16 },
      { x: 10, y: 10, r: 2 },
    ];
    const domainOf = (spec: ReturnType<typeof plotOf>, data: typeof rows) =>
      [
        ...lowerPlotWithDataArtifact(spec, { rows: data }).dataArtifact.frameByCoordinateScopeId.values(),
      ][0].roleScales!.x!.domain();
    expect(domainOf(transformed, duplicateRows)).toEqual(domainOf(base, compactRows));
  });
  it('ignores missing positions and mapped sizes', () => {
    const base = plotOf();
    const getDomain = (data: Array<Record<string, number | null>>) =>
      [
        ...lowerPlotWithDataArtifact(base, { rows: data }).dataArtifact.frameByCoordinateScopeId.values(),
      ][0].roleScales!.x!.domain();
    expect(getDomain([...rows, { x: null, y: 0, r: 30 }, { x: 0, y: 0, r: null }])).toEqual(getDomain(rows));
  });
});

describe('mark padding shared coordinate views', () => {
  it('combines marks from overlay views that consume one shared scale', () => {
    const base = plotOf();
    const { coordinate, ...rest } = base;
    const spec = PlotSchema.parse({
      ...rest,
      scales: base.scales.map(scale =>
        scale.name === 'x' ? { ...scale, domainPadding: { kind: 'mark', marks: ['dots', 'overlay-dots'] } } : scale,
      ),
      composition: {
        defaultView: 'root',
        views: [
          { id: 'root', coordinate },
          { id: 'overlay', coordinate, placement: { kind: 'overlay', target: 'root' } },
        ],
      },
      marks: [
        ...base.marks,
        { ...base.marks[0], id: 'overlay-dots', coordinateView: 'overlay', size: { kind: 'constant', value: 8 } },
      ],
    });
    const result = lowerPlotWithDataArtifact(spec, { rows });
    const frames = [...result.dataArtifact.frameByCoordinateScopeId.values()];
    expect(frames.length).toBe(2);
    expect(frames[0].roleScales!.x!.domain()).toEqual(frames[1].roleScales!.x!.domain());
    for (const frame of frames)
      expect(frame.roleScales!.x!.coordinate(0) - frame.roleScales!.x!.range()[0]).toBeGreaterThanOrEqual(8);
  });
});

describe('mark padding clearance', () => {
  it('protects final extents with additional clearance and honors a fixed zero end', () => {
    const result = lowerPlotWithDataArtifact(plotOf({ kind: 'mark', marks: ['dots'], clearance: 8, lower: 0 }), {
      rows,
    });
    const frame = [...result.dataArtifact.frameByCoordinateScopeId.values()][0];
    const scale = frame.roleScales!.x!;
    expect(scale.coordinate(0)).toBe(scale.range()[0]);
    for (const row of rows)
      expect(scale.range()[1] - scale.coordinate(row.x)).toBeGreaterThanOrEqual(radiusOf(row.r) + 8);
  });
  it('rejects impossible clearance and invalid JSON numbers', () => {
    expect(() => lowerPlotWithDataArtifact(plotOf({ kind: 'mark', marks: ['dots'], clearance: 60 }), { rows })).toThrow(
      /feasible/,
    );
    for (const clearance of [-1, Infinity, NaN])
      expect(() => plotOf({ kind: 'mark', marks: ['dots'], clearance })).toThrow();
  });
});

describe('directional mark clearance', () => {
  it('defaults an omitted clearance end to zero and preserves fixed ends', () => {
    const result = lowerPlotWithDataArtifact(
      plotOf({ kind: 'mark', marks: ['dots'], clearance: { upper: 8 }, lower: 0 }),
      { rows },
    );
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;
    expect(scale.coordinate(0)).toBe(scale.range()[0]);
    expect(scale.range()[1] - scale.coordinate(10)).toBeGreaterThanOrEqual(10);
    expect(() => plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: -1 } })).toThrow();
  });
  it.each([
    [0, 100],
    [100, 0],
  ])('preserves asymmetric clearance with range %j', (start, end) => {
    const base = plotOf({ kind: 'mark', marks: ['dots'], clearance: { lower: 3, upper: 15 } });
    const plot = PlotSchema.parse({
      ...base,
      scales: base.scales.map(scale => (scale.name === 'x' ? { ...scale, range: [start, end] } : scale)),
    });
    const result = lowerPlotWithDataArtifact(plot, { rows });
    const scale = [...result.dataArtifact.frameByCoordinateScopeId.values()][0].roleScales!.x!;
    for (const row of rows) {
      expect(Math.abs(scale.coordinate(row.x) - scale.range()[0])).toBeGreaterThanOrEqual(radiusOf(row.r) + 3);
      expect(Math.abs(scale.range()[1] - scale.coordinate(row.x))).toBeGreaterThanOrEqual(radiusOf(row.r) + 15);
    }
    expect(Math.abs(scale.coordinate(0) - scale.range()[0])).toBeLessThan(5.02);
  });
});
