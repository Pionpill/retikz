import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { normalizeChartPresentation, resolveChartPresentation } from '../../../src/base/presentation';
import { getDefaultChartThemePreset } from '../../../src/base/style/catalog';

const plot = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [{ type: 'linear', name: 'x' }],
  coordinate: { type: 'cartesian1D', x: 'x' },
  marks: [{ type: 'point', encoding: { x: { field: 'value', scale: 'x' } } }],
});
const tokens = getDefaultChartThemePreset('light');

describe('Chart presentation authoring and resolution', () => {
  it('keeps explicit marker order and lets markers fully override shorthand', () => {
    const presentation = normalizeChartPresentation({
      title: 'Shorthand title',
      subtitle: 'Shorthand subtitle',
      note: 'Shorthand note',
      source: 'Shorthand source',
      presentation: [
        { preset: 'subtitle', position: 'top', text: 'Explicit subtitle' },
        { preset: 'title', position: 'top', text: 'Explicit title' },
        { preset: 'source', position: 'bottom', text: 'Explicit source' },
        { preset: 'note', position: 'bottom', text: 'Explicit note' },
      ],
    });

    expect(presentation?.children.map(item => (item.kind === 'plot' ? 'plot' : item.preset))).toEqual([
      'subtitle',
      'title',
      'plot',
      'source',
      'note',
    ]);
  });

  it('uses shorthand defaults and maps canonical order directly to Flex children', () => {
    const presentation = normalizeChartPresentation({
      title: 'Title',
      subtitle: 'Subtitle',
      note: 'Note',
      source: 'Source',
    });
    const resolved = resolveChartPresentation(presentation, plot, tokens);

    expect(presentation?.children.map(item => item.key)).toEqual([
      'chart.presentation.title',
      'chart.presentation.subtitle',
      'chart.plot',
      'chart.presentation.note',
      'chart.presentation.source',
    ]);
    expect(resolved.content).toMatchObject({
      namespace: 'layout',
      type: 'flexLayout',
      children: presentation?.children.map(item => ({ key: item.key })),
    });
  });

  it('keeps a bare Plot when no presentation was authored and rejects duplicate explicit presets', () => {
    expect(resolveChartPresentation(undefined, plot, tokens).content).toBe(plot);
    expect(() =>
      normalizeChartPresentation({
        presentation: [
          { preset: 'title', text: 'A' },
          { preset: 'title', text: 'B' },
        ],
      }),
    ).toThrow(/at most once/i);
  });
});
