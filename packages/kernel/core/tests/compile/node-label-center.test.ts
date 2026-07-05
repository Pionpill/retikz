import { describe, expect, it } from 'vitest';

import type { ScenePrimitive, TextPrim } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { DEFAULT_LABEL_DISTANCE } from '../../src/compile/constants';
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
    const ir: IRScene = {
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

  it('uses CompileOptions.labelDistance when label distance is omitted', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
          label: { text: 'right label', position: 'right' },
        },
      ],
    };

    const defaultLabel = collectTexts(compileToScene(ir).primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'right label'),
    );
    const customDistance = 40;
    const customLabel = collectTexts(compileToScene(ir, { labelDistance: customDistance }).primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'right label'),
    );

    expect(defaultLabel).toBeDefined();
    expect(customLabel).toBeDefined();
    expect(customLabel!.x - defaultLabel!.x).toBeCloseTo(customDistance - DEFAULT_LABEL_DISTANCE);
  });
});
