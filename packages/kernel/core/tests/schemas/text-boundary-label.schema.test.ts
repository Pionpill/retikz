import { describe, expect, it } from 'vitest';

import { BoundaryLabelSchema, NodeLabelSchema } from '../../src';

describe('边界标签共享 schema', () => {
  it('拥有默认值，但没有在 Node 源标签中具体化它们', () => {
    expect(BoundaryLabelSchema.parse({ text: 'label' })).toMatchObject({
      rotate: 'none',
      keepUpright: false,
      placement: 'outside',
      distance: 4,
      align: 'middle',
    });
    expect(NodeLabelSchema.parse({ text: 'label' })).toEqual({ text: 'label' });
  });
});
