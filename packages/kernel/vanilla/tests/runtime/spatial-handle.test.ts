// @vitest-environment jsdom
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  resolveSpatialHandle,
  selectSpatialHandles,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene } from '@retikz/core';

import { mountSvg, toSceneResult } from '../../src';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('third'),
    type: z.literal('card'),
    width: z.number(),
  }),
  expand: node => ({
    children: [{ type: 'node', position: [0, 0], minimumWidth: node.width, minimumHeight: 10 }],
    spatialHandles: [{ key: 'body', role: 'card', bounds: { x: 0, y: 0, width: node.width, height: 10 } }],
  }),
});

const scene = (width: number): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'third', type: 'card', width }],
});

describe('Vanilla compile result spatial sidecar', () => {
  it('exposes the full compile result for authored input and undefined for Scene input', () => {
    const authored = toSceneResult(scene(10), { compile: { composites: [card] } });
    const passedScene = toSceneResult(authored.scene, {});

    expect(authored.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(passedScene.compileResult).toBeUndefined();
  });

  it('preserves direct compile spatial entries and query results', () => {
    const direct = compileToScene(scene(10), { composites: [card] });
    const vanilla = toSceneResult(scene(10), { compile: { composites: [card] } });
    const selector = { owner: { namespace: 'third', type: 'card' }, key: 'body' } as const;

    expect(vanilla.compileResult?.spatialHandles.entries).toEqual(direct.spatialHandles.entries);
    expect(selectSpatialHandles(vanilla.compileResult!.spatialHandles, selector)).toEqual(
      selectSpatialHandles(direct.spatialHandles, selector),
    );
    expect(resolveSpatialHandle(vanilla.compileResult!.spatialHandles, selector)).toEqual(
      resolveSpatialHandle(direct.spatialHandles, selector),
    );
  });

  it('keeps the live static view compileResult current', () => {
    const view = mountSvg(document.createElement('div'), scene(10), {
      compile: { composites: [card] },
      runtime: { mode: 'static' },
    });
    const first = view.compileResult;

    view.update(scene(20));

    expect(first?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(view.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(view.compileResult).not.toBe(first);
    view.dispose();
  });

  it('keeps the live retained view compileResult current', () => {
    const view = mountSvg(document.createElement('div'), scene(10), { compile: { composites: [card] } });
    const first = view.compileResult;

    view.update(scene(20));

    expect(first?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(view.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(view.compileResult).not.toBe(first);
    view.dispose();
  });

  it('preserves the retained compileResult identity when a candidate fails', () => {
    const view = mountSvg(document.createElement('div'), scene(10), { compile: { composites: [card] } });
    const committed = view.compileResult;

    expect(() => view.update(scene(-1))).toThrow();
    expect(view.compileResult).toBe(committed);
    expect(view.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    view.dispose();
  });
});
