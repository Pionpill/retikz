import { describe, expect, it } from 'vitest';
import type { RectPrim, Scene } from '@retikz/core';
import { renderToSvgString } from '../src/serialize/toString';

const sceneOf = (primitives: Scene['primitives'], resources?: Scene['resources']): Scene => ({
  primitives,
  layout: { x: 0, y: 0, width: 10, height: 10 },
  ...(resources ? { resources } : {}),
});

describe('renderToSvgString —— SvgNode → 字符串', () => {
  it('rect → 逐字 kebab / SVG 真名属性，无 React camelCase', () => {
    const rect: RectPrim = {
      type: 'rect',
      x: 1,
      y: 2,
      width: 10,
      height: 20,
      fill: '#f00',
      strokeWidth: 2,
    };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('stroke-width="2"');
    expect(out).toContain('fill="#f00"');
    expect(out).not.toContain('strokeWidth');
    // 无 children 的元素自闭合
    expect(out).toContain('<rect ');
    expect(out).toContain('/>');
  });

  it('含 var() 的 fill → 拼进 style="fill:var(--brand)"，不进 fill attribute', () => {
    const rect: RectPrim = { type: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'var(--brand)' };
    const out = renderToSvgString(sceneOf([rect]), { idPrefix: 'd1' });
    expect(out).toContain('style="fill:var(--brand)"');
    expect(out).not.toContain('fill="var(--brand)"');
  });

  it('顶层 <svg> 携 viewBox，空场景不含 <defs>', () => {
    const out = renderToSvgString(sceneOf([]), { idPrefix: 'd1' });
    expect(out.startsWith('<svg viewBox="0 0 10 10"')).toBe(true);
    expect(out).not.toContain('<defs');
  });

  it('文本内容里的 XML 特殊字符被转义', () => {
    const text: Scene['primitives'][number] = {
      type: 'text',
      x: 0,
      y: 0,
      lines: [{ text: 'a < b & c' }],
      fontSize: 12,
      align: 'start',
      baseline: 'alphabetic',
      lineHeight: 12,
      measuredWidth: 40,
      measuredHeight: 12,
    };
    const out = renderToSvgString(sceneOf([text]), { idPrefix: 'd1' });
    expect(out).toContain('a &lt; b &amp; c');
    expect(out).not.toContain('a < b & c');
  });
});
