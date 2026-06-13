import { describe, expect, it } from 'vitest';
import {
  FontSchema,
  OffsetPositionSchema,
  PolarPositionSchema,
  PositionSchema,
  SceneSchema,
} from '../../src/ir';

describe('[cross-test] IR JSON 可序列化契约', () => {
  it('笛卡尔坐标拒绝 Infinity / -Infinity，避免 JSON round-trip 变成 null', () => {
    expect(PositionSchema.safeParse([Infinity, 0]).success).toBe(false);
    expect(PositionSchema.safeParse([0, -Infinity]).success).toBe(false);
  });

  it('极坐标 angle / radius 拒绝非有限数，避免 JSON round-trip 失真', () => {
    expect(PolarPositionSchema.safeParse({ angle: Infinity, radius: 10 }).success).toBe(false);
    expect(PolarPositionSchema.safeParse({ angle: 0, radius: Infinity }).success).toBe(false);
  });

  it('偏移定位 offset 拒绝非有限数，避免 compile 产出非有限 Scene 坐标', () => {
    expect(OffsetPositionSchema.safeParse({ of: [0, 0], offset: [Infinity, 0] }).success).toBe(false);
    expect(OffsetPositionSchema.safeParse({ of: [0, 0], offset: [0, -Infinity] }).success).toBe(false);
  });

  it('字体数值字段拒绝非有限数，避免 renderer 收到 Infinity 字号或字重', () => {
    expect(FontSchema.safeParse({ size: Infinity }).success).toBe(false);
    expect(FontSchema.safeParse({ weight: Infinity }).success).toBe(false);
  });

  it('顶层 SceneSchema 拒绝含非有限数值的 IR', () => {
    const result = SceneSchema.safeParse({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [Infinity, 0],
          text: 'A',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
