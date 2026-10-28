import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import { DEFAULT_LABEL_DISTANCE } from '../../src/compile/constants';
import type { ScenePrimitive, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

const collectTexts = (prims: Array<ScenePrimitive>): Array<TextPrimitive> => {
  const out: Array<TextPrimitive> = [];

  for (const p of prims) {
    if (p.type === 'text') out.push(p);
    if (p.type === 'group') out.push(...collectTexts(p.children));
  }

  return out;
};

const visualMiddle = (t: TextPrimitive): number => t.y;

describe('Node 标签位置中心', () => {
  it('在节点中心绘制标签', () => {
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

    const scene = compileToScene(ir).scene;
    const label = collectTexts(scene.primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'center label'),
    );

    expect(label).toBeDefined();
    expect(label?.x).toBeCloseTo(20);
    expect(visualMiddle(label!)).toBeCloseTo(30);
  });

  it('省略标签距离时使用 CompileOptions.labelDistance', () => {
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

    const defaultLabel = collectTexts(compileToScene(ir).scene.primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'right label'),
    );
    const customDistance = 40;
    const customLabel = collectTexts(compileToScene(ir, { labelDistance: customDistance }).scene.primitives).find(t =>
      t.lines.some(l => (typeof l === 'string' ? l : l.text) === 'right label'),
    );

    expect(defaultLabel).toBeDefined();
    expect(customLabel).toBeDefined();
    expect(customLabel!.x - defaultLabel!.x).toBeCloseTo(customDistance - DEFAULT_LABEL_DISTANCE);
  });
});
