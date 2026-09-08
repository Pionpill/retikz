import type { IRDataScalarValue } from '@retikz/data';
import type { JsonObject } from '@retikz/foundation';
import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';
import { array, strictObject, string } from 'zod';

import type { AnyCellVisualScaleDefinition } from '../../src';

import { defineCellVisualScale, resolveCellVisualScaleRegistry, RetikzTableErrorCode } from '../../src';
import { resolveCellVisualScale } from '../../src/providers/encoding';

const context = { categoricalColors: ['red', 'blue'], sequentialColors: ['white', 'black'] } as const;

const runCustom = (definition: AnyCellVisualScaleDefinition, values: ReadonlyArray<string | number> = [1]) =>
  resolveCellVisualScale({
    ref: { name: definition.name },
    values,
    context,
    registry: resolveCellVisualScaleRegistry([definition]),
  });

describe('Cell visual scale runtime guard', () => {
  it('passes detached recursively frozen options and trusts the exact schema transform output', () => {
    const input = { nested: { colors: ['red'] } };
    let observed: unknown;
    const inspect = defineCellVisualScale({
      name: 'inspect-options',
      optionsSchema: strictObject({ nested: strictObject({ colors: array(string()) }) }),
      resolve: options => {
        observed = options;
        return { of: () => options.nested.colors[0], legendForm: 'swatch', domain: [1], range: ['red'] };
      },
    });
    const scale = resolveCellVisualScale({
      ref: { name: inspect.name, options: input },
      values: [1],
      context,
      registry: resolveCellVisualScaleRegistry([inspect]),
    });

    expect(scale?.of(1)).toBe('red');
    expect(observed).not.toBe(input);
    expect(Object.isFrozen(observed)).toBe(true);
    expect(Object.isFrozen((observed as typeof input).nested.colors)).toBe(true);

    let transformedOptions: unknown;
    const transformed = defineCellVisualScale<JsonObject>({
      name: 'non-json-options',
      optionsSchema: strictObject({}).transform(() => ({ run: () => 'x' })) as unknown as ZodType<JsonObject>,
      resolve: options => {
        transformedOptions = options;
        return undefined;
      },
    });
    expect(runCustom(transformed)).toBeUndefined();
    expect((transformedOptions as { run: () => string }).run()).toBe('x');
    expect(Object.isFrozen(transformedOptions)).toBe(true);
  });

  it('detaches and freezes resolution arrays without probing the evaluator', () => {
    let calls = 0;
    const domain = [1, 2];
    const range = ['red', 'blue'];
    const definition = defineCellVisualScale({
      name: 'lifecycle',
      optionsSchema: strictObject({}),
      resolve: () => ({
        of: value => {
          calls += 1;
          return value === 1 ? 'red' : 'blue';
        },
        legendForm: 'swatch',
        domain,
        range,
      }),
    });
    const scale = runCustom(definition, [1, 2]);

    expect(calls).toBe(0);
    expect(scale?.domain).not.toBe(domain);
    expect(scale?.range).not.toBe(range);
    expect(Object.isFrozen(scale)).toBe(true);
    expect(Object.isFrozen(scale?.domain)).toBe(true);
    expect(Object.isFrozen(scale?.range)).toBe(true);
    domain[0] = 9;
    range[0] = 'orange';
    expect(scale).toMatchObject({ domain: [1, 2], range: ['red', 'blue'] });
  });

  it('captures one evaluator function from a custom resolution getter', () => {
    let evaluatorReads = 0;
    const definition = defineCellVisualScale({
      name: 'captured-evaluator',
      optionsSchema: strictObject({}),
      resolve: () => ({
        get of() {
          evaluatorReads += 1;
          return evaluatorReads === 1 ? (value: IRDataScalarValue) => (value === 1 ? 'red' : 'blue') : () => 'green';
        },
        legendForm: 'swatch',
        domain: [1, 2],
        range: ['red', 'blue'],
      }),
    });
    const scale = runCustom(definition, [1, 2]);

    expect(scale?.of(1)).toBe('red');
    expect(scale?.of(2)).toBe('blue');
    expect(evaluatorReads).toBe(1);
  });

  it('lets the scalar owner schema reject invalid callback domain values with a Table error', () => {
    const domain: Array<IRDataScalarValue> = [1];
    Object.defineProperty(domain, 0, { value: () => 1 });
    const definition = defineCellVisualScale({
      name: 'invalid-domain-owner',
      optionsSchema: strictObject({}),
      resolve: () => ({ of: () => 'red', legendForm: 'swatch', domain, range: ['red'] }),
    });

    expect(() => runCustom(definition)).toThrowError(
      expect.objectContaining({
        code: RetikzTableErrorCode.Default,
        message: expect.stringMatching(/domain 0.*JSON scalar/i),
      }),
    );
  });

  it.each([
    [{ legendForm: 'invalid', domain: [1], range: ['red'] }, /legendForm/i],
    [{ legendForm: 'ramp', domain: [0], range: ['red'] }, /ramp/i],
    [{ legendForm: 'ramp', domain: [0, 1], range: ['red', 'blue'], edges: [0] }, /ramp/i],
    [{ legendForm: 'swatch', domain: ['a'], range: ['red', 'blue'] }, /swatch/i],
    [{ legendForm: 'swatch', domain: [2, 1], range: ['red', 'blue', 'green'], edges: [2, 1] }, /edges/i],
    [{ legendForm: 'swatch', domain: [1], range: [' '] }, /color/i],
    [{ legendForm: 'swatch', domain: [{ invalid: true }], range: ['red'] }, /domain/i],
  ] as const)('rejects malformed resolution %j', (partial, message) => {
    const invalid = defineCellVisualScale({
      name: `invalid-${String(partial.legendForm)}-${partial.range.length}-${partial.domain.length}`,
      optionsSchema: strictObject({}),
      resolve: () => ({ of: () => 'red', ...partial }) as never,
    });
    expect(() => runCustom(invalid)).toThrow(message);
  });

  it('guards only naturally evaluated outputs and repeated scalar determinism', () => {
    let calls = 0;
    const definition = defineCellVisualScale({
      name: 'output-guard',
      optionsSchema: strictObject({}),
      resolve: () => ({
        of: () => (++calls === 1 ? 'not-a-color' : 'blue'),
        legendForm: 'swatch',
        domain: [1],
        range: ['not-a-color'],
      }),
    });
    const scale = runCustom(definition, [1, 1]);
    expect(scale?.of(1)).toBe('not-a-color');
    expect(() => scale?.of(1)).toThrow(/deterministic/i);

    const whitespace = defineCellVisualScale({
      name: 'whitespace-output',
      optionsSchema: strictObject({}),
      resolve: () => ({ of: () => ' ', legendForm: 'swatch', domain: [1], range: ['red'] }),
    });
    expect(() => runCustom(whitespace)?.of(1)).toThrow(/color/i);
  });
});
