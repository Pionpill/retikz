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
  marks: [
    {
      contributeToDomain: true,
      type: 'point',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
    },
  ],
  guides: [{ type: 'axis', dimension: 'y', coordinateView: 'main', grid: true }],
};

describe('组合结构 schema', () => {
  it('组合将往返视为 json', () => {
    const parsed = PlotSchema.parse(JSON.parse(JSON.stringify(baseSpec)));

    expect(parsed).toEqual(baseSpec);
  });

  it('具有多级头部解析的方面排列', () => {
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

  it('使用生成的视图模板解析来跟踪排列', () => {
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

  it('拒绝混合面和轨道排列', () => {
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

  it('轴网格选择选择器使用新视图和排列名称进行解析', () => {
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

  it('负间距被拒绝', () => {
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
