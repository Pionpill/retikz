import { describe, expect, it } from 'vitest';
import type { EllipsePrim, PathPrim, RectPrim, Scene } from '@retikz/core';
import { renderToSvgString } from '../src/svg/serialize/to-string';

/**
 * ADR-01 / ADR-02 render 层（SVG 后端）：
 *   shadow → `<filter><feDropShadow>` def + 几何 `filter="url(#...)"`；
 *   blendMode → 几何 `style="mix-blend-mode:..."`。
 */

const sceneOf = (primitives: Scene['primitives']): Scene => ({
  primitives,
  layout: { x: 0, y: 0, width: 100, height: 100 },
});

describe('[svg-effects] drop shadow', () => {
  it('shadowed rect → <feDropShadow> def + filter ref', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: '#fff',
      shadow: { offsetX: 1, offsetY: 2, blur: 4, color: 'rgba(0,0,0,0.4)' },
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('<filter');
    expect(out).toContain('<feDropShadow');
    expect(out).toContain('dx="1"');
    expect(out).toContain('dy="2"');
    // stdDeviation = blur / 2
    expect(out).toContain('stdDeviation="2"');
    expect(out).toContain('flood-color="rgba(0,0,0,0.4)"');
    // 几何元素引用 filter
    expect(out).toMatch(/<rect [^>]*filter="url\(#retikz-shadow-d1-[0-9a-f]{8}\)"/);
  });

  it('shadow opacity → flood-opacity', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      shadow: { offsetX: 0, offsetY: 1, blur: 2, color: '#000', opacity: 0.3 },
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('flood-opacity="0.3"');
  });

  it('两个相同 shadow → 去重为一个 filter def', () => {
    const mk = (x: number): RectPrim => ({
      type: 'rect',
      x,
      y: 0,
      width: 10,
      height: 10,
      shadow: { offsetX: 0, offsetY: 1, blur: 2, color: '#000' },
    });
    const out = renderToSvgString(sceneOf([mk(0), mk(20)]), { idPrefix: 'd1' });
    expect(out.match(/<feDropShadow/g)).toHaveLength(1);
  });

  it('无 shadow → 不产 filter / feDropShadow', () => {
    const rect: RectPrim = { type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#fff' };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).not.toContain('feDropShadow');
    expect(out).not.toContain('filter=');
  });

  it('shadow on ellipse + path 也注入 filter', () => {
    const el: EllipsePrim = {
      type: 'ellipse',
      cx: 5,
      cy: 5,
      rx: 4,
      ry: 4,
      shadow: { offsetX: 0, offsetY: 2, blur: 4, color: '#000' },
    };
    const path: PathPrim = {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
      ],
      stroke: 'steelblue',
      shadow: { offsetX: 1, offsetY: 1, blur: 2, color: '#000' },
    };
    const out = renderToSvgString(sceneOf([el, path]), { idPrefix: 'd1' });
    expect(out).toMatch(/<ellipse [^>]*filter="url\(#retikz-shadow-/);
    expect(out).toMatch(/<path [^>]*filter="url\(#retikz-shadow-/);
  });
});

describe('[svg-effects] blend mode', () => {
  it('blended rect → style="mix-blend-mode:multiply"', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: 'magenta',
      blendMode: 'multiply',
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('mix-blend-mode:multiply');
    // 不引入 isolation（ADR-02 跨端语义）
    expect(out).not.toContain('isolation');
  });

  it('blendMode="normal" / 省略 → 不出 mix-blend-mode', () => {
    const normal: RectPrim = { type: 'rect', x: 0, y: 0, width: 10, height: 10, blendMode: 'normal' };
    const omitted: RectPrim = { type: 'rect', x: 0, y: 0, width: 10, height: 10 };
    expect(renderToSvgString(sceneOf([normal]), { idPrefix: 'd1' })).not.toContain('mix-blend-mode');
    expect(renderToSvgString(sceneOf([omitted]), { idPrefix: 'd1' })).not.toContain('mix-blend-mode');
  });

  it('blend + shadow + var() fill 共存：mix-blend-mode 与 fill 同进 style，filter 进 attr', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fill: 'var(--brand)',
      blendMode: 'screen',
      shadow: { offsetX: 0, offsetY: 1, blur: 2, color: '#000' },
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('mix-blend-mode:screen');
    expect(out).toContain('fill:var(--brand)');
    expect(out).toMatch(/filter="url\(#retikz-shadow-/);
  });
});
