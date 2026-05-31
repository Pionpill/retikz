// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { figure } from '../src/builder/figure';
import { node } from '../src/builder/node';

/** 录制型 fake 2d context：只验 Figure.toCanvas 把编译好的 Scene 喂进 canvas renderer（不验像素） */
const makeFakeCanvas = (width = 200, height = 150): HTMLCanvasElement => {
  const calls: string[] = [];
  const ctx = new Proxy(
    { canvas: null as unknown, fillStyle: '#000', strokeStyle: '#000' } as Record<string | symbol, unknown>,
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args: unknown[]) => {
          calls.push(String(prop));
          void args;
        };
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  const canvas = {
    width,
    height,
    getContext: (kind: string) => (kind === '2d' ? ctx : null),
    __calls: calls,
  } as unknown as HTMLCanvasElement;
  return canvas;
};

describe('@retikz/vanilla Figure.toCanvas', () => {
  it('to-canvas-renders：编译 ir → Scene 并喂给 canvas renderer（setTransform 被调）', () => {
    const canvas = makeFakeCanvas();
    const fig = figure({ width: 200, height: 150 }, [
      node('a', { position: [0, 0], shape: 'rectangle', minimumWidth: 40, minimumHeight: 20, fill: '#0a0' }),
    ]);
    expect(() => fig.toCanvas(canvas)).not.toThrow();
    const calls = (canvas as unknown as { __calls: string[] }).__calls;
    expect(calls).toContain('setTransform');
  });

  it('to-canvas-no-context-throws：getContext 返回 null → 可诊断 throw', () => {
    const canvas = { width: 10, height: 10, getContext: () => null } as unknown as HTMLCanvasElement;
    const fig = figure({}, [node('a', { position: [0, 0], text: 'A' })]);
    expect(() => fig.toCanvas(canvas)).toThrow(/context/i);
  });
});
