import { describe, expect, it } from 'vitest';

import type { PathPrim, RectPrim, ScenePrimitive } from '../../src/contract';
import type { IR } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeDefaultSchema, NodeSchema, PathDefaultSchema, PathSchema } from '../../src/schemas';
import { flattenPrims } from '../helpers/flatten';

const strokePath = (dashOffset: unknown): unknown => ({
  type: 'path',
  dashPattern: [4, 2],
  dashOffset,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
});

const strokePathWithOnlyOffset = (dashOffset: unknown): unknown => ({
  type: 'path',
  dashOffset,
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },
  ],
});

const firstPath = (primitives: Array<ScenePrimitive>, stroke: string): PathPrim | undefined =>
  flattenPrims(primitives).find((p): p is PathPrim => p.type === 'path' && p.stroke === stroke);

const firstRect = (primitives: Array<ScenePrimitive>, id: string): RectPrim | undefined =>
  flattenPrims(primitives).find((p): p is RectPrim => p.type === 'rect' && p.id === id);

describe('stroke dash offset', () => {
  it('schema accepts finite positive/negative dashOffset and rejects non-finite values', () => {
    expect(PathSchema.safeParse(strokePath(-3)).success).toBe(true);
    expect(PathSchema.safeParse(strokePathWithOnlyOffset(0)).success).toBe(true);
    expect(PathSchema.safeParse(strokePath('3')).success).toBe(false);
    expect(PathSchema.safeParse(strokePath(Number.NaN)).success).toBe(false);
    expect(PathSchema.safeParse(strokePath(Number.POSITIVE_INFINITY)).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ dashOffset: -3 }).success).toBe(true);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], dashOffset: 2 }).success).toBe(true);
    expect(NodeDefaultSchema.safeParse({ dashOffset: 2 }).success).toBe(true);
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        label: { text: 'L', pin: { dashOffset: 1 } },
      }).success,
    ).toBe(true);
    expect(
      NodeSchema.safeParse({
        type: 'node',
        position: [0, 0],
        label: { text: 'L', pin: { dashOffset: Number.NEGATIVE_INFINITY } },
      }).success,
    ).toBe(false);
  });

  it('compile forwards dashOffset for path, node border, and label pin leader', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: '#123',
          dashPattern: [4, 2],
          dashOffset: -2,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        {
          type: 'node',
          id: 'box',
          position: [20, 0],
          dashPattern: [3, 1],
          dashOffset: 5,
        },
        {
          type: 'node',
          id: 'dashed',
          position: [60, 0],
          dashed: true,
        },
        {
          type: 'node',
          position: [40, 0],
          label: {
            text: 'L',
            distance: 16,
            pin: { stroke: '#456', dashPattern: [1, 1], dashOffset: 7 },
          },
        },
      ],
    };

    const scene = compileToScene(ir);

    expect(firstPath(scene.primitives, '#123')?.dashOffset).toBe(-2);
    expect(firstRect(scene.primitives, 'box')?.dashOffset).toBe(5);
    expect(firstPath(scene.primitives, '#456')?.dashOffset).toBe(7);
    expect(firstRect(scene.primitives, 'dashed')?.dashPattern).toEqual([4, 2]);
    expect(firstRect(scene.primitives, 'dashed')?.dashOffset).toBeUndefined();
  });
});
