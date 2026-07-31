import type { IRJsonObject } from '@retikz/core';

import { formatDefaultLocale } from 'd3-format';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { SemanticTableModel } from '../../src';

import {
  cellFormatterDefinitionOf,
  defineCellFormatter,
  defineCellPresentation,
  resolveCellFormatterRegistry,
  TableCellLocation,
  TableCellPayloadKind,
  TableCellRole,
  TableCellSourceKind,
  TableRowKind,
} from '../../src';
import { formatTable } from '../../src/pipeline/formatter';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';

const layout = {
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  horizontalAlign: 'center',
  verticalAlign: 'center',
  wrap: false,
  fit: 'none',
  overflow: 'visible',
} as const;

const modelOf = (value: string | number | boolean | null, formatter?: { name: string; options?: IRJsonObject }) =>
  ({
    rows: [{ id: 'row.0', index: 0, kind: TableRowKind.Body }],
    columns: [{ id: 'amount', index: 0, field: 'amount' }],
    cells: [
      {
        id: 'cell.0',
        rowId: 'row.0',
        columnId: 'amount',
        rowIndex: 0,
        columnIndex: 0,
        location: TableCellLocation.Body,
        roles: [TableCellRole.Data],
        payload: {
          kind: TableCellPayloadKind.Value,
          value,
          ...(formatter === undefined ? {} : { formatter }),
        },
        span: { rows: 1, columns: 1 },
        layout,
        source: {
          kind: TableCellSourceKind.Field,
          reference: 'sales',
          sourceIndex: 0,
          field: 'amount',
        },
      },
    ],
  }) satisfies SemanticTableModel;

describe('Cell formatter registry', () => {
  it('dispatches built-in and custom definitions through the same registry', () => {
    const prefix = defineCellFormatter({
      name: 'prefix',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      format: ({ value, context }, options) => `${options.prefix}${String(value)}@${context.cellId}`,
    });
    const registry = resolveCellFormatterRegistry([prefix]);

    expect(cellFormatterDefinitionOf('identity', registry).name).toBe('identity');
    expect(cellFormatterDefinitionOf('prefix', registry)).toBe(prefix);
    expect(() => cellFormatterDefinitionOf('missing', registry)).toThrow(/not registered/i);
  });

  it('fails loud for empty, duplicate, and built-in-conflicting names', () => {
    const formatterOf = (name: string) =>
      defineCellFormatter({
        name,
        optionsSchema: z.strictObject({}),
        format: ({ value }) => value,
      });
    const formatter = formatterOf('custom');

    expect(() => resolveCellFormatterRegistry([formatter, formatterOf('custom')])).toThrow(/duplicate.*custom/i);
    expect(() => resolveCellFormatterRegistry([formatterOf('identity')])).toThrow(/duplicate.*identity/i);
    expect(() => resolveCellFormatterRegistry([formatterOf('  ')])).toThrow(/non-empty/i);
  });
});

