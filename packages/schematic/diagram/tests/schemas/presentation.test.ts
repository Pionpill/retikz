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

  it.each([
    {},
    { unknown: true },
    { title: '' },
    { title: [''] },
    { title: [{ text: '' }] },
    { title: [{ runs: [{ text: '' }, { tex: '' }] }] },
  ])('rejects empty content and records outside the fixed slots: %j', input => {
    expect(() => DiagramPresentationSchema.parse(input)).toThrow();
  });

  it('rejects explicit undefined recursively instead of normalizing it to omission', () => {
    expect(() => DiagramPresentationSchema.parse({ title: undefined })).toThrow();
    expect(() => DiagramPresentationSchema.parse({ title: [{ runs: [{ text: 'A', font: undefined }] }] })).toThrow();
    expect(() =>
      DiagramPresentationSchema.parse({
        legend: { ...minimalLegend, content: { ...minimalLegend.content, items: undefined } },
      }),
    ).toThrow();
  });

  it('rejects non-plain data containers before owner schemas can project them', () => {
    class StyledLine {
      readonly text = 'class-backed';
    }

    expect(() => DiagramPresentationSchema.parse({ title: [new StyledLine()] })).toThrow();
    expect(() => DiagramPresentationSchema.parse({ title: () => 'callback' })).toThrow();
    expect(() => DiagramPresentationSchema.parse({ title: Symbol('title') })).toThrow();
  });
});
