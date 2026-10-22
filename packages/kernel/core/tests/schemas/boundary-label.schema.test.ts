import { describe, expect, it } from 'vitest';

import { BoundaryLabelSchema, NodeLabelSchema } from '../../src';

describe('Boundary label shared schema', () => {
  it('标签引线保留零线宽、非负虚线长度和负相位偏移', () => {
    const label = {
      text: 'label',
      pin: { strokeWidth: 0, dashPattern: [0, 2], dashOffset: -1, stroke: 0.5 },
    };
    expect(NodeLabelSchema.parse(label)).toEqual(label);
    expect(NodeLabelSchema.parse({ text: 'label', pin: {} })).toEqual({ text: 'label', pin: {} });
  });

  it.each([{ strokeWidth: -1 }, { dashPattern: [] }, { dashPattern: [-1, 2] }])('标签引线拒绝无效描边参数 %j', pin => {
    expect(NodeLabelSchema.safeParse({ text: 'label', pin }).success).toBe(false);
  });

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
