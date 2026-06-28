import type { SceneResource } from '@retikz/core';

import { type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { PaintDefs } from '../../src/render/paint-defs';

type AnyEl = ReactElement<Record<string, unknown> & { children?: unknown }>;

const childrenOf = (resources: Array<SceneResource>): Array<AnyEl> => {
  const frag = PaintDefs({ resources, idFor: id => `g-${id}` }) as AnyEl;
  return (frag.props.children as Array<AnyEl>).filter(Boolean);
};

describe('PaintDefs conicGradient', () => {
  it('materializes a conic gradient as an objectBoundingBox pattern', () => {
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

    expect(pattern.type).toBe('pattern');
    expect(pattern.props.id).toBe('g-paint-1');
    expect(pattern.props.patternUnits).toBe('objectBoundingBox');
    expect(pattern.props.patternContentUnits).toBe('objectBoundingBox');

    const wedges = (pattern.props.children as Array<AnyEl>).filter(Boolean);
    expect(wedges.length).toBe(360);
    expect(wedges[0].type).toBe('path');
    expect(typeof wedges[0].props.d).toBe('string');
    expect(wedges[0].props.stroke).toBeUndefined();
  });
});
