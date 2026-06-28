import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSpecSchema } from '../../src/schemas';

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
    defaultScope: 'temp',
    scopes: [
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
    { type: 'path', order: 'day', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } },
    {
      type: 'interval',
      coordinateScope: 'rain',
      encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
    },
  ],
  guides: [
    { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } },
    { type: 'axis', dimension: 'y', coordinateScope: 'rain', placement: { kind: 'side', side: 'right' } },
    { type: 'axis', dimension: 'x', coordinateScope: 'temp', placement: { kind: 'side', side: 'bottom' } },
  ],
};

const expandOf = (spec: PlotSpec): IRScope => {
  const [definition] = lowerPlots({ weather: rows }, { width: 480, height: 300, provenance: true });
  return definition.expand(spec) as IRScope;
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
  return (move?.to as [number, number])[0];
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

const pathYValues = (path: IRPath): Array<number> =>
  path.children.flatMap(step => ('to' in step && Array.isArray(step.to) ? [(step.to)[1]] : []));

describe('same-panel multi-axis overlay schema', () => {
  it('axis_placement_and_overlay_zindex_round_trip', () => {
    const parsed = PlotSpecSchema.parse(JSON.parse(JSON.stringify(dualAxisSpec)));
    expect(parsed).toEqual(dualAxisSpec);
  });

  it('axis_placement_requires_known_kind', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'corner' } }],
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  it('axis_side_requires_cardinal_side', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'center' } }],
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  it('overlay_cycle_rejected', () => {
    const spec = {
      ...dualAxisSpec,
      composition: {
        defaultScope: 'a',
        scopes: [
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
      marks: [{ type: 'path', order: 'day', coordinateScope: 'a', encoding: { x: { field: 'day' }, y: { field: 'temperature' } } }],
      guides: [
        { type: 'axis', dimension: 'y', coordinateScope: 'a' },
        { type: 'axis', dimension: 'y', coordinateScope: 'b' },
      ],
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow(/cycle|overlay/i);
  });
});

describe('same-panel multi-axis overlay lowering', () => {
  it('left_and_right_y_axes_can_coexist', () => {
    const outer = expandOf(PlotSpecSchema.parse(dualAxisSpec));
    const yAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'y');
    expect(yAxes).toHaveLength(2);
    expect(moveXOf(firstPathOf(yAxes[1]))).toBeGreaterThan(moveXOf(firstPathOf(yAxes[0])));
  });

  it('duplicate_axis_same_scope_dimension_and_placement_rejected', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [
        { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } },
        { type: 'axis', dimension: 'y', coordinateScope: 'temp', placement: { kind: 'side', side: 'left' } },
      ],
    };
    expect(() => expandOf(PlotSpecSchema.parse(spec))).toThrow(/duplicate axis/i);
  });

  it('cartesian_rejects_incompatible_cardinal_side', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'x', placement: { kind: 'side', side: 'right' } }],
    };
    expect(() => expandOf(PlotSpecSchema.parse(spec))).toThrow(/cartesian x axis.*top or bottom/i);
  });

  it('cartesian_rejects_unknown_native_edge', () => {
    const spec = {
      ...dualAxisSpec,
      guides: [{ type: 'axis', dimension: 'y', placement: { kind: 'edge', edge: 'hypotenuse' } }],
    };
    expect(() => expandOf(PlotSpecSchema.parse(spec))).toThrow(/cartesian axis edge.*top, right, bottom, or left/i);
  });

  it('overlay_scope_uses_target_plot_area_for_projection', () => {
    const outer = expandOf(PlotSpecSchema.parse(dualAxisSpec));
    const marks = markLayersOf(outer);
    const intervalNodes = allNodes(marks[1]);
    const pathYMin = Math.min(...allPaths(marks[0]).flatMap(pathYValues));
    const intervalYMin = Math.min(
      ...intervalNodes.map(node => (node.position as [number, number])[1] - (node.minimumHeight ?? 0) / 2),
    );
    expect(intervalYMin).toBeCloseTo(pathYMin, 6);
  });

  it('overlay_zindex_changes_mark_layer_order', () => {
    const outer = expandOf(PlotSpecSchema.parse(dualAxisSpec));
    const marks = markLayersOf(outer);
    expect(marks.map(mark => mark.meta?.mark)).toEqual(['path', 'interval']);
  });

  it('x_axis_declared_only_on_target_scope_is_not_copied_to_overlay', () => {
    const outer = expandOf(PlotSpecSchema.parse(dualAxisSpec));
    const xAxes = axisLayersOf(outer).filter(axis => axis.meta?.dimension === 'x');
    expect(xAxes).toHaveLength(1);
  });

  it('ternary_rejects_explicit_cardinal_side', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'weather' },
      scales: [
        { type: 'linear', name: 'tx' },
        { type: 'linear', name: 'ty' },
        { type: 'linear', name: 'tz' },
      ],
      coordinate: { type: 'ternary2D', x: 'tx', y: 'ty', z: 'tz' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
      guides: [{ type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'right' } }],
    };
    expect(() => expandOf(PlotSpecSchema.parse(spec))).toThrow(/ternary.*side|side.*ternary/i);
  });
});
