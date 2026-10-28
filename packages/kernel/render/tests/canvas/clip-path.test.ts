import type { SceneClipPath } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { applyClip } from '../../src/canvas/path-geometry';

type Call = { name: string; args: Array<unknown> };

const createContext = (): CanvasRenderingContext2D & { calls: Array<Call> } => {
  const calls: Array<Call> = [];
  const record =
    (name: string) =>
    (...args: Array<unknown>): void => {
      calls.push({ name, args });
    };

  return {
    calls,
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    quadraticCurveTo: record('quadraticCurveTo'),
    bezierCurveTo: record('bezierCurveTo'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    rect: record('rect'),
    closePath: record('closePath'),
    clip: record('clip'),
  } as unknown as CanvasRenderingContext2D & { calls: Array<Call> };
};

describe('画布规范裁剪路径', () => {
  it('使用 fillRule 应用路径裁剪命令', () => {
    const ctx = createContext();
    const path: SceneClipPath = {
      fillRule: 'evenodd',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
        { kind: 'line', to: [10, 10] },
        { kind: 'close' },
      ],
    };
    applyClip(ctx, path);

    expect(ctx.calls.map(call => call.name)).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'closePath', 'clip']);
    expect(ctx.calls.at(-1)).toEqual({ name: 'clip', args: ['evenodd'] });
  });

  it('应用具有一种规范填充规则的累积子路径', () => {
    const ctx = createContext();
    const path: SceneClipPath = {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [20, 0] },
        { kind: 'line', to: [20, 20] },
        { kind: 'line', to: [0, 20] },
        { kind: 'close' },
        { kind: 'move', to: [5, 5] },
        { kind: 'line', to: [15, 5] },
        { kind: 'close' },
      ],
      fillRule: 'nonzero',
    };
    applyClip(ctx, path);

    expect(ctx.calls.map(call => call.name)).toEqual([
      'beginPath',
      'moveTo',
      'lineTo',
      'lineTo',
      'lineTo',
      'closePath',
      'moveTo',
      'lineTo',
      'closePath',
      'clip',
    ]);
    expect(ctx.calls.at(-1)).toEqual({ name: 'clip', args: ['nonzero'] });
  });

  it('关闭后在声明的弧起点处使用新的 moveTo 开始弧', () => {
    const ctx = createContext();
    const path: SceneClipPath = {
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [1, 0] },
        { kind: 'close' },
        { kind: 'arc', center: [5, 5], radius: 2, startAngle: 0, endAngle: 180 },
      ],
      fillRule: 'nonzero',
    };

    applyClip(ctx, path);

    expect(ctx.calls.map(call => call.name)).toEqual([
      'beginPath',
      'moveTo',
      'lineTo',
      'closePath',
      'moveTo',
      'arc',
      'clip',
    ]);
    expect(ctx.calls[4]).toEqual({ name: 'moveTo', args: [7, 5] });
  });
});
