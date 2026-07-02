import type { IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { PlotSpec } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { migrateCompositionSpec, parseCompositionSpec } from './migrate-composition-spec';

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
    defaultScope: 'timeline',
    scopes: [
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
    { type: 'point', coordinateScope: 'xy', encoding: { x: { field: 'month' }, y: { field: 'value' } } },
  ],
  guides: [
    { type: 'axis', dimension: 'x' },
    { type: 'axis', dimension: 'y', coordinateScope: 'xy' },
  ],
};

const parsedCompositionSpec = (): PlotSpec => parseCompositionSpec(compositionSpec);

const expandOf = (spec: PlotSpec): IRScope => {
  const [definition] = lowerPlots({ sales: rows }, { width: 480, height: 300 });
  return definition.expand(spec) as IRScope;
};

describe('coordinate composition registry schema', () => {
  it('compat_coordinate_shorthand_parses', () => {
    expect(parseCompositionSpec(coordinateShorthandSpec)).toEqual(migrateCompositionSpec(coordinateShorthandSpec));
  });

  it('composition_scope_registry_parses_without_top_level_coordinate', () => {
    expect(parseCompositionSpec(compositionSpec)).toEqual(migrateCompositionSpec(compositionSpec));
  });

  it('composition_scope_registry_round_trips_through_json', () => {
    const json = JSON.parse(JSON.stringify(compositionSpec));
    expect(parseCompositionSpec(json)).toEqual(migrateCompositionSpec(compositionSpec));
  });

  it('mark_and_axis_coordinate_scope_fields_are_preserved', () => {
    const parsed = parsedCompositionSpec();
    expect(parsed.marks[1]).toMatchObject({ coordinateView: 'xy' });
    expect(parsed.guides?.[1]).toMatchObject({ coordinateView: 'xy' });
  });

  it('single_explicit_root_scope_matches_schema_contract', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'main',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'value' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    expect(parseCompositionSpec(spec)).toEqual(migrateCompositionSpec(spec));
  });

  it('custom_coordinate_scope_schema_passes_and_round_trips', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'arch',
        scopes: [{ id: 'arch', coordinate: { type: 'arch', x: 'xMonth', archHeight: 30 } }],
      },
      marks: [{ type: 'point', encoding: { x: { field: 'month' } } }],
      guides: [],
    };
    expect(parseCompositionSpec(JSON.parse(JSON.stringify(spec)))).toEqual(migrateCompositionSpec(spec));
  });

  it('empty_composition_scopes_rejected', () => {
    const spec = { ...compositionSpec, composition: { defaultScope: 'main', scopes: [] } };
    expect(() => parseCompositionSpec(spec)).toThrow();
  });

  it('duplicate_scope_id_rejected', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'main',
        scopes: [
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
          { id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } },
        ],
      },
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/duplicate coordinate view/i);
  });

  it('missing_default_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'missing',
        scopes: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } }],
      },
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/defaultView/);
  });

  it('missing_mark_coordinate_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      marks: [{ type: 'point', coordinateScope: 'missing', encoding: { x: { field: 'month' } } }],
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/coordinateView/);
  });

  it('missing_axis_coordinate_scope_rejected', () => {
    const spec = {
      ...compositionSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateScope: 'missing' }],
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/coordinateView/);
  });

  it('compat_mark_coordinate_scope_must_reference_implicit_default_scope', () => {
    const spec = {
      ...coordinateShorthandSpec,
      marks: [
        { type: 'point', coordinateScope: 'missing', encoding: { x: { field: 'month' }, y: { field: 'value' } } },
      ],
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/coordinateView/);
  });

  it('compat_axis_coordinate_scope_must_reference_implicit_default_scope', () => {
    const spec = {
      ...coordinateShorthandSpec,
      guides: [{ type: 'axis', dimension: 'x', coordinateScope: 'missing' }],
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/coordinateView/);
  });

  it('coordinate_and_composition_coexistence_rejected', () => {
    const spec = { ...compositionSpec, coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' } };
    expect(() => parseCompositionSpec(spec)).toThrow(/composition/);
  });

  it('overlay_target_must_reference_registered_scope', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'main',
        scopes: [
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
    expect(() => parseCompositionSpec(spec)).toThrow(/target/);
  });

  it('overlay_target_cannot_reference_itself', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'main',
        scopes: [
          {
            id: 'main',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'overlay', target: 'main' },
          },
        ],
      },
    };
    expect(() => parseCompositionSpec(spec)).toThrow(/target/);
  });

  it('track_placement_requires_scaffold_and_track_keys', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'main',
        scopes: [
          {
            id: 'main',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yValue' },
            placement: { kind: 'track', scaffold: 'shared-x' },
          },
        ],
      },
    };
    expect(() => parseCompositionSpec(spec)).toThrow();
  });
});

describe('coordinate composition registry lowering', () => {
  it('mark_and_axis_lowering_use_their_bound_coordinate_scope', () => {
    const outer = expandOf(parsedCompositionSpec());
    expect(outer.children.length).toBeGreaterThanOrEqual(4);
  });

  it('axis_scope_binding_can_use_dimension_that_only_exists_on_bound_scope', () => {
    const spec = {
      ...compositionSpec,
      composition: {
        defaultScope: 'line',
        scopes: [
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
        { type: 'point', coordinateScope: 'plane', encoding: { x: { field: 'month' }, y: { field: 'value' } } },
      ],
      guides: [{ type: 'axis', dimension: 'y', coordinateScope: 'plane' }],
    };
    expect(() => expandOf(parseCompositionSpec(spec))).not.toThrow();
  });
});
