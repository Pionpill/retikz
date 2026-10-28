import { describe, expect, it } from 'vitest';

import { sceneFitMatrix } from '../../src/canvas/internal';

describe('sceneFitMatrix', () => {
  const layout = { x: 0, y: 0, width: 100, height: 100 };

  it('当视口比场景宽时，内容居中', () => {
    expect(sceneFitMatrix(layout, 200, 100, 1)).toEqual([1, 0, 0, 1, 50, 0]);
  });

  it('按 devicePixelRatio 缩放平移和缩放', () => {
    expect(sceneFitMatrix(layout, 200, 100, 2)).toEqual([2, 0, 0, 2, 100, 0]);
  });

  it('考虑了移动的场景原点', () => {
    expect(sceneFitMatrix({ x: 10, y: 0, width: 100, height: 100 }, 100, 100, 1)).toEqual([1, 0, 0, 1, -10, 0]);
  });
});
