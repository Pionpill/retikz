import { describe, expect, it } from 'vitest';

import { compileTable } from '../../src';

describe('style token Border Graph integration', () => {
  it('maps per-side academic outer tokens and injects priority -100 with provenance', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'academic',
        tableThemeTokens: {
          'table.border.top': { kind: 'line', stroke: '#111111', width: 1.2 },
          'table.border.bottom': { kind: 'line', stroke: '#111111', width: 1.2 },
          'table.border.horizontal': null,
        },
        structure: { kind: 'manual', rows: [['x']] },
      },
      {},
      { theme: { style: 'neutral', mode: 'light' }, compile: { padding: 0 } },
    );

    expect(result.manifest.borders).toHaveLength(2);
    for (const border of result.manifest.borders) {
      const winner = border.atoms[0].winner;
      expect(winner).toMatchObject({
        kind: 'line',
        priority: -100,
        source: { kind: 'default', scope: 'outer' },
        styleToken: { source: 'local' },
      });
      if (winner.kind !== 'line' || winner.origin !== 'styleToken') {
        throw new Error('expected style token line winner');
      }
      expect(['table.border.top', 'table.border.bottom']).toContain(winner.styleToken.key);
    }
  });

  it('lets explicit Table defaults replace token slots before graph construction', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'explicit',
        tableThemeTokens: {
          'table.border.top': { kind: 'line', stroke: '#111111', width: 1.2 },
          'table.border.bottom': { kind: 'line', stroke: '#111111', width: 1.2 },
          'table.border.horizontal': null,
        },
        structure: { kind: 'manual', rows: [['x'], ['y']] },
        layout: { borders: { outer: { kind: 'none' }, horizontal: { kind: 'line', stroke: 'red', width: 2 } } },
      },
      {},
      { theme: { style: 'neutral', mode: 'light' }, compile: { padding: 0 } },
    );

    expect(result.manifest.borders).toHaveLength(1);
    expect(result.manifest.borders[0].atoms[0].winner).toMatchObject({
      kind: 'line',
      priority: 0,
      source: { kind: 'default', scope: 'horizontal' },
    });
    expect(result.manifest.borders[0].atoms[0].winner).not.toHaveProperty('styleToken');
  });

  it('lets a header Cell-side token win over the same-priority horizontal token', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'vibrant',
        tableThemeTokens: {
          'table.border.horizontal': { kind: 'line', stroke: '#ffffff', width: 1 },
          'columnHeader.border.bottom': { kind: 'line', stroke: '#ffffff', width: 1 },
        },
        data: { reference: 'rows' },
        structure: { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      },
      { rows: [{ value: 1 }] },
      { theme: { style: 'neutral', mode: 'light' }, compile: { padding: 0 } },
    );
    const headerBoundary = result.manifest.borders.find(border =>
      border.atoms.some(
        atom =>
          atom.winner.kind === 'line' &&
          atom.winner.origin === 'styleToken' &&
          atom.winner.styleToken.key === 'columnHeader.border.bottom',
      ),
    );

    expect(headerBoundary?.atoms[0].winner).toMatchObject({
      source: { kind: 'cell', side: 'bottom' },
      priority: -100,
      specificity: 1,
      styleToken: expect.objectContaining({ key: 'columnHeader.border.bottom', source: 'local' }),
    });
  });

  it('keeps a spanning column header token on the span perimeter', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'spanning-header',
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
        styleToken: expect.objectContaining({ key: 'columnHeader.border.bottom', source: 'local' }),
      }),
      expect.objectContaining({
        source: expect.objectContaining({ kind: 'cell', cellId: 'heading', side: 'bottom' }),
        styleToken: expect.objectContaining({ key: 'columnHeader.border.bottom', source: 'local' }),
      }),
    ]);
  });

  it('lets a root rule replace explicit Cell and style token border slots without duplicate keys', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'border-precedence',
        tableThemeTokens: { 'table.border.horizontal': { kind: 'line', stroke: '#ffffff', width: 1 } },
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
      { theme: { style: 'neutral', mode: 'light' }, compile: { padding: 0 } },
    );
    const boundary = result.manifest.borders.find(border =>
      border.atoms.some(atom => atom.winner.source.kind === 'cell' && atom.winner.source.cellId === 'target'),
    );
    const atom = boundary?.atoms[0];

    expect(atom?.winner).toMatchObject({
      kind: 'line',
      line: { stroke: 'red', width: 3 },
      priority: 0,
      source: { kind: 'cell', cellId: 'target', side: 'bottom' },
    });
    expect(atom?.winner).not.toHaveProperty('styleToken');
    expect(atom?.contributors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priority: -100,
          styleToken: expect.objectContaining({ key: 'table.border.horizontal', source: 'local' }),
        }),
        expect.objectContaining({ priority: 0, source: expect.objectContaining({ cellId: 'target' }) }),
      ]),
    );
    expect(new Set(atom?.contributors.map(contribution => contribution.key)).size).toBe(atom?.contributors.length);
  });
});
