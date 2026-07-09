import { describe, expect, it } from 'vitest';

import { sceneFitMatrix } from '../../src/canvas/shared';

describe('sceneFitMatrix', () => {
  const layout = { x: 0, y: 0, width: 100, height: 100 };

  it('centers content when the viewport is wider than the scene', () => {
    expect(sceneFitMatrix(layout, 200, 100, 1)).toEqual([1, 0, 0, 1, 50, 0]);
  });

  it('scales translation and scale by devicePixelRatio', () => {
    expect(sceneFitMatrix(layout, 200, 100, 2)).toEqual([2, 0, 0, 2, 100, 0]);
  });

  it('accounts for a shifted scene origin', () => {
    expect(sceneFitMatrix({ x: 10, y: 0, width: 100, height: 100 }, 100, 100, 1)).toEqual([1, 0, 0, 1, -10, 0]);
  });
});
