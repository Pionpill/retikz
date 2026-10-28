// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  resolveSpatialHandle,
  selectSpatialHandles,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, number } from 'zod';

import { toSceneResult } from '../../src';
import { mountSvg } from '../../src/dom';

const card = defineComposite({
  namespace: 'third',
  type: 'card',
  schema: CompositeBaseSchema.extend({
    namespace: literal('third'),
    type: literal('card'),
    width: number(),
  }),
  compile: node => ({
    children: [{ type: 'node', position: [0, 0], minimumWidth: node.width, minimumHeight: 10 }],
    spatialHandles: [{ id: 'body', role: 'card', bounds: { x: 0, y: 0, width: node.width, height: 10 } }],
  }),
});

const scene = (width: number): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ namespace: 'third', type: 'card', width }],
});

describe('Vanilla 编译结果空间 sidecar', () => {
  it('公开编写输入的完整编译结果，并为 Scene 输入公开 undefined 的结果', () => {
    const authored = toSceneResult(scene(10), { compile: { composites: [card] } });
    const passedScene = toSceneResult(authored.scene, {});

    expect(authored.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(passedScene.compileResult).toBeUndefined();
  });

  it('保留直接编译的空间条目和查询结果', () => {
    const direct = compileToScene(scene(10), { composites: [card] });
    const vanilla = toSceneResult(scene(10), { compile: { composites: [card] } });
    const selector = { owner: { namespace: 'third', type: 'card' }, id: 'body' } as const;

    expect(vanilla.compileResult?.spatialHandles.entries).toEqual(direct.spatialHandles.entries);
    expect(selectSpatialHandles(vanilla.compileResult!.spatialHandles, selector)).toEqual(
      selectSpatialHandles(direct.spatialHandles, selector),
    );
    expect(resolveSpatialHandle(vanilla.compileResult!.spatialHandles, selector)).toEqual(
      resolveSpatialHandle(direct.spatialHandles, selector),
    );
  });

  it('静态实时视图的 compileResult 保持最新', () => {
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

  it('保持实时保留视图 compileResult 为最新', () => {
    const view = mountSvg(document.createElement('div'), scene(10), { compile: { composites: [card] } });
    const first = view.compileResult;

    view.update(scene(20));

    expect(first?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);
    expect(view.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(20);
    expect(view.compileResult).not.toBe(first);

    view.dispose();
  });

  it('当候选失败时保留保留的 compileResult 身份', () => {
    const view = mountSvg(document.createElement('div'), scene(10), { compile: { composites: [card] } });
    const committed = view.compileResult;

    expect(() => view.update(scene(-1))).toThrow();
    expect(view.compileResult).toBe(committed);
    expect(view.compileResult?.spatialHandles.entries[0]?.geometry.bounds.width).toBe(10);

    view.dispose();
  });
});
