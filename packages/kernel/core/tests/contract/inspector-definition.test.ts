import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type {
  InspectorDefinition,
  InspectorOutput,
  PathKindCompileResult,
  PathKindDefinition,
  StrokePathInspectionSubject,
} from '../../src';

import {
  CompositeBaseSchema,
  defineComposite,
  defineInspector,
  definePathKind,
  StrokePathInspectionSubjectSchema,
} from '../../src';

const optionsInputSchema = z.strictObject({ labels: z.boolean().optional() });
const optionsSchema = optionsInputSchema.transform(value => ({ labels: value.labels ?? false }));

const pathInspector = defineInspector({
  kind: 'path',
  optionsInputSchema,
  optionsSchema,
  inspect: (subject: StrokePathInspectionSubject, context) => {
    expectTypeOf(subject.commands).toMatchTypeOf<ReadonlyArray<unknown>>();
    expectTypeOf(subject.transforms).toMatchTypeOf<ReadonlyArray<unknown>>();
    expectTypeOf(context.options.labels).toEqualTypeOf<boolean>();
    return { type: 'coordinate', id: 'control', position: [0, 0] };
  },
});

describe('Inspector definition contract', () => {
  it('preserves subject, canonical options, appearance, and IR child output types', () => {
    expectTypeOf(pathInspector).toMatchTypeOf<
      InspectorDefinition<
        'path',
        StrokePathInspectionSubject,
        z.input<typeof optionsInputSchema>,
        z.output<typeof optionsSchema>
      >
    >();
    expectTypeOf<ReturnType<typeof pathInspector.inspect>>().toMatchTypeOf<InspectorOutput>();

    expect(pathInspector.optionsSchema.parse({})).toEqual({ labels: false });
  });

  it('rejects non-strict, empty-unresolvable, and non-JSON canonical options', () => {
    const define = (input: z.ZodType, resolved: z.ZodType) =>
      defineInspector({
        kind: 'path',
        optionsInputSchema: input,
        optionsSchema: resolved,
        inspect: () => [],
      } as never);

    expect(() => define(z.object({}).passthrough(), z.strictObject({}))).toThrow(/strict/i);
    expect(() => define(z.strictObject({ required: z.boolean() }), z.strictObject({ required: z.boolean() }))).toThrow(
      /empty|canonical/i,
    );
    expect(() =>
      define(
        z.strictObject({}),
        z.strictObject({}).transform(() => ({ value: () => 1 })),
      ),
    ).toThrow(/JSON/i);
  });

  it('binds a Composite Inspector to its typed artifact through the owner definition', () => {
    const inspector = defineInspector({
      kind: 'composite',
      optionsInputSchema: z.strictObject({}),
      optionsSchema: z.strictObject({}),
      inspect: (artifact: { width: number }) => {
        expectTypeOf(artifact.width).toEqualTypeOf<number>();
        return [];
      },
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'inspected',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('inspected') }),
      artifactSchema: z.strictObject({ width: z.number() }),
      inspector,
      compile: () => ({ children: [], artifact: { width: 10 } }),
    });

    expect(definition.inspector).toBe(inspector);
  });

  it('binds Path compile subject, subject schema, and Inspector as one conditional branch', () => {
    const definition = definePathKind({
      schema: z.object({ kind: z.literal('inspected-path') }),
      inspectionSubjectSchema: StrokePathInspectionSubjectSchema,
      inspector: pathInspector,
      compile: (): PathKindCompileResult<StrokePathInspectionSubject> => ({
        primitives: [],
        boundsPoints: [],
        inspectionSubject: { commands: [], transforms: [] },
      }),
    });

    expectTypeOf(definition).toMatchTypeOf<
      PathKindDefinition<unknown, StrokePathInspectionSubject, z.input<typeof optionsInputSchema>, { labels: boolean }>
    >();
    expect(definition.inspector).toBe(pathInspector);
  });

  it('rejects runtime-erased Path definitions with an incomplete inspection branch', () => {
    expect(() =>
      definePathKind({
        schema: z.object({ kind: z.literal('subject-only') }),
        inspectionSubjectSchema: StrokePathInspectionSubjectSchema,
        compile: () => ({ primitives: [], boundsPoints: [], inspectionSubject: { commands: [], transforms: [] } }),
      } as never),
    ).toThrow(/inspectionSubjectSchema.*inspector|inspector.*inspectionSubjectSchema/i);

    expect(() =>
      definePathKind({
        schema: z.object({ kind: z.literal('inspector-only') }),
        inspector: pathInspector,
        compile: () => ({ primitives: [], boundsPoints: [], inspectionSubject: { commands: [], transforms: [] } }),
      } as never),
    ).toThrow(/inspectionSubjectSchema/i);
  });
});
