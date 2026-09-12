import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { GRID_LAYOUT_MAX_TRACKS_PER_AXIS } from '@retikz/layout';
import { describe, expect, it } from 'vitest';

import type { FlowDiagramDefinitionOptions } from '../../src/flow';

import {
  createFlowDiagramProviderContribution,
  defineFlowLayout,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowLayoutSchema,
  getFlowLayoutCatalog,
  LayeredFlowLayoutDefinition,
} from '../../src/flow';

const layout = {
  kind: 'grid',
  id: 'grid',
  children: ['a', 'b', 'c', 'd'],
  placements: [
    ['a', 'b'],
    ['c', 'd'],
  ],
};

const objectPlacements = {
  a: { row: 0, column: 0 },
  b: { row: 0, column: 1 },
  c: { row: 1, column: 0 },
  d: { row: 1, column: 1 },
};

const compile = (
  grid: unknown = layout,
  direction = 'right',
  nodeGap = 17,
  options: FlowDiagramDefinitionOptions = {},
  relations?: unknown,
) => {
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    layout: { direction, nodeGap, rankGap: 91 },
    entities: [
      { id: 'a', text: 'A', layout: { margin: { left: 13, right: 2, top: 9, bottom: 1 } } },
      { id: 'b', text: 'Wide label' },
      { id: 'c', text: ['Multiple', 'lines'] },
      { id: 'd', text: 'D' },
    ],
    groups: [],
    layouts: [grid],
    children: ['grid'],
    relations,
  });
  const result = compileToScene(
    { type: 'scene', version: 1, children: [source] },
    {
      ...resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution(options)] }),
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );
  const artifact = FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
      ?.value,
  );
  const gridArtifact = artifact.elements[0];
  if (gridArtifact.kind !== 'layout') throw new Error('Expected Layout artifact');
  return { result, grid: gridArtifact, children: gridArtifact.elements };
};

