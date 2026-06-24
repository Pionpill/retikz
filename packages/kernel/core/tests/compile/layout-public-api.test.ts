import { describe, expect, it } from 'vitest';
import {
  type AssertEqual,
  type Layout,
  type Scene,
  computeLayout,
} from '../../src';
import { createRound } from '../../src/compile/precision';

describe('Layout public API', () => {
  it('exports Layout and computeLayout from package entry', () => {
    const layout = computeLayout([[0, 0], [10, 20]], 5, createRound(2));
    const _assertLayout: AssertEqual<Scene['layout'], Layout> = true;
    void _assertLayout;

    expect(layout).toEqual({ x: -5, y: -5, width: 20, height: 30 });
  });
});
