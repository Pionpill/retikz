import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { literal, number } from 'zod';

import type { IRScene } from '../../../src';

import { CompositeBaseSchema, CoreOwnerDefinition, createCoreProgram, defineComposite } from '../../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
  }),
  expand: node => ({
    children: [],
    spatialHandles: [{ key: 'body', role: 'card', bounds: { x: 0, y: 0, width: node.width, height: 10 } }],
  }),
});

const scene = (width: number): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'third', type: 'card', width }],
});

describe('incremental spatial handle atomicity', () => {
  it('commits Scene, artifacts, and spatial index together and preserves the previous revision on failure', () => {
    const program = createCoreProgram({ composites: [card] });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, scene(10))],
    });

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene(20))],
    });
    const committed = session.artifact(program).value.output.result;
    expect(committed.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene(-1))],
      }),
    ).toThrow(/RUNTIME_PROGRAM_RUN_FAILED/);

    expect(session.artifact(program).value.output.result).toBe(committed);
    expect(session.artifact(program).value.output.result.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
  });
});
