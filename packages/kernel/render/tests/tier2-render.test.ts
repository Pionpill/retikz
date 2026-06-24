import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, compileToScene, defineComposite } from '@retikz/core';
import type { IR } from '@retikz/core';
import { renderToSvgString } from '../src/svg';
import { drawScene } from '../src/canvas';

/**
 * Tier 2 composite —— renderer 对照（render 零源码改动）
 * @description composite 在 compile 期已展开成 Tier 1 → Scene；svg / canvas 消费同一 Scene，无需认识 composite。
 */
const labeledBox = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('example'),
    type: z.literal('labeledBox'),
    text: z.string(),
  }),
  expand: node => ({ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }),
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
};

describe('Tier 2 composite —— renderer 对照', () => {
  it('composite IR → Scene → svg 渲染出 rect', () => {
    const scene = compileToScene(ir, { composites: [labeledBox] });
    expect(renderToSvgString(scene, { idPrefix: 'r' })).toContain('<rect');
  });

  it('同 Scene → canvas drawScene 消费、不抛、产绘制调用（svg / canvas 同 Scene）', () => {
    const scene = compileToScene(ir, { composites: [labeledBox] });
    const calls: Array<string> = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: () => () => {
        calls.push('call');
      },
      set: () => true,
    });
    expect(() => drawScene(ctx, scene)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });
});
