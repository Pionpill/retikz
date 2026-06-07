// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IR } from '@retikz/core';
import { mountCanvas, mountSvg } from '../src';

/**
 * ADR-04 runtime 播放控制（jsdom）：mountSvg load→CSS 自播 / 交互→WAAPI 桥；mountCanvas rAF 时钟 + trigger；
 *   {animate:false} + prefers-reduced-motion 降级；view.animation 句柄。
 */

/** 录制型 2d context（jsdom 无 2d backend） */
const createRecordingContext = (): CanvasRenderingContext2D => {
  const target: Record<string | symbol, unknown> = { canvas: null, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineDashOffset: 0 };
  return new Proxy(target, {
    get: (t, p) => (p in t ? t[p] : () => undefined),
    set: (t, p, v) => ((t[p] = v), true),
  }) as unknown as CanvasRenderingContext2D;
};

let animateSpy: ReturnType<typeof vi.fn>;
let rafSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => createRecordingContext());
  // jsdom 无 element.animate：mock 成返回假 Animation 的 spy
  animateSpy = vi.fn(() => ({ play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'idle' }));
  (Element.prototype as unknown as { animate: unknown }).animate = animateSpy;
  // mock rAF：只记录调用、不真递归（避免无限循环）
  rafSpy = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', rafSpy);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const loadIr: IR = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, fill: '#0a0', animations: [{ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400 }] }],
};
const manualIr: IR = {
  version: 1,
  type: 'scene',
  children: [{ type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, stroke: '#000', animations: [{ property: 'strokeWidth', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 4 }], duration: 300, trigger: 'manual' }] }],
};

describe('mountSvg 动画', () => {
  it('load track → 内联 <style> 含 @keyframes（CSS 自播）', () => {
    const view = mountSvg(document.createElement('div'), loadIr);
    const style = view.root.querySelector('style');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('@keyframes');
  });

  it('{animate:false} → 无 <style>（静态 base）', () => {
    const view = mountSvg(document.createElement('div'), loadIr, { animate: false });
    expect(view.root.querySelector('style')).toBeNull();
  });

  it('交互 track（manual）→ WAAPI 桥调 element.animate + view.animation 句柄', () => {
    const view = mountSvg(document.createElement('div'), manualIr);
    expect(animateSpy).toHaveBeenCalled();
    expect(view.animation).toBeDefined();
  });

  it('prefers-reduced-motion → 静态（无 <style>）', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const view = mountSvg(document.createElement('div'), loadIr);
    expect(view.root.querySelector('style')).toBeNull();
  });
});

describe('mountCanvas 动画', () => {
  it('load track → 起 rAF 时钟 + view.animation 句柄', () => {
    const view = mountCanvas(document.createElement('div'), loadIr, { width: 100, height: 100 });
    expect(rafSpy).toHaveBeenCalled();
    expect(view.animation).toBeDefined();
  });

  it('{animate:false} → 不起 rAF、无 animation 句柄（静态）', () => {
    const view = mountCanvas(document.createElement('div'), loadIr, { width: 100, height: 100, animate: false });
    expect(rafSpy).not.toHaveBeenCalled();
    expect(view.animation).toBeUndefined();
  });

  it('manual-only track → 不自动起 rAF，但有 view.animation 句柄；play() 起时钟', () => {
    const view = mountCanvas(document.createElement('div'), manualIr, { width: 100, height: 100 });
    expect(rafSpy).not.toHaveBeenCalled();
    expect(view.animation).toBeDefined();
    view.animation!.play();
    expect(rafSpy).toHaveBeenCalled();
  });

  it('无动画 scene → 不起 rAF（零开销，回归现状）', () => {
    const plainIr: IR = { version: 1, type: 'scene', children: [{ type: 'node', id: 'a', position: [0, 0], text: 'x' }] };
    const view = mountCanvas(document.createElement('div'), plainIr, { width: 100, height: 100 });
    expect(rafSpy).not.toHaveBeenCalled();
    expect(view.animation).toBeUndefined();
  });
});
