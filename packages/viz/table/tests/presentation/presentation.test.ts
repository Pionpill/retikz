import type { IRChild, IRJsonObject } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { AnyCellPresentationDefinition, IRManualTableCell } from '../../src';

import { defineCellPresentation, resolveCellPresentationRegistry } from '../../src';
import { formatTable } from '../../src/pipeline/formatter';
import { normalizeTableStructure } from '../../src/pipeline/normalize';
import { presentTable } from '../../src/pipeline/presentation';

const presentedCellOf = (
  cell: IRManualTableCell,
  presentationDefinitions?: ReadonlyArray<AnyCellPresentationDefinition>,
) => {
  const formatted = formatTable(normalizeTableStructure({ kind: 'manual', rows: [[cell]] }));
  return presentTable(formatted, { presentationDefinitions }).cells[0];
};

describe('Cell presentation registry', () => {
  it.each([
    ['Revenue', 'Revenue'],
    [42, '42'],
    [true, 'true'],
    [false, 'false'],
    [null, ''],
  ] as const)('presents scalar %j through the built-in text definition', (value, text) => {
    expect(presentedCellOf({ value }).content).toEqual({
      type: 'node',
      position: [0, 0],
      text,
      stroke: 'none',
      fill: 'none',
      padding: 0,
    });
  });

  it('dispatches custom definitions with raw, formatted, context, and appearance input', () => {
    const badge = defineCellPresentation({
      name: 'badge',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      present: ({ rawValue, value, context, appearance }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${options.prefix}${String(rawValue)}>${String(value)}@${context.cellId}:${String(
          appearance.background?.fill,
        )}`,
      }),
    });
    const formatted = formatTable(
      normalizeTableStructure({
        kind: 'manual',
        rows: [[{ value: 7, presentation: { name: 'badge', options: { prefix: '#' } } }]],
      }),
    );
    const presented = presentTable(formatted, {
      cells: [
        {
          kind: 'value',
          cellId: 'cell.r0.c0',
          presentation: { name: 'badge', options: { prefix: '#' } },
          appearance: { background: { fill: '#fff4e5' } },
        },
      ],
      presentationDefinitions: [badge],
    });

    expect(presented.cells[0].content).toMatchObject({ text: '#7>7@cell.r0.c0:#fff4e5' });
  });

  it('validates omitted options as an empty object', () => {
    const empty = defineCellPresentation({
      name: 'empty',
      optionsSchema: z.strictObject({}),
      present: ({ value }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${String(value)}:${Object.keys(options).length}`,
      }),
    });

    expect(presentedCellOf({ value: 'ok', presentation: { name: 'empty' } }, [empty]).content).toMatchObject({
      text: 'ok:0',
    });
  });

  it('rejects duplicate, built-in-conflicting, empty, and missing definitions', () => {
    const definition = defineCellPresentation({
      name: 'badge',
      optionsSchema: z.strictObject({}),
      present: () => ({ type: 'node', position: [0, 0] }),
    });
    const duplicate = defineCellPresentation({ ...definition });
    const builtinConflict = defineCellPresentation({ ...definition, name: 'text' });
    const emptyName = defineCellPresentation({ ...definition, name: '' });

    expect(() => resolveCellPresentationRegistry([definition, duplicate])).toThrow(/duplicate.*badge/i);
    expect(() => resolveCellPresentationRegistry([builtinConflict])).toThrow(/duplicate.*text/i);
    expect(() => resolveCellPresentationRegistry([emptyName])).toThrow(/non-empty/i);
    expect(() => presentedCellOf({ value: 1, presentation: { name: 'missing' } })).toThrow(
      /table: presentation "missing" for cell "cell\.r0\.c0"/,
    );
  });

  it('guards custom options and provider output at runtime', () => {
    const nonJsonOptions = defineCellPresentation<IRJsonObject>({
      name: 'non-json-options',
      optionsSchema: z.strictObject({}).transform(() => ({ format: () => 'x' })) as unknown as z.ZodType<IRJsonObject>,
      present: () => ({ type: 'node', position: [0, 0] }),
    });
    const invalidOutput = defineCellPresentation({
      name: 'invalid-output',
      optionsSchema: z.strictObject({}),
      present: () => ({ type: 'unknown' }) as unknown as IRChild,
    });
    const nonJsonOutput = defineCellPresentation({
      name: 'non-json-output',
      optionsSchema: z.strictObject({}),
      present: () => ({ namespace: 'custom', type: 'child', render: () => 'x' }),
    });

    expect(() => presentedCellOf({ value: 1, presentation: { name: 'non-json-options' } }, [nonJsonOptions])).toThrow(
      /table: presentation "non-json-options" for cell "cell\.r0\.c0"/,
    );
    expect(() => presentedCellOf({ value: 1, presentation: { name: 'invalid-output' } }, [invalidOutput])).toThrow(
      /table: presentation "invalid-output" for cell "cell\.r0\.c0"/,
    );
    expect(() => presentedCellOf({ value: 1, presentation: { name: 'non-json-output' } }, [nonJsonOutput])).toThrow(
      /table: presentation "non-json-output" for cell "cell\.r0\.c0"/,
    );
  });

  it('returns detached recursively frozen direct and generated content', () => {
    const direct: IRChild = { type: 'scope', children: [{ type: 'node', position: [0, 0], text: 'direct' }] };
    const nestedOutput = {
      type: 'scope' as const,
      children: [{ type: 'node' as const, position: [0, 0] as [number, number], text: 'generated' }],
    };
    const nested = defineCellPresentation({
      name: 'nested',
      optionsSchema: z.strictObject({}),
      present: () => nestedOutput,
    });
    const directContent = presentedCellOf({ content: direct }).content;
    const generatedContent = presentedCellOf({ value: 'generated' }).content;
    const nestedContent = presentedCellOf({ value: 'generated', presentation: { name: 'nested' } }, [nested]).content;

    expect(directContent).not.toBe(direct);
    expect(nestedContent).not.toBe(nestedOutput);
    expect(Object.isFrozen(directContent)).toBe(true);
    expect(Object.isFrozen((directContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen(generatedContent)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children[0])).toBe(true);
    expect(Object.isFrozen(direct)).toBe(false);
    expect(Object.isFrozen(nestedOutput)).toBe(false);
  });
});
