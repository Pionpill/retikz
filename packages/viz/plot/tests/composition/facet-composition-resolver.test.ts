import { describe, expect, it } from 'vitest';

import * as composition from '../../src/resolve/composition';

type FacetCompositionResolver = (
  configuration: Record<string, unknown>,
  context: Record<string, unknown>,
) => Record<string, unknown>;

const plotFacetCompositionResolver = (): FacetCompositionResolver => {
  const resolver = (composition as Record<string, unknown>).resolvePlotFacetComposition;

  expect(resolver, 'Plot composition must export resolvePlotFacetComposition').toBeTypeOf('function');
  return resolver as FacetCompositionResolver;
};

describe('resolvePlotFacetComposition', () => {
  it('围绕配方坐标构建完整的合成', () => {
    const coordinate = { type: 'cartesian2D', x: 'billLength', y: 'flipperLength' };

    expect(
      plotFacetCompositionResolver()(
        { id: 'species', column: { field: 'species' }, spacing: { panelGap: 12 } },
        { coordinate },
      ),
    ).toEqual({
      defaultView: 'speciesPanel',
      views: [{ id: 'speciesPanel', coordinate }],
      arrangements: [
        {
          kind: 'facet',
          id: 'species',
          view: 'speciesPanel',
          column: { field: 'species' },
          spacing: { panelGap: 12 },
        },
      ],
    });
  });

  it('在解析器上下文中保留仅 Plot 的模板和面板控件', () => {
    const coordinate = { type: 'cartesian2D', x: 'xScale', y: 'yScale' };
    const panelCoordinate = { type: 'polar2D', angle: 'xScale', radius: 'yScale' };

    expect(
      plotFacetCompositionResolver()(
        { id: 'region', row: { field: 'region' }, empty: 'show' },
        {
          coordinate,
          templateViewId: 'regionTemplate',
          facetCoordinate: panelCoordinate,
          panelViewIdTemplate: '{arrangement}.panel.{row}.{column}',
        },
      ),
    ).toEqual({
      defaultView: 'regionTemplate',
      views: [{ id: 'regionTemplate', coordinate }],
      arrangements: [
        {
          kind: 'facet',
          id: 'region',
          view: 'regionTemplate',
          row: { field: 'region' },
          empty: 'show',
          coordinate: panelCoordinate,
          viewIdTemplate: '{arrangement}.panel.{row}.{column}',
        },
      ],
    });
  });
});
