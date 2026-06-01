import { describe, expect, it } from 'vitest';
import { buildPathD } from '../../src/render/path-d-builder';
import { buildTransform } from '../../src/render/transform-builder';
import type { PathCommand, Transform } from '@retikz/core';

describe('buildPathD throw message contract', () => {
  it('未知 PathCommand kind → throw + message 含 kind 字面量', () => {
    const bad = { kind: 'unknown-kind' } as unknown as PathCommand;
    expect(() => buildPathD([bad])).toThrow(/unknown PathCommand kind/);
    expect(() => buildPathD([bad])).toThrow(/unknown-kind/);
  });

  it('合法 kind 之间混入未知 kind → 仍能抛出含具体 kind 的 error', () => {
    const cmds: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'mystery-shape' } as unknown as PathCommand,
    ];
    expect(() => buildPathD(cmds)).toThrow(/mystery-shape/);
  });
});

describe('buildTransform throw message contract', () => {
  it('未知 Transform kind → throw + message 含 kind 字面量', () => {
    const bad = { kind: 'skew' } as unknown as Transform;
    expect(() => buildTransform([bad])).toThrow(/unknown Transform kind/);
    expect(() => buildTransform([bad])).toThrow(/skew/);
  });
});
