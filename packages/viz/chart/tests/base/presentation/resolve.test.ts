import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type { IRChartPresentation } from '../../../src/_shared/presentation';

import { resolveChartPresentation } from '../../../src/_chart/presentation';
import { getDefaultChartThemePreset } from '../../../src/_chart/style/catalog';

const plot = PlotSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [{ type: 'linear', name: 'x' }],
  coordinate: { type: 'cartesian1D', x: 'x' },
  marks: [{ type: 'point', encoding: { x: { field: 'value', scale: 'x' } } }],
});
const tokens = getDefaultChartThemePreset('light');

describe('Chart presentation resolution', () => {
  it('maps canonical order directly to Flex children', () => {
    const presentation = {
      children: [
        { kind: 'preset', key: 'chart.presentation.subtitle', preset: 'subtitle', text: 'Subtitle' },
        { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Title' },
        { kind: 'plot', key: 'chart.plot' },
        { kind: 'preset', key: 'chart.presentation.source', preset: 'source', text: 'Source' },
        { kind: 'preset', key: 'chart.presentation.note', preset: 'note', text: 'Note' },
      ],
    } satisfies IRChartPresentation;
    const resolved = resolveChartPresentation(presentation, plot, tokens);

    expect(presentation.children.map(item => item.key)).toEqual([
      'chart.presentation.subtitle',
      'chart.presentation.title',
      'chart.plot',
      'chart.presentation.source',
      'chart.presentation.note',
    ]);
    expect(resolved).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: presentation.children.map(item => ({ key: item.key })),
    });
  });

  it('keeps a bare Plot when no presentation exists', () => {
    expect(resolveChartPresentation(undefined, plot, tokens)).toBe(plot);
  });
});
