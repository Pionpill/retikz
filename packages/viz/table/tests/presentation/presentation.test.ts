import type { IRChild, IRJsonObject } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineCellPresentation, resolveCellPresentationRegistry } from '../../src';
import { presentCellPayload } from '../../src/pipeline/presentation';

describe('Cell presentation registry', () => {
  it.each([
    ['Revenue', 'Revenue'],
    [42, '42'],
    [true, 'true'],
    [false, 'false'],
    [null, ''],
  ] as const)('presents scalar %j through the built-in text definition', (value, text) => {
    const registry = resolveCellPresentationRegistry();

    expect(presentCellPayload({ kind: 'value', value }, 'body:0:0', registry)).toEqual({
      type: 'node',
      position: [0, 0],
      text,
      stroke: 'none',
      fill: 'none',
      padding: 0,
    });
  });

  it('dispatches custom definitions through the same registry', () => {
    const badge = defineCellPresentation({
      name: 'badge',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      present: ({ value, cellId }, options) => ({
        type: 'node',
        position: [0, 0],
        text: `${options.prefix}${String(value)}@${cellId}`,
      }),
    });
    const registry = resolveCellPresentationRegistry([badge]);

    expect(
      presentCellPayload(
        { kind: 'value', value: 7, presentation: { name: 'badge', options: { prefix: '#' } } },
        'body:1:2',
        registry,
      ),
    ).toMatchObject({ text: '#7@body:1:2' });
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

    expect(
      presentCellPayload(
        { kind: 'value', value: 'ok', presentation: { name: 'empty' } },
        'body:0:0',
        resolveCellPresentationRegistry([empty]),
      ),
    ).toMatchObject({ text: 'ok:0' });
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
    expect(() =>
      presentCellPayload(
        { kind: 'value', value: 1, presentation: { name: 'missing' } },
        'body:2:3',
        resolveCellPresentationRegistry(),
      ),
    ).toThrow(/table: presentation "missing" for cell "body:2:3"/);
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

    expect(() =>
      presentCellPayload(
        { kind: 'value', value: 1, presentation: { name: 'non-json-options' } },
        'body:0:0',
        resolveCellPresentationRegistry([nonJsonOptions]),
      ),
    ).toThrow(/table: presentation "non-json-options" for cell "body:0:0"/);
    expect(() =>
      presentCellPayload(
        { kind: 'value', value: 1, presentation: { name: 'invalid-output' } },
        'body:0:1',
        resolveCellPresentationRegistry([invalidOutput]),
      ),
    ).toThrow(/table: presentation "invalid-output" for cell "body:0:1"/);
    expect(() =>
      presentCellPayload(
        { kind: 'value', value: 1, presentation: { name: 'non-json-output' } },
        'body:0:2',
        resolveCellPresentationRegistry([nonJsonOutput]),
      ),
    ).toThrow(/table: presentation "non-json-output" for cell "body:0:2"/);
  });

  it('returns detached recursively frozen direct and generated content', () => {
    const direct: IRChild = { type: 'scope', children: [{ type: 'node', position: [0, 0], text: 'direct' }] };
    const registry = resolveCellPresentationRegistry();
    const directContent = presentCellPayload({ kind: 'content', content: direct }, 'body:0:0', registry);
    const generatedContent = presentCellPayload({ kind: 'value', value: 'generated' }, 'body:0:1', registry);
    const nested = defineCellPresentation({
      name: 'nested',
      optionsSchema: z.strictObject({}),
      present: () => ({
        type: 'scope',
        children: [{ type: 'node', position: [0, 0], text: 'generated' }],
      }),
    });
    const nestedContent = presentCellPayload(
      { kind: 'value', value: 'generated', presentation: { name: 'nested' } },
      'body:0:2',
      resolveCellPresentationRegistry([nested]),
    );

    expect(directContent).not.toBe(direct);
    expect(Object.isFrozen(directContent)).toBe(true);
    expect(Object.isFrozen((directContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen(generatedContent)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children)).toBe(true);
    expect(Object.isFrozen((nestedContent as { children: Array<IRChild> }).children[0])).toBe(true);
  });
});