describe('formatted Table model', () => {
  it('detaches and recursively freezes the semantic model snapshot', () => {
    const model = modelOf('before');
    const formatted = formatTable(model);

    expect(formatted.semantic).not.toBe(model);
    expect(formatted.semantic.cells[0]).not.toBe(model.cells[0]);
    expect(Object.isFrozen(formatted.semantic)).toBe(true);
    expect(Object.isFrozen(formatted.semantic.cells)).toBe(true);
    expect(Object.isFrozen(formatted.semantic.cells[0].payload)).toBe(true);

    model.cells[0].payload.value = 'after';
    expect(formatted.semantic.cells[0].payload).toMatchObject({ kind: 'value', value: 'before' });
  });

  it.each(['plain', 42, true, false, null] as const)('uses identity without changing scalar %j', value => {
    const formatted = formatTable(modelOf(value));

    expect(formatted.cells[0]).toEqual({
      kind: 'value',
      cellId: 'cell.0',
      rawValue: value,
      value,
      formatterName: 'identity',
    });
  });

  it('formats numbers with a private deterministic locale', () => {
    const before = formatTable(modelOf(-1234.5, { name: 'number', options: { specifier: '$,.2f' } }));
    try {
      formatDefaultLocale({
        decimal: ',',
        thousands: '.',
        grouping: [3],
        currency: ['€', ''],
        minus: '-',
        nan: 'not-a-number',
      });
      const after = formatTable(modelOf(-1234.5, { name: 'number', options: { specifier: '$,.2f' } }));

      expect(before.cells[0]).toMatchObject({ value: '−$1,234.50', formatterName: 'number' });
      expect(after.cells[0]).toEqual(before.cells[0]);
    } finally {
      formatDefaultLocale({
        decimal: '.',
        thousands: ',',
        grouping: [3],
        currency: ['$', ''],
        percent: '%',
        minus: '−',
        nan: 'NaN',
      });
    }
  });

  it('handles number and boolean null labels without truthy or numeric coercion', () => {
    expect(formatTable(modelOf(null, { name: 'number' })).cells[0]).toMatchObject({ value: null });
    expect(formatTable(modelOf(null, { name: 'number', options: { nullText: '' } })).cells[0]).toMatchObject({
      value: '',
    });
    expect(
      formatTable(modelOf(false, { name: 'boolean', options: { falseText: 'Unavailable' } })).cells[0],
    ).toMatchObject({ value: 'Unavailable' });
    expect(() => formatTable(modelOf('12.5', { name: 'number' }))).toThrow(
      /table: formatter "number" for cell "cell\.0"/i,
    );
    expect(() => formatTable(modelOf(1, { name: 'boolean' }))).toThrow(
      /table: formatter "boolean" for cell "cell\.0"/i,
    );
  });

  it('passes immutable canonical context to a custom formatter and guards options/output', () => {
    let observed: unknown;
    const inspect = defineCellFormatter({
      name: 'inspect',
      optionsSchema: z.strictObject({ suffix: z.string().default('!') }),
      format: (input, options) => {
        observed = input.context;
        return `${String(input.value)}${options.suffix}`;
      },
    });
    const formatted = formatTable(modelOf('ok', { name: 'inspect' }), [inspect]);

    expect(formatted.cells[0]).toMatchObject({ rawValue: 'ok', value: 'ok!', formatterName: 'inspect' });
    expect(observed).toEqual({
      cellId: 'cell.0',
      rowId: 'row.0',
      columnId: 'amount',
      rowIndex: 0,
      columnIndex: 0,
      location: 'body',
      roles: ['data'],
      source: { kind: 'field', reference: 'sales', sourceIndex: 0, field: 'amount' },
    });
    expect(Object.isFrozen(observed)).toBe(true);
    expect(Object.isFrozen((observed as { roles: Array<string> }).roles)).toBe(true);

    const nonJsonOptions = defineCellFormatter<IRJsonObject>({
      name: 'non-json-options',
      optionsSchema: z.strictObject({}).transform(() => ({ run: () => 'x' })) as unknown as z.ZodType<IRJsonObject>,
      format: ({ value }) => value,
    });
    const invalidOutput = defineCellFormatter({
      name: 'invalid-output',
      optionsSchema: z.strictObject({}),
      format: () => ({ invalid: true }) as unknown as string,
    });

    expect(() => formatTable(modelOf(1, { name: 'non-json-options' }), [nonJsonOptions])).toThrow(
      /formatter "non-json-options".*cell "cell\.0"/i,
    );
    expect(() => formatTable(modelOf(1, { name: 'invalid-output' }), [invalidOutput])).toThrow(
      /formatter "invalid-output".*cell "cell\.0"/i,
    );

    const providerCause = new Error('provider failed');
    const thrown = defineCellFormatter({
      name: 'thrown',
      optionsSchema: z.strictObject({}),
      format: () => {
        throw providerCause;
      },
    });
    try {
      formatTable(modelOf(1, { name: 'thrown' }), [thrown]);
      throw new Error('expected formatter failure');
    } catch (error) {
      expect(error).toMatchObject({
        message: expect.stringMatching(/formatter "thrown".*cell "cell\.0"/i),
        cause: providerCause,
      });
    }
  });

  it('propagates detail body formatters independently from header payloads', () => {
    const semantic = normalizeTableStructure(
      {
        kind: 'detail',
        columns: [
          {
            id: 'amount',
            field: 'amount',
            formatter: { name: 'number', options: { specifier: ',.2f' } },
            header: { kind: 'value', value: 'Amount' },
          },
        ],
      },
      { data: { reference: 'sales' }, datasets: { sales: [{ amount: 1234.5 }] } },
    );
    const formatted = formatTable(semantic);

    expect(formatted.cells).toMatchObject([
      { kind: 'value', value: 'Amount', formatterName: 'identity' },
      { kind: 'value', rawValue: 1234.5, value: '1,234.50', formatterName: 'number' },
    ]);
  });

  it('passes the raw and formatted scalars into the presentation ABI', () => {
    const inspect = defineCellPresentation({
      name: 'inspect',
      optionsSchema: z.strictObject({}),
      present: ({ rawValue, value, context }) => ({
        type: 'node',
        position: [0, 0],
        text: `${String(rawValue)}>${String(value)}@${context.cellId}`,
      }),
    });
    const base = modelOf(12.5, { name: 'number', options: { specifier: '.2f' } });
    const semantic: SemanticTableModel = {
      ...base,
      cells: [
        {
          ...base.cells[0],
          payload: { ...base.cells[0].payload, presentation: { name: 'inspect' } },
        },
      ],
    };
    const presented = presentTable(formatTable(semantic), { presentationDefinitions: [inspect] });

    expect(presented.cells[0].content).toMatchObject({ text: '12.5>12.50@cell.0' });
  });

  it('preserves content Cells without formatter dispatch and freezes detached output', () => {
    const sourceContent = { type: 'node' as const, position: [0, 0] as [number, number], text: 'direct' };
    const model: SemanticTableModel = {
      ...modelOf('unused'),
      cells: [
        {
          ...modelOf('unused').cells[0],
          payload: { kind: TableCellPayloadKind.Content, content: sourceContent },
        },
      ],
    };
    const formatted = formatTable(model);

    expect(formatted.cells[0]).toEqual({ kind: 'content', cellId: 'cell.0', content: sourceContent });
    if (formatted.cells[0].kind !== TableCellPayloadKind.Content) throw new Error('expected content Cell');
    expect(formatted.cells[0].content).not.toBe(sourceContent);
    expect(Object.isFrozen(formatted)).toBe(true);
    expect(Object.isFrozen(formatted.cells)).toBe(true);
    expect(Object.isFrozen(formatted.cells[0])).toBe(true);
    expect(Object.isFrozen(sourceContent)).toBe(false);
  });
});
