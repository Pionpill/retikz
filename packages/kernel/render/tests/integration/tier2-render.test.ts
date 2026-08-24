import type { IRScene } from '@retikz/core';

import { compileToScene, CompositeBaseSchema, defineComposite, defineThemeStyle, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import { drawScene } from '../../src/canvas';
import { renderToSvgString } from '../../src/svg';

/**
 * Tier 2 composite —— renderer 对照（render 零源码改动）
 * @description composite 在 compile 期已展开成 Tier 1 → Scene；svg / canvas 消费同一 Scene，无需认识 composite
 */
const labeledBox = defineComposite({
  namespace: 'example',
  type: 'labeledBox',
  schema: CompositeBaseSchema.extend({
    namespace: literal('example'),
    type: literal('labeledBox'),
    text: string(),
  }),
  expand: (node, context) => ({
    children: [
      {
        type: 'node',
        id: 'lb',
        position: [0, 0],
        shape: 'rectangle',
        text: node.text,
        fill: context.theme.style === 'academic' && context.theme.mode === ThemeMode.Dark ? '#123456' : '#abcdef',
      },
    ],
    spatialHandles: [{ key: 'body', role: 'labeled-box', bounds: { x: -5, y: -5, width: 10, height: 10 } }],
  }),
});

const ir: IRScene = {
  version: 1,
  type: 'scene',
  theme: { style: 'academic', mode: ThemeMode.Dark },
  children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
};

const academicTheme = defineThemeStyle({
  name: 'academic',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00', guide: '#666666' },
    categorical: ['#112233'],
  }),
});

describe('Tier 2 composite —— renderer 对照', () => {
  it('composite IR → Scene → svg 渲染出 rect', () => {
    const result = compileToScene(ir, { composites: [labeledBox], themeStyles: [academicTheme] });
    const { scene } = result;
    const svg = renderToSvgString(scene, { idPrefix: 'r' });
    expect(result.spatialHandles.entries).toHaveLength(1);
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain('spatial');
    expect(scene).not.toHaveProperty('spatialHandles');
    expect(scene).not.toHaveProperty('theme');
  });

  it('Theme-aware Composite物化后的同一 Scene由SVG与Canvas等价消费', () => {
    const result = compileToScene(ir, { composites: [labeledBox], themeStyles: [academicTheme] });
    const { scene } = result;
    const calls: Array<string> = [];
    const fillStyles: Array<string> = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: () => () => {
        calls.push('call');
      },
      set: (_target, property, value) => {
        if (property === 'fillStyle') fillStyles.push(String(value));
        return true;
      },
    });
    const svg = renderToSvgString(scene, { idPrefix: 'r' });
    expect(() => drawScene(ctx, scene)).not.toThrow();
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain('spatial');
    expect(result.spatialHandles.entries).toHaveLength(1);
    expect(scene).not.toHaveProperty('spatialHandles');
    expect(fillStyles).toContain('#123456');
    expect(calls.length).toBeGreaterThan(0);
  });
});
