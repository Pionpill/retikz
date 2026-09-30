import { describe, expect, it } from 'vitest';

import { BoundaryLabelSchema, NodeLabelSchema } from '../../src';

describe('Boundary label shared schema', () => {
  it('owns defaults without materializing them in Node source labels', () => {
    expect(BoundaryLabelSchema.parse({ text: 'label' })).toMatchObject({
      rotate: 'none',
      keepUpright: false,
      placement: 'outside',
      distance: 4,
      align: 'middle',
    });
    expect(NodeLabelSchema.parse({ text: 'label' })).toEqual({ text: 'label' });
  });
  it('shares all rotation choices and preserves boundary-only restrictions', () => {
    for (const rotate of ['none', 'radial', 'tangent', 30]) {
      expect(BoundaryLabelSchema.safeParse({ text: 'label', rotate }).success).toBe(true);
      expect(NodeLabelSchema.safeParse({ text: 'label', rotate }).success).toBe(true);
    }
    expect(BoundaryLabelSchema.safeParse({ text: 'label', position: 'right' }).success).toBe(false);
    expect(BoundaryLabelSchema.safeParse({ text: 'label', distance: -1 }).success).toBe(false);
  });
});
