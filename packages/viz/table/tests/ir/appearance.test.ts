import { describe, expect, it } from 'vitest';

import { TableCellAppearanceSchema, TableCellBackgroundSchema, TableCellContentStyleSchema } from '../../src';

describe('Table Cell appearance schema', () => {
  it('parses JSON-safe background, content defaults, and border candidates', () => {
    const input = {
      background: { fill: '#fff4e5', fillOpacity: 0.75 },
      content: {
        color: '#9a4d00',
        fill: 'currentColor',
        fillOpacity: 0.5,
        stroke: '#7c2d12',
        strokeWidth: 2,
        strokeOpacity: 0.8,
        opacity: 0.9,
        nodeDefault: { textColor: '#9a4d00', font: { weight: 600 } },
        pathDefault: { lineCap: 'round' },
        labelDefault: { textColor: '#7c2d12' },
        arrowDefault: { fill: '#7c2d12' },
        resetStyle: ['node', 'label'],
      },
      borders: { top: { kind: 'none', priority: 4 }, bottom: { kind: 'line', width: 2 } },
    };

    const parsed = TableCellAppearanceSchema.parse(JSON.parse(JSON.stringify(input)));

    expect(parsed).toEqual(input);
    expect(TableCellBackgroundSchema.parse({ fill: 'none' })).toEqual({ fill: 'none' });
  });

  it('rejects opacity-only backgrounds and non-finite opacity', () => {
    expect(() => TableCellBackgroundSchema.parse({ fillOpacity: 0.5 })).toThrow();
    expect(() => TableCellBackgroundSchema.parse({ fill: '#fff', fillOpacity: Number.NaN })).toThrow();
    expect(() => TableCellBackgroundSchema.parse({ fill: '#fff', fillOpacity: 1.1 })).toThrow();
  });

  it.each([
    { padding: 4 },
    { span: { rows: 2 } },
    { children: [] },
    { transform: { kind: 'translate', x: 1, y: 2 } },
    { content: { children: [] } },
    { content: { id: 'private-scope' } },
    { background: { fill: '#fff', stroke: '#000' } },
  ])('rejects layout, topology, renderer, and unknown fields %#', input => {
    expect(() => TableCellAppearanceSchema.parse(input)).toThrow();
  });

  it('uses the same closed content vocabulary as the public Core Scope style channels', () => {
    expect(
      TableCellContentStyleSchema.parse({
        color: 'currentColor',
        strokeWidth: 1.5,
        nodeDefault: { font: { family: 'serif', size: 12 } },
        resetStyle: true,
      }),
    ).toEqual({
      color: 'currentColor',
      strokeWidth: 1.5,
      nodeDefault: { font: { family: 'serif', size: 12 } },
      resetStyle: true,
    });
  });
});
