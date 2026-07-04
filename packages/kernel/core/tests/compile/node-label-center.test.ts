import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextPrim } from '../../src/contract';
import type { IR } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { ASCENT_FACTOR, DESCENT_FACTOR } from '../../src/compile/text';

const collectTexts = (prims: Array<ScenePrimitive>): Array<TextPrim> => {
  const out: Array<TextPrim> = [];
  for (const p of prims) {
    if (p.type === 'text') out.push(p);
    if (p.type === 'group') out.push(...collectTexts(p.children));
  }
  return out;
};

const visualMiddle = (t: TextPrim): number => t.y - (t.fontSize * ASCENT_FACTOR - t.fontSize * DESCENT_FACTOR) / 2;

describe('Node label position center', () => {
  it('draws the label at the node center', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [20, 30],
          text: 'A',
          label: { text: 'center label', position: 'center', distance: 100 },
        },
      ],
    };

    const scene = compileToScene(ir);
    const label = collectTexts(scene.primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'center label'),
    );

    expect(label).toBeDefined();
    expect(label?.x).toBeCloseTo(20);
    expect(visualMiddle(label!)).toBeCloseTo(30);
  });
});
