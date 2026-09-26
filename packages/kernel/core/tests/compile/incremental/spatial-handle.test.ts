import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { array, literal, number, string } from 'zod';

import type { IRScene } from '../../../src';
import {
  CompositeBaseSchema,
  CoreOwnerDefinition,
  createCoreProgram,
  compileToScene,
  defineComposite,
  selectSpatialHandles,
} from '../../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
    aliasIds: array(string()).optional(),
  }),
  expand: node => ({
    children: [],
    spatialHandles: [
      { id: 'body', aliasIds: node.aliasIds, role: 'card', bounds: { x: 0, y: 0, width: node.width, height: 10 } },
    ],
  }),
});

const scene = (width: number, aliasIds?: Array<string>): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'third', type: 'card', width, ...(aliasIds === undefined ? {} : { aliasIds }) }],
});

describe('incremental spatial handle atomicity', () => {
  it('rebuilds Node alias registration on retained updates and matches fresh compilation', () => {
    const source = (aliasIds: Array<string>): IRScene => ({
      type: 'scene',
      version: 1,
      children: [
        { type: 'node', id: 'primary', aliasIds, position: [40, 30], text: 'A' },
        {
          type: 'path',
          id: 'edge',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'alternate' } },
          ],
        },
      ],
    });
    const program = createCoreProgram({ onWarn: () => undefined });
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, source(['alternate']))],
    });
    for (const aliasIds of [[], ['alternate']]) {
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, source(aliasIds))],
      });
      expect(session.artifact(program).value.output.result.scene).toEqual(
        compileToScene(source(aliasIds), { onWarn: () => undefined }).scene,
      );
    }
  });
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
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene(20, ['alternate']))],
    });
    const committed = session.artifact(program).value.output.result;
    expect(committed.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(selectSpatialHandles(committed.spatialHandles, { id: 'alternate' })).toEqual(
      committed.spatialHandles.entries,
    );

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene(-1))],
      }),
    ).toThrow(/RUNTIME_PROGRAM_RUN_FAILED/);

    expect(session.artifact(program).value.output.result).toBe(committed);
    expect(session.artifact(program).value.output.result.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, scene(20, ['new']))],
    });
    const updated = session.artifact(program).value.output.result;
    expect(selectSpatialHandles(updated.spatialHandles, { id: 'alternate' })).toEqual([]);
    expect(selectSpatialHandles(updated.spatialHandles, { id: 'new' })).toHaveLength(1);
  });
});
