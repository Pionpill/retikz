import { describe, expect, it } from 'vitest';

import { normalizeScatterChart } from '../src/point';

describe('Chart Vanilla normalization', () => {
  it('normalizes Scatter input to a concise family and recipe Source', () => {
    const source = normalizeScatterChart({
      id: 'sales',
      data: { reference: 'rows' },
      layout: { width: 640, height: 360 },
      title: 'Sales',
      note: 'Source note',
      encodings: { x: 'amount', y: 'margin', color: 'region' },
      properties: { opacity: 0 },
      marks: [{ kind: 'scatter', properties: { size: 4 } }],
    });

    expect(source).toEqual({
      namespace: 'chart',
      type: 'point',
      id: 'sales',
      presentation: { title: 'Sales', note: 'Source note' },
      data: { reference: 'rows' },
      layout: { width: 640, height: 360 },
      recipe: {
        chartType: 'scatter',
        encodings: { x: 'amount', y: 'margin', color: 'region' },
        properties: { opacity: 0 },
        marks: [{ kind: 'scatter', properties: { size: 4 } }],
      },
    });
  });

  it('keeps presentation in fixed slots regardless of authoring property order', () => {
    const source = normalizeScatterChart({
      data: { reference: 'rows' },
      source: 'World Bank',
      subtitle: '2023',
      title: 'Income',
      encodings: { x: 'income', y: 'life' },
    });

    expect(Object.keys(source.presentation ?? {})).toEqual(['title', 'subtitle', 'source']);
  });

  it('normalizes a Point recipe without exposing a type selector or config', () => {
    const source = normalizeScatterChart({ data: { reference: 'rows' }, encodings: { x: 'x', y: 'y' } });

    expect(source).toMatchObject({ namespace: 'chart', type: 'point', recipe: { chartType: 'scatter' } });
    expect(source).not.toHaveProperty('config');
  });
});
