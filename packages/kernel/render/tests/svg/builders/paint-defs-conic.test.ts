import type { SceneResource } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { SvgNode } from '../../../src/svg';
import { renderPaintDefs } from './resource-fixtures';

const childrenOf = (resources: Array<SceneResource>): Array<SvgNode> => {
  return renderPaintDefs({ resources, idFor: id => `g-${id}` });
};

describe('renderPaintDefs 的 conicGradient 渲染', () => {
  it('将圆锥曲线具体化为 objectBoundingBox 图案', () => {
    const [pattern] = childrenOf([
      {
        kind: 'paint',
        id: 'paint-1',
        spec: {
          kind: 'conicGradient',
          center: [0.5, 0.5],
          angle: -90,
          stops: [
            { offset: 0, color: '#ff0' },
            { offset: 0.5, color: '#06c' },
            { offset: 1, color: '#f30' },
          ],
        },
      },
    ]);

    expect(pattern.tag).toBe('pattern');
    expect(pattern.attrs.id).toBe('g-paint-1');
    expect(pattern.attrs.patternUnits).toBe('objectBoundingBox');
    expect(pattern.attrs.patternContentUnits).toBe('objectBoundingBox');

    const wedges = (pattern.children as Array<SvgNode>).filter(Boolean);

    expect(wedges.length).toBe(360);
    expect(wedges[0].tag).toBe('path');
    expect(typeof wedges[0].attrs.d).toBe('string');
    expect(wedges[0].attrs.stroke).toBeUndefined();
  });
});
