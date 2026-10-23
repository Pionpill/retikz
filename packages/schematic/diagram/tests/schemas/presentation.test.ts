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
      title: {
        text: [
          'Architecture',
          { text: 'Runtime', fill: '#2563eb', opacity: 0.8, font: { size: 18, weight: 600 } },
          {
            segments: [
              { text: 'O(', fill: '#111827', font: { style: 'italic' } },
              { tex: 'n^2', displayMode: false, fill: '#dc2626', opacity: 0.7 },
              { text: ')' },
            ],
          },
        ],
      },
      description: { text: 'A complete renderer-neutral diagram' },
      legend: minimalLegend,
    });

    expect(JSON.parse(JSON.stringify(presentation))).toEqual(presentation);
    expect(presentation.title?.text).toEqual([
      'Architecture',
      { text: 'Runtime', fill: '#2563eb', opacity: 0.8, font: { size: 18, weight: 600 } },
      {
        segments: [
          { text: 'O(', fill: '#111827', font: { style: 'italic' } },
          { tex: 'n^2', displayMode: false, fill: '#dc2626', opacity: 0.7 },
          { text: ')' },
        ],
      },
    ]);
    expect(presentation.legend).toMatchObject({ namespace: 'standard', type: 'legend' });
  });

  it('accepts authored whitespace without trimming it', () => {
    expect(DiagramPresentationSchema.parse({ title: { text: '   ' } }).title?.text).toBe('   ');
    expect(
      DiagramPresentationSchema.parse({ description: { text: [{ segments: [{ tex: '  ' }] }] } }).description?.text,
    ).toEqual([{ segments: [{ tex: '  ' }] }]);
  });

  it('preserves valid empty Core TextBlock authoring', () => {
    expect(DiagramPresentationSchema.parse({ title: { text: '' } }).title?.text).toBe('');
    expect(DiagramPresentationSchema.parse({ title: { text: [''] } }).title?.text).toEqual(['']);
    expect(DiagramPresentationSchema.parse({ title: { text: [{ text: '' }] } }).title?.text).toEqual([{ text: '' }]);
    expect(
      DiagramPresentationSchema.parse({ title: { text: [{ segments: [{ text: '' }, { tex: '' }] }] } }).title?.text,
    ).toEqual([{ segments: [{ text: '' }, { tex: '' }] }]);
  });

  it.each([{}, { unknown: true }])('rejects an empty Presentation or records outside the fixed slots: %j', input => {
    expect(() => DiagramPresentationSchema.parse(input)).toThrow();
  });
});
