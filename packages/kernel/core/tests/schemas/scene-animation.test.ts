import { describe, expect, it } from 'vitest';

import { AnimationTrackSchema } from '../../src/schemas';

describe('动画关键帧的作者顺序', () => {
  it('接受相同时间的多帧，并保持该时刻的作者顺序', () => {
    const track = {
      property: 'translateX',
      duration: 100,
      keyframes: [
        { at: 0, value: 0 },
        { at: 0.5, value: 20 },
        { at: 0.5, value: 30 },
        { at: 1, value: 40 },
      ],
    };

    expect(AnimationTrackSchema.parse(track)).toEqual(track);
  });

  it('拒绝时间倒序并定位到轨道的关键帧集合', () => {
    const result = AnimationTrackSchema.safeParse({
      property: 'translateX',
      duration: 100,
      keyframes: [
        { at: 1, value: 10 },
        { at: 0, value: 0 },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ['keyframes'] }));
  });
});
