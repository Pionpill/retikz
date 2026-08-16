import type { AnyPathKindDefinition } from '@retikz/core';

import { defineClipShape, PathBaseSchema, StrokePathOwnerOutputSchema } from '@retikz/core';
import { RetainedRenderErrorCode } from '@retikz/render/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  captureCoreProviderDefinitions,
  createRetainedProviderDefinitions,
} from '../../src/runtime/retained-providers';

const pathKindSchema = PathBaseSchema.extend({ kind: z.literal('retained-fixture') });
const ownerOutput = { schema: StrokePathOwnerOutputSchema };
const initialResult = { primitives: [], boundsPoints: [] };
const nextResult = { primitives: [], boundsPoints: [[1, 1] as [number, number]] };

const createDefinition = (
  schema: AnyPathKindDefinition['schema'] = pathKindSchema,
  compile: AnyPathKindDefinition['compile'] = () => null,
  name = 'retained-fixture',
): AnyPathKindDefinition => ({ name, schema, compile, ownerOutput });

describe('retained Path Kind definitions', () => {
  it('captures and delegates ClipShape lower definitions as a first-class collection', () => {
    const lower = () => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    });
    const definition = defineClipShape({
      kind: 'retainedClipShape',
      schema: z.strictObject({ kind: z.literal('retainedClipShape') }),
      lower,
    });
    const captured = captureCoreProviderDefinitions({ clipShapes: [definition] });
    expect(captured.clipShapes?.[0]).toMatchObject({ kind: 'retainedClipShape', schema: definition.schema, lower });

    const retained = createRetainedProviderDefinitions({ clipShapes: [definition] });
    const delegated = retained.definitions.clipShapes?.[0];
    expect(delegated).toBeDefined();
    if (delegated === undefined) throw new Error('Expected retained ClipShape definition.');
    const delegatedLower = delegated.lower as unknown as typeof definition.lower;
    expect(delegatedLower({ kind: 'retainedClipShape' }, { round: n => n, lower: () => lower() })).toEqual(lower());
  });

  it('copies the Path Kind name, full schema, owner output, and compile branch', () => {
    const initial = createDefinition();
    const captured = captureCoreProviderDefinitions({ pathKinds: [initial] });
    const copy = captured.pathKinds?.[0];

    expect(copy).toMatchObject({
      name: 'retained-fixture',
      schema: pathKindSchema,
      compile: initial.compile,
      ownerOutput,
    });
    expect(copy?.ownerOutput).toBe(ownerOutput);
    expect(copy && Object.hasOwn(copy, 'optionsSchema')).toBe(false);

    const retained = createRetainedProviderDefinitions({ pathKinds: [initial] });
    expect(retained.definitions.pathKinds?.[0]?.ownerOutput).toBe(ownerOutput);
  });

  it('allows same-name compile callback updates but rejects schema and slot-key changes', () => {
    const initialCompile: AnyPathKindDefinition['compile'] = () => initialResult;
    const initial = createDefinition(pathKindSchema, initialCompile);
    const retained = createRetainedProviderDefinitions({ pathKinds: [initial] });
    const nextCompile: AnyPathKindDefinition['compile'] = () => nextResult;
    const next = createDefinition(pathKindSchema, nextCompile);
    const changed = retained.prepare({ pathKinds: [next] });
    expect(changed.changed).toBe(true);
    changed.rollback();

    const changedSchema = PathBaseSchema.extend({
      kind: z.literal('retained-fixture'),
      kindOptions: z.strictObject({ changed: z.boolean() }).optional(),
    });
    const invalid = expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid });
    expect(() => retained.prepare({ pathKinds: [createDefinition(changedSchema)] })).toThrow(invalid);
    expect(() =>
      retained.prepare({ pathKinds: [createDefinition(pathKindSchema, initial.compile, 'renamed-fixture')] }),
    ).toThrow(invalid);
  });

  it('delegates through the stable compile branch and rolls back callback updates', () => {
    const initialCompile: AnyPathKindDefinition['compile'] = () => initialResult;
    const nextCompile: AnyPathKindDefinition['compile'] = () => nextResult;
    const initial = createDefinition(pathKindSchema, initialCompile);
    const retained = createRetainedProviderDefinitions({ pathKinds: [initial] });
    const stableCompile = retained.definitions.pathKinds?.[0]?.compile;

    expect(stableCompile).toBeDefined();
    if (stableCompile === undefined) throw new Error('Expected retained Path Kind compile delegate.');
    expect(stableCompile(undefined as never)).toBe(initialResult);

    const changed = retained.prepare({ pathKinds: [createDefinition(pathKindSchema, nextCompile)] });
    expect(stableCompile(undefined as never)).toBe(nextResult);

    changed.rollback();
    expect(stableCompile(undefined as never)).toBe(initialResult);
  });
});
