// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IR } from '@retikz/core';
import { figure, mountCanvas, node } from '../src';

/**
 * @retikz/vanilla mountCanvas（无框架 canvas 直挂，jsdom 环境）
 * @description jsdom 的 `<canvas>.getContext('2d')` 默认返回 null（无真实 2D backend），故 spy
 *   `HTMLCanvasElement.prototype.getContext` 返回一个「录制型」proxy context 充当原生 canvas 原语——
 *   只提供 canvas API、不替换被测的 mountCanvas 挂载 / dpr / 尺寸逻辑（仍真实受测，对齐 builder-canvas.test 写法）。
 */

/** 录制型 fake 2d context：记录调用名，供断言 drawScene 链路被走（setTransform 等） */
const createRecordingContext = (): { ctx: CanvasRenderingContext2D; calls: Array<string> } => {
  const calls: Array<string> = [];
  const target: Record<string | symbol, unknown> = { canvas: null, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1 };
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      return (...args: Array<unknown>) => {
        calls.push(String(prop));
        void args;
      };
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
};

let recorded: Array<string>;

beforeEach(() => {
  const { ctx, calls } = createRecordingContext();
  recorded = calls;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx);
  vi.spyOn(globalThis, 'devicePixelRatio', 'get').mockReturnValue(2);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 带可命中图元 id 的最小 IR */
const idIr: IR = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, fill: '#0a0' },
  ],
};

describe('@retikz/vanilla mountCanvas', () => {
  it('mount-canvas-builds-dom：把含 id 的 IR 挂成真实 <canvas> DOM', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, idIr);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(view.root).toBe(canvas);
  });

  it('mount-canvas-bitmap-dpr：名义尺寸 × dpr 开位图（dpr=2 → 位图 = 2×CSS）', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, idIr, { width: 200, height: 150 });
    // 名义 200×150、dpr=2 → 位图 400×300
    expect(view.root.width).toBe(400);
    expect(view.root.height).toBe(300);
    expect(view.root.style.width).toBe('200px');
    expect(view.root.style.height).toBe('150px');
  });

  it('mount-canvas-draws-scene：渲染链路被走（drawScene 的 setTransform 被调）', () => {
    const container = document.createElement('div');
    mountCanvas(container, idIr, { width: 100, height: 100 });
    expect(recorded).toContain('setTransform');
  });

  it('mount-canvas-fallback-size：未给数值尺寸 → 位图回退内容边界 × dpr、且为正整数', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, idIr);
    expect(view.root.width).toBeGreaterThan(0);
    expect(view.root.height).toBeGreaterThan(0);
    expect(Number.isInteger(view.root.width)).toBe(true);
    expect(Number.isInteger(view.root.height)).toBe(true);
  });

  it('mount-canvas-dispose：dispose 后 canvas 移除、再调不抛', () => {
    const container = document.createElement('div');
    const view = mountCanvas(container, idIr);
    expect(container.querySelector('canvas')).not.toBeNull();
    view.dispose();
    expect(container.querySelector('canvas')).toBeNull();
    expect(() => view.dispose()).not.toThrow();
  });

  it('mount-canvas-null-container：非 Element 容器 → 可诊断 throw', () => {
    expect(() => mountCanvas(null as never, idIr)).toThrow(/container/i);
  });

  // W17 / W23：Figure 也有交互式 mountCanvas，且 standalone mountCanvas 收 Figure 时 delegate 给它（与 mountSvg→figure.mount 对称）
  it('figure-mountCanvas：Figure.mountCanvas 挂出交互式 CanvasView（hydrate / update / clientToScene）', () => {
    const container = document.createElement('div');
    const fig = figure({ width: 100, height: 100 }, [
      node('a', { position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, fill: '#0a0' }),
    ]);
    const view = fig.mountCanvas(container);
    expect(view.root).toBeInstanceOf(HTMLCanvasElement);
    expect(typeof view.hydrate).toBe('function');
    expect(typeof view.clientToScene).toBe('function');
    expect(container.querySelector('canvas')).toBe(view.root);
  });

  it('mount-canvas-figure-delegates：standalone mountCanvas 收 Figure → delegate figure.mountCanvas', () => {
    const container = document.createElement('div');
    const fig = figure({ width: 100, height: 100 }, [
      node('a', { position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20 }),
    ]);
    const view = mountCanvas(container, fig);
    expect(view.root).toBeInstanceOf(HTMLCanvasElement);
    expect(container.querySelector('canvas')).toBe(view.root);
  });
});
