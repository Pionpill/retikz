import type { EllipsePrim, PathPrim, RectPrim, ResolvedArrowEndSpec, Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { renderToSvgString } from '../../../src/svg/serialize/to-string';

/** 最小可渲染的端点箭头规格（用于断言箭头与主路径同元素受效果牵连） */
const arrowEndSpec: ResolvedArrowEndSpec = {
  shape: 'stealth',
  baseSize: 10,
  refX: 0,
  markerWidth: 6,
  markerHeight: 6,
  marker: [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
      fill: { kind: 'contextStroke' },
    },
  ],
};

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

  it('filter region 取 userSpaceOnUse + scene viewBox（避免 objectBoundingBox 默认区域裁掉投影）', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      shadow: { offsetX: 0, offsetY: 8, blur: 15, color: '#000' },
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toMatch(/<filter [^>]*filterUnits="userSpaceOnUse"/);
    // region = scene layout 按 blur/offset 外扩，避免大投影贴近 viewBox 边缘时被裁。
    expect(out).toMatch(/<filter [^>]*x="-15"[^>]*y="-15"[^>]*width="130"[^>]*height="138"/);
  });

  it('水平直线（包围盒退化为零高）也能拿到非退化 filter region', () => {
    // objectBoundingBox 默认区域下 120%×0≈0 会把直线投影整段裁没；userSpaceOnUse 区域不依赖 bbox
    const line: PathPrim = {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 50] },
        { kind: 'line', to: [100, 50] },
      ],
      stroke: 'steelblue',
      shadow: { offsetX: 0, offsetY: 2, blur: 4, color: '#000' },
    };
    const out = renderToSvgString(sceneOf([line]), { idPrefix: 'd1' });
    expect(out).toMatch(
      /<filter [^>]*filterUnits="userSpaceOnUse"[^>]*x="-4"[^>]*y="-4"[^>]*width="108"[^>]*height="110"/,
    );
    expect(out).toMatch(/<path [^>]*filter="url\(#retikz-shadow-/);
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

  it('带端点箭头的 path + shadow → marker-end 与 filter 同在该 path 元素上（箭头随主路径一起被滤镜）', () => {
    const path: PathPrim = {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 50] },
        { kind: 'line', to: [80, 50] },
      ],
      stroke: 'steelblue',
      arrowEnd: arrowEndSpec,
      shadow: { offsetX: 0, offsetY: 2, blur: 4, color: '#000' },
    };
    const out = renderToSvgString(sceneOf([path]), { idPrefix: 'd1' });
    // SVG filter / mix-blend-mode 是元素级：marker-end 与 filter 落在同一 <path> 上 → 箭头随主路径一起进滤镜
    expect(out).toMatch(/<path\b[^>]*\bmarker-end="url\(#retikz-arrow-[^"]+"[^>]*\bfilter="url\(#retikz-shadow-[^"]+"/);
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
