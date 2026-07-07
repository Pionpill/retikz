import type { ClipShape } from '@retikz/core';

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

describe('canvas clip path shapes', () => {
  it('applies path clip commands with fillRule', () => {
    const ctx = createContext();
    const shape: ClipShape = {
      kind: 'path',
      fillRule: 'evenodd',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 0] },
        { kind: 'line', to: [10, 10] },
        { kind: 'close' },
      ],
    };
    applyClip(ctx, shape);
    expect(ctx.calls.map(call => call.name)).toEqual(['beginPath', 'moveTo', 'lineTo', 'lineTo', 'closePath', 'clip']);
    expect(ctx.calls.at(-1)).toEqual({ name: 'clip', args: ['evenodd'] });
  });

  it('applies compound clip as one accumulated path', () => {
    const ctx = createContext();
    const shape: ClipShape = {
      kind: 'compound',
      children: [
        { kind: 'rect', x: 0, y: 0, width: 20, height: 20 },
        {
          kind: 'path',
          commands: [{ kind: 'move', to: [5, 5] }, { kind: 'line', to: [15, 5] }, { kind: 'close' }],
        },
      ],
    };
    applyClip(ctx, shape);
    expect(ctx.calls.map(call => call.name)).toEqual(['beginPath', 'rect', 'moveTo', 'lineTo', 'closePath', 'clip']);
  });
});
