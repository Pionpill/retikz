import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, compileToScene, defineComposite, selectSpatialHandles } from '@retikz/core';
import { ReconcilerSession } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';
import { array, literal, number, string } from 'zod';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
    aliasIds: array(string()).optional(),
  }),
  compile: node => ({
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
  it('position-only changes update Scene and spatial handles identically to fresh compilation', () => {
    const source = (x: number): IRScene => ({
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          id: 'panel',
          position: [x, 20],
          children: [{ namespace: 'third', type: 'card', width: 10 }],
        },
      ],
    });
    const runtime = new ReconcilerSession({ composites: [card] });
    runtime.mount(source(0));
    for (const x of [40, -10, 0]) {
      runtime.replace(source(x));
      const result = runtime.read().compilation.result;
      const fresh = compileToScene(source(x), { composites: [card] });
      expect(result.scene).toEqual(fresh.scene);
      expect(result.spatialHandles).toEqual(fresh.spatialHandles);
      expect(result.spatialHandles.entries[0]?.geometry.bounds).toEqual({ x, y: 20, width: 10, height: 10 });
    }
  });

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
    const session = new ReconcilerSession({ onWarn: () => undefined });
    session.mount(source(['alternate']));

    for (const aliasIds of [[], ['alternate']]) {
      session.replace(source(aliasIds));

      expect(session.read().compilation.result.scene).toEqual(
        compileToScene(source(aliasIds), { onWarn: () => undefined }).scene,
      );
    }
  });

  it('commits Scene, artifacts, and spatial index together and preserves the previous revision on failure', () => {
    const session = new ReconcilerSession({ composites: [card] });
    session.mount(scene(10));

    session.replace(scene(20, ['alternate']));
    const committed = session.read().compilation.result;

    expect(committed.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(selectSpatialHandles(committed.spatialHandles, { id: 'alternate' })).toEqual(
      committed.spatialHandles.entries,
    );

    expect(() => session.replace(scene(-1))).toThrow();

    expect(session.read().compilation.result).toBe(committed);
    expect(session.read().compilation.result.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);

    session.replace(scene(20, ['new']));
    const updated = session.read().compilation.result;

    expect(selectSpatialHandles(updated.spatialHandles, { id: 'alternate' })).toEqual([]);
    expect(selectSpatialHandles(updated.spatialHandles, { id: 'new' })).toHaveLength(1);
  });
});
