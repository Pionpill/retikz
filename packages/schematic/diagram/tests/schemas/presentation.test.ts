import { describe, expect, it } from 'vitest';

import { DiagramPresentationSchema } from '../../src/_diagram';

const minimalLegend = {
  namespace: 'standard',
  type: 'legend',
  content: { kind: 'items', items: [] },
} as const;

describe('Diagram Presentation schema', () => {
  it('parses every fixed slot and preserves complete Core TextBlock authoring', () => {
    const presentation = DiagramPresentationSchema.parse({
      title: [
        'Architecture',
        { text: 'Runtime', fill: '#2563eb', opacity: 0.8, font: { size: 18, weight: 600 } },
        {
          runs: [
            { text: 'O(', fill: '#111827', font: { style: 'italic' } },
            { tex: 'n^2', displayMode: false, fill: '#dc2626', opacity: 0.7 },
            { text: ')' },
          ],
        },
      ],
      description: 'A complete renderer-neutral diagram',
      legend: minimalLegend,
    });

    expect(JSON.parse(JSON.stringify(presentation))).toEqual(presentation);
    expect(presentation.title).toEqual([
      'Architecture',
      { text: 'Runtime', fill: '#2563eb', opacity: 0.8, font: { size: 18, weight: 600 } },
      {
        runs: [
          { text: 'O(', fill: '#111827', font: { style: 'italic' } },
          { tex: 'n^2', displayMode: false, fill: '#dc2626', opacity: 0.7 },
          { text: ')' },
        ],
      },
    ]);
    expect(presentation.legend).toMatchObject({ namespace: 'standard', type: 'legend' });
  });

  it('accepts authored whitespace without trimming it', () => {
    expect(DiagramPresentationSchema.parse({ title: '   ' }).title).toBe('   ');
    expect(DiagramPresentationSchema.parse({ description: [{ runs: [{ tex: '  ' }] }] }).description).toEqual([
      { runs: [{ tex: '  ' }] },
    ]);
  });

  it('preserves valid empty Core TextBlock authoring', () => {
    expect(DiagramPresentationSchema.parse({ title: '' }).title).toBe('');
    expect(DiagramPresentationSchema.parse({ title: [''] }).title).toEqual(['']);
    expect(DiagramPresentationSchema.parse({ title: [{ text: '' }] }).title).toEqual([{ text: '' }]);
    expect(DiagramPresentationSchema.parse({ title: [{ runs: [{ text: '' }, { tex: '' }] }] }).title).toEqual([
      { runs: [{ text: '' }, { tex: '' }] },
    ]);
  });

  it.each([{}, { unknown: true }])('rejects an empty Presentation or records outside the fixed slots: %j', input => {
    expect(() => DiagramPresentationSchema.parse(input)).toThrow();
  });
});
