import { describe, expect, it } from 'vitest';

import type { InspectionPlane } from '../../src';

import { inspectionPlaneToReadonlyLayers } from '../../src/render';

describe('Inspection plane Render adapter', () => {
  it('maps entries one-to-one with stable keys and unchanged Scene/transform references', () => {
    const scene = { primitives: [], layout: { x: 0, y: 0, width: 0, height: 0 } };
    const transform = [1, 0, 0, 1, 4, 5] as const;
    const plane: InspectionPlane = {
      entries: [
        {
          inspector: { namespace: 'test', type: 'points' },
          owner: { kind: 'pathKind', name: 'stroke' },
          occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
          colorScope: 0,
          scene,
          transform,
        },
      ],
    };
    const layers = inspectionPlaneToReadonlyLayers(plane);
    expect(layers).toHaveLength(1);
    expect(layers[0]?.key).toBe('inspect:test/points:0');
    expect(layers[0]?.scene).toBe(scene);
    expect(layers[0]?.transform).toBe(transform);
    expect(Object.isFrozen(layers)).toBe(true);
  });

  it('returns a frozen empty list for a null plane', () => {
    const layers = inspectionPlaneToReadonlyLayers(null);
    expect(layers).toEqual([]);
    expect(Object.isFrozen(layers)).toBe(true);
  });
});
