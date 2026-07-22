import { describe, expect, it } from 'vitest';

import { FrameSchema } from '../../../src';

const node = { type: 'node', position: [0, 0], text: 'A' } as const;

describe('FrameSchema', () => {
  it('fills stable gap and border defaults and round-trips through JSON', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      children: [node],
    });

    expect(parsed).toMatchObject({ gap: 8, border: { stroke: 'currentColor', strokeWidth: 1 } });
    expect(FrameSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('accepts closed border style and arbitrary Core Node shapes', () => {
    const parsed = FrameSchema.parse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      gap: 0,
      border: { fill: '#fff', dashPattern: [4, 2], zIndex: -2 },
      label: 'Group',
      children: [{ type: 'node', position: [0, 0], shape: 'custom-shape', text: 'A' }],
    });

    expect(parsed.border).toEqual({
      stroke: 'currentColor',
      strokeWidth: 1,
      fill: '#fff',
      dashPattern: [4, 2],
      zIndex: -2,
    });
  });

  it('rejects empty identity, label, children, negative gap, and unsupported direct children precisely', () => {
    const invalidId = FrameSchema.safeParse({
      namespace: 'standard',
      type: 'frame',
      id: '',
      children: [node],
    });
    const invalidLabel = FrameSchema.safeParse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      label: '',
      children: [node],
    });
    const emptyChildren = FrameSchema.safeParse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      children: [],
    });
    const negativeGap = FrameSchema.safeParse({
      namespace: 'standard',
      type: 'frame',
      id: 'group',
      gap: -1,
      children: [node],
    });
    const unsupported = ['scope', 'path', 'coordinate', 'grid'].map(type =>
      FrameSchema.safeParse({
        namespace: 'standard',
        type: 'frame',
        id: 'group',
        children: [{ type, namespace: type === 'grid' ? 'standard' : undefined }],
      }),
    );

    expect(invalidId.success).toBe(false);
    expect(invalidLabel.success).toBe(false);
    expect(emptyChildren.success).toBe(false);
    expect(negativeGap.success).toBe(false);
    expect(unsupported.every(result => !result.success)).toBe(true);
    if (!invalidId.success) expect(invalidId.error.issues[0]?.path).toEqual(['id']);
    if (!invalidLabel.success) expect(invalidLabel.error.issues[0]?.path).toEqual(['label']);
    if (!emptyChildren.success) expect(emptyChildren.error.issues[0]?.path).toEqual(['children']);
    if (!negativeGap.success) expect(negativeGap.error.issues[0]?.path).toEqual(['gap']);
    unsupported.forEach(result => {
      if (!result.success) expect(result.error.issues[0]?.path[0]).toBe('children');
    });
  });
});
