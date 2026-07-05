import type { BoundsRect } from '@retikz/math';

import { describe, expect, it } from 'vitest';

import type { AssertEqual, Scene } from '../../src';

import { computeLayout } from '../../src';
import { createRound } from '../../src/compile/scene';

describe('layout public API', () => {
  it('exports computeLayout and uses BoundsRect for Scene.layout', () => {
    const layout = computeLayout(
      [
        [0, 0],
        [10, 20],
      ],
      5,
      createRound(2),
    );
    const _assertLayout: AssertEqual<Scene['layout'], BoundsRect> = true;
    void _assertLayout;

    expect(layout).toEqual({ x: -5, y: -5, width: 20, height: 30 });
  });
});
