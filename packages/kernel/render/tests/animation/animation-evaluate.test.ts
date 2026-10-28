import type { IRAnimationTrack } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { evaluateTrack } from '../../src/animation/evaluate';

/**
 * 共享插值引擎 evaluateTrack：数值 / 颜色 oklch / viewBox 分量插值；delay / iteration / direction / fill；
 *   活动区间外返回 null（caller 用 base）
 */
const num = (
  over: Partial<
    Extract<IRAnimationTrack, { property: 'translateX' | 'translateY' | 'rotate' | 'scale' | 'scaleX' | 'scaleY' }>
  > = {},
): IRAnimationTrack => ({
  property: 'translateX',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 100 },
  ],
  duration: 400,
  ...over,
});

describe('数值线性 + easing', () => {
  it('同一时间的多帧取最后一帧作为该时刻的值', () => {
    const repeated: IRAnimationTrack = {
      property: 'translateX',
      duration: 100,
      keyframes: [
        { at: 0, value: 0 },
        { at: 0, value: 10 },
        { at: 0.5, value: 20 },
        { at: 0.5, value: 30 },
        { at: 1, value: 40 },
      ],
    };
    expect(evaluateTrack(repeated, 0)?.value).toBe(10);
    expect(evaluateTrack(repeated, 50)?.value).toBe(30);
  });
  it('受限数值会限幅，普通位移仍保留回弹，镜头宽高保持正数', () => {
    const opacity: IRAnimationTrack = {
      property: 'opacity',
      duration: 400,
      easing: [0.34, 1.56, 0.64, 1],
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
    };
    const width: IRAnimationTrack = {
      property: 'strokeWidth',
      duration: 400,
      easing: [0.34, 1.56, 0.64, 1],
      keyframes: [
        { at: 0, value: 1 },
        { at: 1, value: 0 },
      ],
    };
    const camera: IRAnimationTrack = {
      property: 'viewBox',
      duration: 400,
      easing: [0.34, 1.56, 0.64, 1],
      keyframes: [
        { at: 0, value: [0, 0, 100, 100] },
        { at: 1, value: [0, 0, 1, 1] },
      ],
    };
    expect(evaluateTrack(opacity, 200)?.value).toBe(1);
    expect(evaluateTrack(width, 200)?.value).toBe(0);
    expect(evaluateTrack(camera, 200)?.value).toEqual([0, 0, 1, 1]);
    expect(Number(evaluateTrack({ ...opacity, property: 'translateX' }, 200)?.value)).toBeGreaterThan(1);
  });
  it('贝塞尔四元组保持线性曲线的求值结果', () => {
    expect(evaluateTrack(num({ easing: [0, 0, 1, 1] }), 200)?.value).toBeCloseTo(50);
  });
  it('t=0 / 中点 / 末尾线性求值', () => {
    expect(evaluateTrack(num(), 0)?.value).toBe(0);
    expect(evaluateTrack(num(), 200)?.value).toBe(50);
    expect(evaluateTrack(num(), 400)?.value).toBe(100); // forwards 默认 → 末帧
  });

  it('ease-out 中点输出 > 线性（前快）', () => {
    const eased = evaluateTrack(num({ easing: 'ease-out' }), 200)?.value as number;

    expect(eased).toBeGreaterThan(50);
  });
});

describe('颜色 oklch + viewBox 分量', () => {
  it('fill 颜色中点 = 合法 hex，且异于两端', () => {
    const track: IRAnimationTrack = {
      property: 'fill',
      keyframes: [
        { at: 0, value: '#ff0000' },
        { at: 1, value: '#0000ff' },
      ],
      duration: 400,
    };
    const mid = evaluateTrack(track, 200)?.value as string;

    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
    expect(mid).not.toBe('#ff0000');
    expect(mid).not.toBe('#0000ff');
  });

  it('viewBox 4 元组分量线性', () => {
    const track: IRAnimationTrack = {
      property: 'viewBox',
      keyframes: [
        { at: 0, value: [0, 0, 100, 100] },
        { at: 1, value: [10, 10, 50, 50] },
      ],
      duration: 400,
    };

    expect(evaluateTrack(track, 200)?.value).toEqual([5, 5, 75, 75]);
  });
});

describe('迭代/方向/填充', () => {
  it('iterations infinite + alternate 折返取值', () => {
    const spin: IRAnimationTrack = {
      property: 'rotate',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 360 },
      ],
      duration: 1000,
      iterations: 'infinite',
      direction: 'alternate',
    };

    expect(evaluateTrack(spin, 250)?.value).toBeCloseTo(90); // iter0 正向 0.25
    expect(evaluateTrack(spin, 1250)?.value).toBeCloseTo(270); // iter1 反向 → p=0.75
  });

  it('fill forwards 末帧停；fill none 活动区间后 → null', () => {
    expect(evaluateTrack(num({ fill: 'forwards' }), 1000)?.value).toBe(100);
    expect(evaluateTrack(num({ fill: 'none' }), 1000)).toBeNull();
  });

  it('delay 前：forwards → null；backwards → 首帧', () => {
    expect(evaluateTrack(num({ delay: 100 }), 50)).toBeNull();
    expect(evaluateTrack(num({ delay: 100, fill: 'backwards' }), 50)?.value).toBe(0);
  });
});
