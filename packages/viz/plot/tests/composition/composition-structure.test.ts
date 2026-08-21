import { describe, expect, it } from 'vitest';

import { PlotSchema } from '../../src/schemas';

const baseSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  composition: {
    defaultView: 'main',
    views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
  },
  marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  guides: [{ type: 'axis', dimension: 'y', coordinateView: 'main', grid: true }],
};

describe('composition structure schema', () => {
  it('composition_views_round_trip_as_json', () => {
    const parsed = PlotSchema.parse(JSON.parse(JSON.stringify(baseSpec)));

    expect(parsed).toEqual(baseSpec);
  });

  it('facet_arrangement_with_multilevel_header_parses', () => {
    const spec = {
      ...baseSpec,
      composition: {
        ...baseSpec.composition,
        arrangements: [
          {
            kind: 'facet',
            id: 'salesByRegion',
            view: 'main',
            row: [{ field: 'market' }, { field: 'segment' }],
            column: { field: 'quarter' },
            header: { row: true, column: true },
            resolve: {
              scale: { y: 'synchronized' },
              axis: { x: 'outer', y: 'outer' },
              grid: { y: 'all' },
            },
            spacing: { panelGap: 8, labelGap: 6 },
          },
        ],
      },
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('tracks_arrangement_with_generated_view_template_parses', () => {
    const spec = {
      ...baseSpec,
      composition: {
        ...baseSpec.composition,
        arrangements: [
          {
            kind: 'tracks',
            id: 'lanes',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
            sharedRoles: ['x'],
            tracks: [
              { id: 'price', band: { role: 'y', start: 0, end: 0.4 } },
              { id: 'volume', view: 'volumeLane', band: { role: 'y', start: 0.5, end: 1 } },
            ],
            header: { track: true },
            resolve: { axis: { x: 'outer', y: 'local' }, grid: { x: 'all' } },
            spacing: { trackGap: 6, labelGap: 4 },
            viewIdTemplate: '{arrangement}.track.{track}',
          },
        ],
      },
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('mixed_facet_and_tracks_arrangements_are_rejected', () => {
    const spec = {
      ...baseSpec,
      composition: {
        ...baseSpec.composition,
        arrangements: [
          {
            kind: 'facet',
            id: 'salesByRegion',
            view: 'main',
            column: { field: 'region' },
          },
          {
            kind: 'tracks',
            id: 'lanes',
            coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
            sharedRoles: ['x'],
            tracks: [{ id: 'price', band: { role: 'y', start: 0, end: 1 } }],
          },
        ],
      },
    };

    expect(() => PlotSchema.parse(spec)).toThrow(/cannot mix facet and track arrangements/i);
  });

  it('axis_grid_selected_selector_parses_with_new_view_and_arrangement_names', () => {
    const spec = {
      ...baseSpec,
      guides: [
        {
          type: 'axis',
          dimension: 'y',
          coordinateView: 'main',
          grid: {
            applyTo: 'selected',
            select: {
              view: ['main'],
              facet: { arrangement: 'salesByRegion', column: 'Q1' },
              track: { arrangement: 'lanes', id: 'price' },
            },
          },
        },
      ],
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('negative_spacing_is_rejected', () => {
    const spec = {
      ...baseSpec,
      composition: {
        ...baseSpec.composition,
        spacing: { panelGap: -1 },
      },
    };

    expect(() => PlotSchema.parse(spec)).toThrow();
  });
});
