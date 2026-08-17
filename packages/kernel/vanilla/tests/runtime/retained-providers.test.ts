import type {
  AnyPathKindDefinition,
  ClipDefinition,
  ClipLowerContext,
  ClipResolveContext,
  ClipShape,
  SceneClipPath,
} from '@retikz/core';

import { defineClip, PathBaseSchema, StrokePathOwnerOutputSchema } from '@retikz/core';
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

type RetainedClip = {
  kind: 'retainedClip';
  size: number;
};

type RetainedClipShape = ClipShape & {
  kind: 'retainedClip';
  size: number;
};

const retainedClipSchema: z.ZodType<RetainedClip> = z.strictObject({
  kind: z.literal('retainedClip'),
  size: z.number().positive(),
});

const retainedClipShapeSchema: z.ZodType<RetainedClipShape> = z.strictObject({
  kind: z.literal('retainedClip'),
  size: z.number().positive(),
});

const initialClipPath: SceneClipPath = {
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [1, 1] },
  ],
  fillRule: 'nonzero',
};

const nextClipPath: SceneClipPath = {
  commands: [
    { kind: 'move', to: [0, 0] },
    { kind: 'line', to: [2, 2] },
  ],
  fillRule: 'nonzero',
};

type RetainedClipResolve = (spec: RetainedClip, context: ClipResolveContext) => RetainedClipShape;
type RetainedClipLower = (shape: RetainedClipShape, context: ClipLowerContext) => SceneClipPath;

const createClipDefinition = (
  resolve: RetainedClipResolve = spec => ({ kind: 'retainedClip', size: spec.size }),
  lower: RetainedClipLower = () => initialClipPath,
  schema: z.ZodType<RetainedClip> = retainedClipSchema,
  shapeSchema: z.ZodType<RetainedClipShape> = retainedClipShapeSchema,
): ClipDefinition =>
  defineClip<RetainedClip, RetainedClipShape>({
    kind: 'retainedClip',
    schema,
    resolve,
    shapeSchema,
    lower,
  });

const createDefinition = (
  schema: AnyPathKindDefinition['schema'] = pathKindSchema,
  compile: AnyPathKindDefinition['compile'] = () => null,
  name = 'retained-fixture',
): AnyPathKindDefinition => ({ name, schema, compile, ownerOutput });

describe('retained Path Kind definitions', () => {
  it('captures every complete Clip callback and schema identity in clips', () => {
    const resolve: RetainedClipResolve = spec => ({ kind: 'retainedClip', size: spec.size });
    const lower: RetainedClipLower = () => initialClipPath;
    const definition = createClipDefinition(resolve, lower);
    const captured = captureCoreProviderDefinitions({ clips: [definition] });

    expect(captured.clips?.[0]).toMatchObject({
      kind: 'retainedClip',
      schema: retainedClipSchema,
      resolve,
      shapeSchema: retainedClipShapeSchema,
      lower,
    });
  });

  it('delegates stable Clip resolve/lower callbacks across prepare and rollback', () => {
    const initialResolve: RetainedClipResolve = spec => ({ kind: 'retainedClip', size: spec.size });
    const initialLower: RetainedClipLower = () => initialClipPath;
    const nextResolve: RetainedClipResolve = spec => ({ kind: 'retainedClip', size: spec.size + 1 });
    const nextLower: RetainedClipLower = () => nextClipPath;
    const retained = createRetainedProviderDefinitions({
      clips: [createClipDefinition(initialResolve, initialLower)],
    });
    const delegated = retained.definitions.clips?.[0];
    expect(delegated).toBeDefined();
    if (delegated === undefined) throw new Error('Expected retained Clip definition.');
    const stableResolve = delegated.resolve as unknown as RetainedClipResolve;
    const stableLower = delegated.lower;
    const resolveContext = {
      round: (value: number) => value,
      resolve: () => {
        throw new Error('not used by retained fixture');
      },
    };
    const lowerContext = {
      round: (value: number) => value,
      lower: () => {
        throw new Error('not used by retained fixture');
      },
    };

    expect(stableResolve({ kind: 'retainedClip', size: 4 }, resolveContext)).toEqual({
      kind: 'retainedClip',
      size: 4,
    });
    expect(stableLower({ kind: 'retainedClip', size: 4 }, lowerContext)).toBe(initialClipPath);

    const changed = retained.prepare({ clips: [createClipDefinition(nextResolve, nextLower)] });
    expect(changed.changed).toBe(true);
    expect(stableResolve({ kind: 'retainedClip', size: 4 }, resolveContext)).toEqual({
      kind: 'retainedClip',
      size: 5,
    });
    expect(stableLower({ kind: 'retainedClip', size: 4 }, lowerContext)).toBe(nextClipPath);

    changed.rollback();
    expect(stableResolve({ kind: 'retainedClip', size: 4 }, resolveContext)).toEqual({
      kind: 'retainedClip',
      size: 4,
    });
    expect(stableLower({ kind: 'retainedClip', size: 4 }, lowerContext)).toBe(initialClipPath);
  });

  it('rejects an operation-only Clip object before creating retained delegates', () => {
    const operationOnly = {
      kind: 'retainedClip',
      schema: retainedClipSchema,
      resolve: (spec: RetainedClip) => ({ kind: 'retainedClip' as const, size: spec.size }),
    } as unknown as ClipDefinition;

    expect(() => createRetainedProviderDefinitions({ clips: [operationOnly] })).toThrow(
      expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
  });

  it('rejects retained Clip kind, schema, shape schema, and field-set changes', () => {
    const retained = createRetainedProviderDefinitions({ clips: [createClipDefinition()] });
    const invalid = expect.objectContaining({ code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid });
    const changedSchema = z.strictObject({
      kind: z.literal('retainedClip'),
      size: z.number().positive(),
      changed: z.boolean().optional(),
    }) as unknown as z.ZodType<RetainedClip>;
    const changedShapeSchema = z.strictObject({
      kind: z.literal('retainedClip'),
      size: z.number().positive(),
      changed: z.boolean().optional(),
    }) as unknown as z.ZodType<RetainedClipShape>;
    const renamed = defineClip({
      kind: 'renamedClip',
      schema: z.strictObject({ kind: z.literal('renamedClip'), size: z.number().positive() }),
      resolve: spec => ({ kind: 'renamedClip', size: spec.size }),
      shapeSchema: z.strictObject({ kind: z.literal('renamedClip'), size: z.number().positive() }),
      lower: () => initialClipPath,
    });
    const changedFields = { ...createClipDefinition(), metadata: true } as unknown as ClipDefinition;

    expect(() => retained.prepare({ clips: [renamed] })).toThrow(invalid);
    expect(() => retained.prepare({ clips: [createClipDefinition(undefined, undefined, changedSchema)] })).toThrow(
      invalid,
    );
    expect(() =>
      retained.prepare({ clips: [createClipDefinition(undefined, undefined, retainedClipSchema, changedShapeSchema)] }),
    ).toThrow(invalid);
    expect(() => retained.prepare({ clips: [changedFields] })).toThrow(invalid);
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
