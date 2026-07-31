import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CellPresentationInput } from '../../src';

import { defineCellPresentation } from '../../src';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';
import { formatDefaultTable } from '../utils/stages';

const formattedModel = () =>
  formatDefaultTable(
    normalizeTableStructure({
      kind: 'manual',
      rows: [
        [
          {
            value: 12.5,
            formatter: { name: 'number', options: { specifier: '.2f' } },
            presentation: { name: 'inspect' },
            layout: { borders: { bottom: { kind: 'line', width: 2 } } },
          },
          {
            content: { type: 'node', position: [0, 0], text: 'direct' },
            layout: { borders: { left: { kind: 'none', priority: 3 } } },
          },
        ],
      ],
    }),
  );

describe('Presented Table model', () => {
  it('preserves value/content discriminators, executed names, and default border appearance', () => {
    let observed: CellPresentationInput | undefined;
    const inspect = defineCellPresentation({
      name: 'inspect',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed = input;
        return { type: 'node', position: [0, 0], text: String(input.value) };
      },
    });
    const presented = presentTable(formattedModel(), { presentationDefinitions: [inspect] });

    expect(presented.cells[0]).toMatchObject({
      kind: 'value',
      cellId: 'cell.r0.c0',
      rawValue: 12.5,
      value: '12.50',
      formatterName: 'number',
      presentationName: 'inspect',
      appearance: { borders: { bottom: { kind: 'line', width: 2 } } },
    });
    expect(presented.cells[1]).toMatchObject({
      kind: 'content',
      cellId: 'cell.r0.c1',
      appearance: { borders: { left: { kind: 'none', priority: 3 } } },
    });
    expect(presented.cells[0]).not.toHaveProperty('context');
    expect(presented.cells[1]).not.toHaveProperty('rawValue');
    expect(presented.cells[1]).not.toHaveProperty('formatterName');
    expect(observed).toMatchObject({
      rawValue: 12.5,
      value: '12.50',
      context: {
        cellId: 'cell.r0.c0',
        rowId: 'row.0',
        columnId: 'column.0',
        rowIndex: 0,
        columnIndex: 0,
        location: 'body',
        roles: ['data'],
      },
      appearance: { borders: { bottom: { kind: 'line', width: 2 } } },
    });
  });

  it('accepts detached supplied carriers and passes the same final appearance to presentation', () => {
    let observed: CellPresentationInput | undefined;
    const inspect = defineCellPresentation({
      name: 'inspect',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed = input;
        return { type: 'node', position: [0, 0], text: String(input.value) };
      },
    });
    const cells = [
      {
        kind: 'value' as const,
        cellId: 'cell.r0.c0',
        presentation: { name: 'inspect' },
        appearance: { background: { fill: '#fff4e5' }, content: { color: '#9a4d00' } },
      },
      {
        kind: 'content' as const,
        cellId: 'cell.r0.c1',
        appearance: { background: { fill: '#eff6ff' } },
      },
    ];
    const presented = presentTable(formattedModel(), { cells, presentationDefinitions: [inspect] });

    expect(observed?.appearance).toEqual(cells[0].appearance);
    expect(observed?.appearance).not.toBe(cells[0].appearance);
    expect(presented.cells[0].appearance).toEqual(cells[0].appearance);
    expect(presented.cells[1].appearance).toEqual(cells[1].appearance);
    expect(Object.isFrozen(observed?.context)).toBe(true);
    expect(Object.isFrozen(observed?.appearance)).toBe(true);
    expect(Object.isFrozen(presented.cells[0])).toBe(true);

    cells[0].appearance.background.fill = '#000000';
    expect(presented.cells[0].appearance).toMatchObject({ background: { fill: '#fff4e5' } });
    expect(Object.isFrozen(cells[0])).toBe(false);
  });

  it('fails loud for supplied carrier length, order, identity, and kind mismatches', () => {
    const base = [
      {
        kind: 'value' as const,
        cellId: 'cell.r0.c0',
        presentation: { name: 'inspect' },
        appearance: {},
      },
      { kind: 'content' as const, cellId: 'cell.r0.c1', appearance: {} },
    ];
    const inspect = defineCellPresentation({
      name: 'inspect',
      optionsSchema: z.strictObject({}),
      present: ({ value }) => ({ type: 'node', position: [0, 0], text: String(value) }),
    });

    expect(() =>
      presentTable(formattedModel(), { cells: base.slice(0, 1), presentationDefinitions: [inspect] }),
    ).toThrow(/count/i);
    expect(() =>
      presentTable(formattedModel(), { cells: [...base].reverse(), presentationDefinitions: [inspect] }),
    ).toThrow(/cell 0.*identity/i);
    expect(() =>
      presentTable(formattedModel(), {
        cells: [{ ...base[0], cellId: 'wrong' }, base[1]],
        presentationDefinitions: [inspect],
      }),
    ).toThrow(/cell 0.*identity/i);
    expect(() =>
      presentTable(formattedModel(), {
        cells: [
          { kind: 'content', cellId: 'cell.r0.c0', appearance: {} },
          { kind: 'content', cellId: 'cell.r0.c1', appearance: {} },
        ],
        presentationDefinitions: [inspect],
      }),
    ).toThrow(/cell 0.*kind/i);
  });
});
