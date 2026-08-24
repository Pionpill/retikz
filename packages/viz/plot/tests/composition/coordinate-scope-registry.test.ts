import type { IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { IRPlot } from '../../src/schemas';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';

const rows = [
  { month: 0, value: 10 },
  { month: 1, value: 20 },
  { month: 2, value: 15 },
];

const coordinateShorthandSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yValue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
  marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
  guides: [{ type: 'axis', dimension: 'x' }],
};

const compositionSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yValue' },
  ],
  composition: {
    defaultView: 'timeline',
    views: [
      {
        id: 'timeline',
        coordinate: { type: 'cartesian1D', x: 'xMonth' },
        placement: { kind: 'root' },
      },
      {
        id: 'xy',
        coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
        placement: { kind: 'overlay', target: 'timeline' },
      },
    ],
  },
  marks: [
    { type: 'point', encoding: { x: { field: 'month' } } },
    { type: 'point', coordinateView: 'xy', encoding: { x: { field: 'month' }, y: { field: 'value' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', coordinateView: 'xy' },
  ],
};

const parsePlotIR = (spec: unknown): IRPlot => PlotSchema.parse(spec);

const parsedComposition = (): IRPlot => parsePlotIR(compositionSpec);

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlot(spec, { sales: rows }, { width: 480, height: 300 }) as IRScope;
};

describe('coordinate composition registry schema', () => {
  it('compat_coordinate_shorthand_parses', () => {
    expect(parsePlotIR(coordinateShorthandSpec)).toEqual(coordinateShorthandSpec);
  });

  it('composition_scope_registry_parses_without_top_level_coordinate', () => {
    expect(parsePlotIR(compositionSpec)).toEqual(compositionSpec);
  });

  it('composition_scope_registry_round_trips_through_json', () => {
    const json = JSON.parse(JSON.stringify(compositionSpec));
    expect(parsePlotIR(json)).toEqual(compositionSpec);
  });

  it('mark_and_axis_coordinate_scope_fields_are_preserved', () => {
    const parsed = parsedComposition();
    expect(parsed.marks[1]).toMatchObject({ coordinateView: 'xy' });
    expect(parsed.guides?.[1]).toMatchObject({ coordinateView: 'xy' });
  });

  it('single_explicit_root_scope_matches_schema_contract', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    expect(parsePlotIR(spec)).toEqual(spec);
  });

  it('custom_coordinate_scope_schema_passes_and_round_trips', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'arch',
        views: [{ id: 'arch', coordinate: { type: 'arch', x: 'xMonth', archHeight: 30 } }],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' } } }],
      guides: [],
    };
    expect(parsePlotIR(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('empty_composition_scopes_rejected', () => {
    const spec = { ...compositionSpec, composition: { defaultView: 'main', views: [] } };
    expect(() => parsePlotIR(spec)).toThrow();
  });

  it('duplicate_scope_id_rejected', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
        ],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow(/duplicate coordinate view/i);
  });

  it('missing_default_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'missing',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow(/defaultView/);
  });

  it('missing_mark_coordinate_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      marks: [{ type: 'point', coordinateView: 'missing', encoding: { x: { field: 'month' } } }],
    };
    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('missing_axis_coordinate_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateView: 'missing' }],
    };
    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('compat_mark_coordinate_scope_must_reference_implicit_default_scope', () => {
    const spec = {
      ...coordinateShorthandSpec,
      marks: [{ type: 'point', coordinateView: 'missing', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
    };
    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('compat_axis_coordinate_scope_must_reference_implicit_default_scope', () => {
    const spec = {
      ...coordinateShorthandSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateView: 'missing' }],
    };
    expect(() => parsePlotIR(spec)).toThrow(/coordinateView/);
  });

  it('coordinate_and_composition_coexistence_rejected', () => {
    const spec = { ...compositionSpec, coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } };
    expect(() => parsePlotIR(spec)).toThrow(/composition/);
  });

  it('overlay_target_must_reference_registered_scope', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
          {
            id: 'overlay',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'missing' },
          },
        ],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    expect(() => parsePlotIR(spec)).toThrow(/target/);
  });

  it('overlay_target_cannot_reference_itself', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        views: [
          {
            id: 'main',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'main' },
          },
        ],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow(/target/);
  });

  it('track_arrangement_requires_track_views', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'main',
        arrangements: [
          {
            kind: 'tracks',
            id: 'shared-x',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            sharedRoles: ['x'],
            tracks: [],
          },
        ],
      },
    };
    expect(() => parsePlotIR(spec)).toThrow();
  });
});

describe('coordinate composition registry lowering', () => {
  it('mark_and_axis_lowering_use_their_bound_coordinate_scope', () => {
    const outer = expandOf(parsedComposition());
    expect(outer.children.length).toBeGreaterThanOrEqual(4);
  });

  it('axis_scope_binding_can_use_dimension_that_only_exists_on_bound_scope', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultView: 'line',
        views: [
          { id: 'line', coordinate: { type: 'cartesian1D', x: 'xMonth' } },
          {
            id: 'plane',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'line' },
          },
        ],
      },
      marks: [
        { type: 'point', encoding: { x: { field: 'month' } } },
        { type: 'point', coordinateView: 'plane', encoding: { x: { field: 'month' }, y: { field: 'value' } } },
      ],
      guides: [{ type: 'axis', dimension: 'y', coordinateView: 'plane' }],
    };
    expect(() => expandOf(parsePlotIR(spec))).not.toThrow();
  });
});
