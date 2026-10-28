import { describe, expect, it } from 'vitest';

import { normalizeScatterChart } from '../src/point';

describe('Chart 标记 Vanilla 编写', () => {
  it('按编写顺序保留普通 Chart 标记，并与 Plot 标记分开', () => {
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
            encodings: { order: 'x', position: { x: { field: 'x' }, y: { field: 'y' } } },
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
        encodings: { order: 'x', position: { x: { field: 'x' }, y: { field: 'y' } } },
      },
    ]);
  });
});
