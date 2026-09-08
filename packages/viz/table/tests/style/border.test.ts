import { describe, expect, it } from 'vitest';

import { compileTable } from '../../src';

const sourceBorders = {
  layout: {
    borders: {
      outer: {
        top: { kind: 'line', stroke: '#111111', width: 1.2 },
        bottom: { kind: 'line', stroke: '#111111', width: 1.2 },
      },
      horizontal: { kind: 'none' },
    },
  },
} as const;

describe('Source defaults Border Graph integration', () => {
  it('maps per-side outer defaults and injects priority -100 with provenance', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'academic',
        tableDefaults: sourceBorders,
        structure: { kind: 'manual', rows: [['x']] },
      },
      {},
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );

    expect(result.manifest.borders).toHaveLength(2);
    for (const border of result.manifest.borders) {
      const winner = border.atoms[0].winner;
      expect(winner).toMatchObject({
        kind: 'line',
        origin: 'defaults',
        priority: -100,
        source: { kind: 'default', scope: 'outer' },
        defaults: { path: '$spec/tableDefaults' },
      });
      expect(winner).not.toHaveProperty('styleToken');
    }
  });

  it('lets explicit Table layout border candidates replace Source defaults before graph construction', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'explicit',
        tableDefaults: sourceBorders,
        structure: { kind: 'manual', rows: [['x'], ['y']] },
        layout: {
          borders: {
            outer: { top: { kind: 'none' }, bottom: { kind: 'none' } },
            horizontal: { kind: 'line', stroke: 'red', width: 2 },
          },
        },
      },
      {},
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );

    expect(result.manifest.borders).toHaveLength(1);
    expect(result.manifest.borders[0].atoms[0].winner).toMatchObject({
      kind: 'line',
      line: { stroke: 'red', width: 2 },
      origin: 'explicit',
      priority: 0,
      source: { kind: 'default', scope: 'horizontal' },
    });
    expect(result.manifest.borders[0].atoms[0].winner).not.toHaveProperty('defaults');
  });

  it('lets a header Cell-side default win over the same-priority horizontal default', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'vibrant',
        tableDefaults: {
          ...sourceBorders,
          layout: { borders: { horizontal: { kind: 'line', stroke: '#ffffff', width: 1 } } },
          appearanceDefaults: {
            columnHeader: {
              borders: { bottom: { kind: 'line', stroke: '#ffffff', width: 1 } },
            },
          },
        },
        data: { reference: 'rows' },
        structure: { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      },
      { rows: [{ value: 1 }] },
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );
    const headerBoundary = result.manifest.borders.find(border =>
      border.atoms.some(atom => atom.winner.source.kind === 'cell' && atom.winner.source.side === 'bottom'),
    );

    expect(headerBoundary?.atoms[0].winner).toMatchObject({
      source: { kind: 'cell', side: 'bottom' },
      priority: -100,
      specificity: 1,
      origin: 'defaults',
      defaults: { path: '$spec/tableDefaults' },
    });
  });

  it('keeps a spanning column header default on the span perimeter', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'spanning-header',
        tableDefaults: {
          appearanceDefaults: {
            columnHeader: { borders: { bottom: { kind: 'line', stroke: '#ffffff', width: 1 } } },
          },
        },
        structure: {
          kind: 'manual',
          rows: [[{ id: 'heading', value: 'Heading', span: { columns: 2 } }, null]],
          rowKinds: ['columnHeader'],
        },
      },
      {},
      { compile: { padding: 0 } },
    );

    expect(result.manifest.borders).toHaveLength(1);
    expect(result.manifest.borders[0].orientation).toBe('horizontal');
    expect(result.manifest.borders[0].atoms).toHaveLength(2);
    expect(result.manifest.borders[0].atoms.map(atom => atom.winner)).toEqual([
      expect.objectContaining({
        source: expect.objectContaining({ kind: 'cell', cellId: 'heading', side: 'bottom' }),
        defaults: { path: '$spec/tableDefaults' },
      }),
      expect.objectContaining({
        source: expect.objectContaining({ kind: 'cell', cellId: 'heading', side: 'bottom' }),
        defaults: { path: '$spec/tableDefaults' },
      }),
    ]);
  });

  it('lets a root rule replace explicit Cell and Source default border slots without duplicate keys', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'border-precedence',
        tableDefaults: { layout: { borders: { horizontal: { kind: 'line', stroke: '#ffffff', width: 1 } } } },
        structure: {
          kind: 'manual',
          rows: [
            [
              {
                id: 'target',
                value: 1,
                layout: { borders: { bottom: { kind: 'line', stroke: 'green', width: 2 } } },
              },
            ],
            [2],
          ],
        },
        rules: [
          {
            selector: { cellIds: ['target'] },
            appearance: { borders: { bottom: { kind: 'line', stroke: 'red', width: 3 } } },
          },
        ],
      },
      {},
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );
    const boundary = result.manifest.borders.find(border =>
      border.atoms.some(atom => atom.winner.source.kind === 'cell' && atom.winner.source.cellId === 'target'),
    );
    const atom = boundary?.atoms[0];

    expect(atom?.winner).toMatchObject({
      kind: 'line',
      line: { stroke: 'red', width: 3 },
      priority: 0,
      origin: 'explicit',
      source: { kind: 'cell', cellId: 'target', side: 'bottom' },
    });
    expect(atom?.winner).not.toHaveProperty('styleToken');
    expect(atom?.contributors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priority: -100,
          origin: 'defaults',
          defaults: { path: '$spec/tableDefaults' },
        }),
        expect.objectContaining({ priority: 0, source: expect.objectContaining({ cellId: 'target' }) }),
      ]),
    );
    expect(new Set(atom?.contributors.map(contribution => contribution.key)).size).toBe(atom?.contributors.length);
  });
});