describe('Flow Grid', () => {
  it.each(['right', 'left', 'up', 'down'])(
    'reserves measured label width and height under %s without losing shared centers',
    direction => {
      const horizontal = compile(layout, direction, 17, {}, [
        { source: 'a', target: 'b', label: 'A very long relation label' },
      ]);
      const vertical = compile(layout, 'right', 0, {}, [{ source: 'a', target: 'c', label: 'Vertical' }]);
      const [a, b, c, d] = horizontal.children.map(child => child.bounds);
      expect(b.x - a.x - a.width).toBeGreaterThanOrEqual(25 * 8 + 17);
      expect(a.x + a.width / 2).toBeCloseTo(c.x + c.width / 2, 8);
      expect(b.x + b.width / 2).toBeCloseTo(d.x + d.width / 2, 8);
      const [top, , bottom] = vertical.children.map(child => child.bounds);
      expect(bottom.y - top.y - top.height).toBeGreaterThanOrEqual(12);
    },
  );

  it('applies the same measured label constraints for a custom provider', () => {
    const provider = defineFlowLayout({ ...LayeredFlowLayoutDefinition, name: 'custom-labels' });
    const relations = [{ source: 'b', target: 'a', label: 'x'.repeat(40) }];
    expect(
      compile(layout, 'right', 17, { flowLayouts: [provider], defaultFlowLayout: provider.name }, relations).children,
    ).toEqual(compile(layout, 'right', 17, {}, relations).children);
  });

  it('adds each Grid axis label dimension to the configured track gap by default', () => {
    const configured = { ...layout, rowGap: 32, columnGap: 32 };
    const baseline = compile(configured);
    const horizontal = compile(configured, 'right', 17, {}, [{ source: 'a', target: 'b', label: 'xy' }]);
    const vertical = compile(configured, 'right', 17, {}, [{ source: 'a', target: 'c', label: 'xy' }]);
    expect(horizontal.grid.bounds.width - baseline.grid.bounds.width).toBe(16);
    expect(vertical.grid.bounds.height - baseline.grid.bounds.height).toBeCloseTo(16.8, 8);
  });

  it('uses configured Grid gaps without label reservation when disabled', () => {
    const configured = { ...layout, rowGap: 32, columnGap: 32, reserveLabelSpace: false };
    const baseline = compile(configured);
    const labeled = compile(configured, 'right', 17, {}, [
      { source: 'a', target: 'b', label: 'long label' },
      { source: 'a', target: 'c', label: 'long label' },
    ]);
    expect(labeled.grid.bounds).toEqual(baseline.grid.bounds);
    expect(labeled.children).toEqual(baseline.children);
  });

  it('reserves each sparse column gap for the largest measured label deterministically', () => {
    const sparse = {
      ...layout,
      placements: [
        ['a', null, null, 'b'],
        ['c', null, null, 'd'],
      ],
    };
    const baseline = compile(sparse, 'right', 100);
    const short = compile(sparse, 'right', 100, {}, [{ source: 'a', target: 'b', label: 'x' }]);
    expect(short.children[1].bounds.x - baseline.children[1].bounds.x).toBe(24);
    const relations = [
      { source: 'a', target: 'b', label: 'x'.repeat(100) },
      { source: 'c', target: 'd', label: 'short' },
    ];
    const first = compile(sparse, 'right', 0, {}, relations);
    const reversed = compile(sparse, 'right', 0, {}, [...relations].reverse());
    expect(first.children).toEqual(reversed.children);
    const [a, b] = first.children.map(child => child.bounds);
    expect(b.x - a.x - a.width).toBeGreaterThanOrEqual(2400);
  });
  it('declares both placement kinds in the builtin catalog and rejects unsupported kinds before callbacks', () => {
    expect(getFlowLayoutCatalog()[0].capabilities.placementKinds).toEqual(['linear', 'grid']);
    let calls = 0;
    const linear = defineFlowLayout({
      ...LayeredFlowLayoutDefinition,
      name: 'linear-only',
      capabilities: { ...LayeredFlowLayoutDefinition.capabilities, placementKinds: ['linear'] },
      layout: (input, context) => {
        calls += 1;
        return LayeredFlowLayoutDefinition.layout(input, context);
      },
    });
    expect(() => compile(layout, 'right', 17, { flowLayouts: [linear], defaultFlowLayout: linear.name })).toThrow();
    expect(calls).toBe(0);
  });

  it.each([{ placementKinds: [] }, { placementKinds: ['grid', 'grid'] }] as const)(
    'rejects empty or repeated placement capabilities %#',
    ({ placementKinds }) => {
      const provider = defineFlowLayout({
        ...LayeredFlowLayoutDefinition,
        name: 'invalid-kinds',
        capabilities: { ...LayeredFlowLayoutDefinition.capabilities, placementKinds },
      });
      expect(() => getFlowLayoutCatalog({ flowLayouts: [provider] })).toThrow();
    },
  );

  it('gives custom providers the same single-call Grid boundary', () => {
    let calls = 0;
    const custom = defineFlowLayout({
      ...LayeredFlowLayoutDefinition,
      name: 'observe-grid',
      layout: (input, context) =>
        LayeredFlowLayoutDefinition.layout(input, {
          placeLayout: placement => {
            calls += 1;
            expect(placement.layout.kind).toBe('grid');
            if (placement.layout.kind === 'grid') expect(placement.layout.reserveLabelSpace).toBe(true);
            return context.placeLayout(placement);
          },
        }),
    });
    const customResult = compile(layout, 'right', 17, { flowLayouts: [custom], defaultFlowLayout: custom.name });
    expect(calls).toBe(1);
    expect(customResult.children).toEqual(compile().children);
  });

  it('rejects provider changes to authored cells and to final relative positions', () => {
    const changedCells = defineFlowLayout({
      ...LayeredFlowLayoutDefinition,
      name: 'change-cells',
      layout: (input, context) =>
        LayeredFlowLayoutDefinition.layout(input, {
          placeLayout: placement =>
            context.placeLayout({
              ...placement,
              layout: {
                kind: 'grid',
                id: 'grid',
                rowGap: 17,
                columnGap: 17,
                reserveLabelSpace: true,
                placements: [[null, 'b'], ['c', 'd'], [], [null, null, null, 'a']],
              },
            }),
        }),
    });
    expect(() =>
      compile(layout, 'right', 17, { flowLayouts: [changedCells], defaultFlowLayout: changedCells.name }),
    ).toThrow();
    const shifted = defineFlowLayout({
      ...LayeredFlowLayoutDefinition,
      name: 'shift-child',
      layout: (input, context) => {
        const output = LayeredFlowLayoutDefinition.layout(input, context);
        return {
          ...output,
          elements: output.elements.map(element =>
            element.id === 'a' ? { ...element, bounds: { ...element.bounds, x: element.bounds.x + 1 } } : element,
          ),
        };
      },
    });
    expect(() => compile(layout, 'right', 17, { flowLayouts: [shifted], defaultFlowLayout: shifted.name })).toThrow();
  });
  it('round-trips Grid placement rows without deriving containment or sorting children', () => {
    const source = FlowLayoutSchema.parse(layout);
    expect(FlowLayoutSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it('accepts object-mapped placements with the same Grid geometry as a matrix', () => {
    const source = {
      ...layout,
      placements: objectPlacements,
    };
    const parsed = FlowLayoutSchema.safeParse(source);
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.kind !== 'grid') return;

    expect(parsed.data.placements).toEqual(source.placements);
    expect(compile(parsed.data).children).toEqual(compile(layout).children);
  });

  it.each([
    { ...layout, kind: undefined },
    { ...layout, direction: 'right' },
    { ...layout, placements: { a: { row: 0, column: 0 } } },
    { ...layout, placements: { ...objectPlacements, a: { row: -1, column: 0 } } },
    { ...layout, placements: { ...objectPlacements, a: { row: 0.5, column: 0 } } },
    {
      ...layout,
      placements: { ...objectPlacements, a: { row: 0, column: GRID_LAYOUT_MAX_TRACKS_PER_AXIS } },
    },
    { ...layout, placements: { ...objectPlacements, a: { row: 0, column: 1 } } },
    { ...layout, placements: { b: objectPlacements.b, c: objectPlacements.c, d: objectPlacements.d } },
    { ...layout, placements: { ...objectPlacements, extra: { row: 3, column: 3 } } },
    {
      ...layout,
      placements: [
        ['a', 'b'],
        ['c', 'a'],
      ],
    },
    {
      ...layout,
      placements: [
        ['a', 'b'],
        ['c', null],
      ],
    },
    {
      ...layout,
      placements: [
        ['a', 'b'],
        ['c', 'd', 'extra'],
      ],
    },
    {
      ...layout,
      placements: Array.from({ length: GRID_LAYOUT_MAX_TRACKS_PER_AXIS + 1 }, (_, index) =>
        index === 0 ? ['a', 'b'] : [],
      ),
    },
    {
      ...layout,
      placements: [
        ['a', 'b', ...Array.from({ length: GRID_LAYOUT_MAX_TRACKS_PER_AXIS - 1 }, () => null)],
        ['c', 'd'],
      ],
    },
  ])('rejects malformed grid input %#', source => {
    expect(FlowLayoutSchema.safeParse(source).success).toBe(false);
  });

  it('locates missing placements at the Grid matrix', () => {
    const parsed = FlowLayoutSchema.safeParse({
      ...layout,
      placements: [
        ['a', 'b'],
        ['c', null],
      ],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues.map(issue => issue.path)).toContainEqual(['placements']);
  });

  it.each(['right', 'left', 'up', 'down'])(
    'shares physical centers with asymmetric margins under %s routing',
    direction => {
      const { children } = compile(layout, direction);
      const [a, b, c, d] = children.map(child => child.bounds);
      expect(a.x + a.width / 2).toBeCloseTo(c.x + c.width / 2, 8);
      expect(b.x + b.width / 2).toBeCloseTo(d.x + d.width / 2, 8);
      expect(a.y + a.height / 2).toBeCloseTo(b.y + b.height / 2, 8);
      expect(c.y + c.height / 2).toBeCloseTo(d.y + d.height / 2, 8);
      expect(a.width).not.toBe(b.width);
      expect(a.height).not.toBe(c.height);
      expect(b.x).toBeGreaterThan(a.x);
      expect(c.y).toBeGreaterThan(a.y);
    },
  );

  it('uses nodeGap independently for both axes and respects explicit zero', () => {
    const implicit = compile().grid.bounds;
    const explicit = compile({ ...layout, rowGap: 17, columnGap: 17 }).grid.bounds;
    const zero = compile({ ...layout, rowGap: 0, columnGap: 0 }).grid.bounds;
    expect(implicit).toEqual(explicit);
    expect(explicit.width - zero.width).toBeCloseTo(17, 8);
    expect(explicit.height - zero.height).toBeCloseTo(17, 8);
  });

  it('preserves empty tracks and authored order without synthetic children', () => {
    const sparse = {
      ...layout,
      children: ['d', 'c', 'b', 'a'],
      placements: [['a', null, 'b'], [], ['c', null, 'd']],
    };
    const dense = compile();
    const result = compile(sparse);
    expect(result.children.map(child => child.id)).toEqual(['d', 'c', 'b', 'a']);
    expect(result.grid.bounds.width - dense.grid.bounds.width).toBeCloseTo(17, 8);
    expect(result.grid.bounds.height - dense.grid.bounds.height).toBeCloseTo(17, 8);
    expect(JSON.stringify(result.result.scene)).not.toContain('"id":"grid"');
  });
});
