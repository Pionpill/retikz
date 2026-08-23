import { describe, expect, it } from 'vitest';

import { normalizeScatterChart } from '../src/point';

describe('Chart mark Vanilla authoring', () => {
  it('keeps plain Chart marks in authored order and separate from Plot marks', () => {
    const source = normalizeScatterChart({
      data: { reference: 'rows' },
      encodings: { x: 'x', y: 'y' },
      marks: [
        { kind: 'scatter', override: true, properties: { opacity: 0.25 } },
        { kind: 'scatter', properties: { opacity: 0.5 } },
      ],
      plotExtension: {
        marks: [
          {
            type: 'path',
            order: 'x',
            encoding: { x: { field: 'x' }, y: { field: 'y' } },
          },
        ],
      },
    });

    expect(source.recipe.marks).toEqual([
      { kind: 'scatter', override: true, properties: { opacity: 0.25 } },
      { kind: 'scatter', properties: { opacity: 0.5 } },
    ]);
    expect(source.plotExtension?.marks).toEqual([
      {
        type: 'path',
        order: 'x',
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ]);
  });
});
