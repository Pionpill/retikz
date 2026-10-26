import type { ScenePrimitive, AnyPathDefinition, ClipDefinition, ClipLowerContext, SceneClipPath } from '@retikz/core';
import { defineClip, PathSchema } from '@retikz/core';
import { RetikzRenderErrorCode } from '@retikz/render/runtime';
import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { boolean, literal, number, strictObject } from 'zod';

import {
  captureCoreProviderDefinitions,
  createRetainedProviderDefinitions,
} from '../../src/runtime/retained-providers';

const pathSchema = PathSchema.extend({ kind: literal('retained-fixture') });

const ownerOutput = true;

const initialResult = { primitives: [], boundsPoints: [] };

const nextResult = { primitives: [], boundsPoints: [[1, 1] as [number, number]] };

type RetainedClip = {
  kind: 'retainedClip';
  /** 裁剪参数 */
  params: {
    size: number;
  };
};

const retainedClipSchema: ZodType<RetainedClip> = strictObject({
  kind: literal('retainedClip'),
  params: strictObject({
    size: number().positive(),
  }),
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

type RetainedClipLower = (spec: RetainedClip, context: ClipLowerContext) => SceneClipPath;

const createClipDefinition = (
  lower: RetainedClipLower = () => initialClipPath,
  schema: ZodType<RetainedClip> = retainedClipSchema,
): ClipDefinition =>
  defineClip<RetainedClip>({
    kind: 'retainedClip',
    schema,
    lower,
  });

const createDefinition = (
  schema: AnyPathDefinition['schema'] = pathSchema,
  compile: AnyPathDefinition['compile'] = () => null,
  name = 'retained-fixture',
): AnyPathDefinition => ({ name, schema, compile, ownerOutput });

describe('retained Path Definition definitions', () => {
  it('captures every complete Clip callback and schema identity in clips', () => {
    const lower: RetainedClipLower = () => initialClipPath;
    const definition = createClipDefinition(lower);
    const captured = captureCoreProviderDefinitions({ clips: [definition] });

    expect(captured.clips?.[0]).toMatchObject({
      kind: 'retainedClip',
      schema: retainedClipSchema,
      lower,
    });
  });

  it('delegates stable Clip lower callback across prepare and rollback', () => {
    const initialLower: RetainedClipLower = () => initialClipPath;
    const nextLower: RetainedClipLower = () => nextClipPath;
    const retained = createRetainedProviderDefinitions({
      clips: [createClipDefinition(initialLower)],
    });
    const delegated = retained.definitions.clips?.[0];

    expect(delegated).toBeDefined();

    if (delegated === undefined) throw new Error('Expected retained Clip definition.');

    const stableLower = delegated.lower;
    const lowerContext = {
      round: (value: number) => value,
      lower: () => {
        throw new Error('not used by retained fixture');
      },
    };

    expect(stableLower({ kind: 'retainedClip', params: { size: 4 } }, lowerContext)).toBe(initialClipPath);

    const changed = retained.prepare({ clips: [createClipDefinition(nextLower)] });

    expect(changed.changed).toBe(true);
    expect(stableLower({ kind: 'retainedClip', params: { size: 4 } }, lowerContext)).toBe(nextClipPath);

    changed.rollback();

    expect(stableLower({ kind: 'retainedClip', params: { size: 4 } }, lowerContext)).toBe(initialClipPath);
  });

  it('rejects an operation-only Clip object before creating retained delegates', () => {
    const operationOnly = {
      kind: 'retainedClip',
      schema: retainedClipSchema,
      resolve: (spec: RetainedClip) => ({ kind: 'retainedClip' as const, params: { size: spec.params.size } }),
    } as unknown as ClipDefinition;

    expect(() => createRetainedProviderDefinitions({ clips: [operationOnly] })).toThrow(
      expect.objectContaining({ code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid }),
    );
  });

  it('rejects retained Clip kind, schema, and field-set changes', () => {
    const retained = createRetainedProviderDefinitions({ clips: [createClipDefinition()] });
    const invalid = expect.objectContaining({ code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid });
    const changedSchema = strictObject({
      kind: literal('retainedClip'),
      params: strictObject({
        size: number().positive(),
        changed: boolean().optional(),
      }),
    }) as unknown as ZodType<RetainedClip>;

    const renamed = defineClip({
      kind: 'renamedClip',
      schema: strictObject({ kind: literal('renamedClip'), params: strictObject({ size: number().positive() }) }),

      lower: () => {
        return initialClipPath;
      },
    });
    const changedFields = { ...createClipDefinition(), metadata: true } as unknown as ClipDefinition;

    expect(() => retained.prepare({ clips: [renamed] })).toThrow(invalid);
    expect(() => retained.prepare({ clips: [createClipDefinition(undefined, changedSchema)] })).toThrow(invalid);

    expect(() => retained.prepare({ clips: [changedFields] })).toThrow(invalid);
  });

  it('copies the Path Definition name, full schema, owner output, and compile branch', () => {
    const initial = createDefinition();
    const captured = captureCoreProviderDefinitions({ paths: [initial] });
    const copy = captured.paths?.[0];

    expect(copy).toMatchObject({
      name: 'retained-fixture',
      schema: pathSchema,
      compile: initial.compile,
      ownerOutput,
    });
    expect(copy?.ownerOutput).toBe(ownerOutput);
    expect(copy && Object.hasOwn(copy, 'optionsSchema')).toBe(false);

    const retained = createRetainedProviderDefinitions({ paths: [initial] });

    expect(retained.definitions.paths?.[0]?.ownerOutput).toBe(ownerOutput);
  });

  it('allows same-name compile callback updates but rejects schema and slot-key changes', () => {
    const initialCompile: AnyPathDefinition['compile'] = () => initialResult;
    const initial = createDefinition(pathSchema, initialCompile);
    const retained = createRetainedProviderDefinitions({ paths: [initial] });
    const nextCompile: AnyPathDefinition['compile'] = () => nextResult;
    const next = createDefinition(pathSchema, nextCompile);
    const changed = retained.prepare({ paths: [next] });

    expect(changed.changed).toBe(true);

    changed.rollback();

    const changedSchema = PathSchema.extend({
      kind: literal('retained-fixture'),
      kindOptions: strictObject({ changed: boolean() }).optional(),
    });
    const invalid = expect.objectContaining({ code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid });

    expect(() => retained.prepare({ paths: [createDefinition(changedSchema)] })).toThrow(invalid);
    expect(() =>
      retained.prepare({ paths: [createDefinition(pathSchema, initial.compile, 'renamed-fixture')] }),
    ).toThrow(invalid);
  });

  it('delegates through the stable compile branch and rolls back callback updates', () => {
    const initialCompile: AnyPathDefinition['compile'] = () => initialResult;
    const nextCompile: AnyPathDefinition['compile'] = () => nextResult;
    const initial = createDefinition(pathSchema, initialCompile);
    const retained = createRetainedProviderDefinitions({ paths: [initial] });
    const stableCompile = retained.definitions.paths?.[0]?.compile;

    expect(stableCompile).toBeDefined();

    if (stableCompile === undefined) throw new Error('Expected retained Path Definition compile delegate.');

    expect(stableCompile(undefined as never)).toBe(initialResult);

    const changed = retained.prepare({ paths: [createDefinition(pathSchema, nextCompile)] });

    expect(stableCompile(undefined as never)).toBe(nextResult);

    changed.rollback();

    expect(stableCompile(undefined as never)).toBe(initialResult);
  });
});

it('标记定义回调更新可回滚且保持代理身份', () => {
  const first = {
    name: 'dot',
    emit: (): Array<ScenePrimitive> => [{ type: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 2 }],
  };
  const second = {
    name: 'dot',
    emit: (): Array<ScenePrimitive> => [{ type: 'ellipse', cx: 0, cy: 0, rx: 4, ry: 4 }],
  };
  const retained = createRetainedProviderDefinitions({ marks: [first] });
  const delegate = retained.definitions.marks?.[0];
  const context = { params: {}, stroke: 'red', fill: 'red', lineWidth: 1, round: Math.round };
  expect(Array.from(delegate?.emit(context) ?? [])).toMatchObject([{ rx: 2 }]);
  const update = retained.prepare({ marks: [second] });
  expect(retained.definitions.marks?.[0]).toBe(delegate);
  expect(Array.from(delegate?.emit(context) ?? [])).toMatchObject([{ rx: 4 }]);
  update.rollback();
  expect(Array.from(delegate?.emit(context) ?? [])).toMatchObject([{ rx: 2 }]);
});
