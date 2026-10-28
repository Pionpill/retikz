import { describe, expect, it } from 'vitest';

import { BoundaryLabelSchema, NodeLabelSchema } from '../../src';

describe('边界标签共享 schema', () => {
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

  it('共享所有旋转选择并保留仅限边界的限制', () => {
    for (const rotate of ['none', 'radial', 'tangent', 30]) {
      expect(BoundaryLabelSchema.safeParse({ text: 'label', rotate }).success).toBe(true);
      expect(NodeLabelSchema.safeParse({ text: 'label', rotate }).success).toBe(true);
    }

    expect(BoundaryLabelSchema.safeParse({ text: 'label', position: 'right' }).success).toBe(false);
    expect(BoundaryLabelSchema.safeParse({ text: 'label', distance: -1 }).success).toBe(false);
  });
});
