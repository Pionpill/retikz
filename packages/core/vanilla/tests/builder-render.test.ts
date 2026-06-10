// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BUILTIN_SHAPES } from '@retikz/core';
import { coordinate } from '../src/builder/coordinate';
import { draw } from '../src/builder/draw';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';
import { mountSvg, renderToSvgString } from '../src';

/** 自定义 shape：复用 builtin 定义、注册成新名 'hexagon'，仅验 figure({shapes}) 把表透传进 compileToScene */
const hexagon = BUILTIN_SHAPES.rectangle;

describe('@retikz/vanilla builder ↔ render 管线', () => {
  it('width-height-emitted：figure({width,height}) 的 toSvgString/mount 根 <svg> 带 width/height', () => {
    const fig = figure({ width: 400, height: 300 }, [node('a', { position: [0, 0], text: 'A' })]);
    const str = fig.toSvgString();
    expect(str).toMatch(/<svg[^>]*\bwidth="400"/);
    expect(str).toMatch(/<svg[^>]*\bheight="300"/);

    const c = document.createElement('div');
    const view = fig.mount(c);
    expect(view.root.getAttribute('width')).toBe('400');
    expect(view.root.getAttribute('height')).toBe('300');
  });

  it('width-height-omitted：未给时只有 viewBox、无 width/height（不回归）', () => {
    const str = figure({}, [node('a', { position: [0, 0], text: 'A' })]).toSvgString();
    expect(str).toMatch(/viewBox=/);
    expect(str).not.toMatch(/<svg[^>]*\bwidth=/);
  });

  it('options-call-wins：figure({idPrefix:a}).toSvgString({idPrefix:b}) 用 b', () => {
    const fig = figure({ idPrefix: 'aaa' }, [
      node('a', {
        position: [0, 0],
        shape: 'rectangle',
        minimumWidth: 40,
        minimumHeight: 20,
        fill: { kind: 'linearGradient', stops: [{ offset: 0, color: '#f00' }, { offset: 1, color: '#00f' }] },
      }),
    ]);
    const out = fig.toSvgString({ idPrefix: 'bbb' });
    expect(out).toContain('retikz-paint-bbb-');
    expect(out).not.toContain('retikz-paint-aaa-');
  });

  it('figure-feeds-standalone：mountSvg/renderToSvgString 直接接受 Figure', () => {
    const fig = figure({ width: 120, height: 90 }, [node('a', { position: [0, 0], text: 'A' })]);
    const c = document.createElement('div');
    const view = mountSvg(c, fig);
    expect(c.querySelector('svg')).toBe(view.root);
    expect(view.root.getAttribute('width')).toBe('120');
    expect(renderToSvgString(fig)).toMatch(/<svg/);
  });

  it('figure-hyperscript-mount：figure(opts, [...]).mount 挂出 SVG DOM', () => {
    const c = document.createElement('div');
    figure({ width: 200, height: 150 }, [
      node('a', { position: [0, 0], text: 'A' }),
      node('b', { position: [80, 0], text: 'B' }),
      draw(['a', 'b'], { arrow: '->' }),
    ]).mount(c);
    expect(c.querySelector('svg')).not.toBeNull();
    expect(c.querySelector('text, rect, g, path')).not.toBeNull();
  });

  it('custom-shape-passthrough：figure({shapes}) 把 shape 表透传进 compileToScene（未注册抛、注册后不抛）', () => {
    const mk = (shapes?: Record<string, typeof hexagon>): string =>
      figure({ width: 100, height: 100, ...(shapes ? { shapes } : {}) }, [
        node('a', { position: [0, 0], shape: 'hexagon', minimumWidth: 40, minimumHeight: 40, fill: '#0a0' }),
      ]).toSvgString();
    expect(() => mk()).toThrow(/hexagon/i); // 未注册 → compileToScene 抛
    expect(() => mk({ hexagon })).not.toThrow(); // figure({shapes}) 透传后 → 不抛
  });

  it('invalid-config-throws：坏 config 字段 → compileToScene schema 报错、不静默', () => {
    const bad = figure({}, [node('a', { position: [0, 0], shape: 123 as unknown as string })]);
    expect(() => bad.toSvgString()).toThrow();
  });

  it('coordinate-needs-position：coordinate 缺 position（绕过类型）→ 编译期报错', () => {
    const fig = figure({}, [
      node('a', { position: [0, 0], text: 'A' }),
      coordinate('m', {} as never),
      draw(['a', 'm']),
    ]);
    expect(() => fig.toSvgString()).toThrow();
  });
});
