import { describe, expect, it } from 'vitest';
import type { Transform } from '@retikz/core';
import { buildTransform } from '../../src/render/transform-builder';

describe('buildTransform: 单 kind', () => {
  it('translate → "translate(x y)"', () => {
    const transforms: Array<Transform> = [{ kind: 'translate', x: 10, y: 20 }];
    expect(buildTransform(transforms)).toBe('translate(10 20)');
  });

  it('rotate 不带 cx/cy → "rotate(deg)"', () => {
    const transforms: Array<Transform> = [{ kind: 'rotate', degrees: 30 }];
    expect(buildTransform(transforms)).toBe('rotate(30)');
  });

  it('rotate 带 cx/cy → "rotate(deg cx cy)"', () => {
    const transforms: Array<Transform> = [
      { kind: 'rotate', degrees: 30, cx: 5, cy: 10 },
    ];
    expect(buildTransform(transforms)).toBe('rotate(30 5 10)');
  });

  it('scale 带 y → "scale(x y)"', () => {
    const transforms: Array<Transform> = [{ kind: 'scale', x: 2, y: 3 }];
    expect(buildTransform(transforms)).toBe('scale(2 3)');
  });

  it('scale 缺省 y → 等比 "scale(x x)"', () => {
    const transforms: Array<Transform> = [{ kind: 'scale', x: 2 }];
    expect(buildTransform(transforms)).toBe('scale(2 2)');
  });
});

describe('buildTransform: 多 kind 组合', () => {
  it('translate + rotate → 顺序拼接（与 SVG transform 列表语义一致）', () => {
    const transforms: Array<Transform> = [
      { kind: 'translate', x: 10, y: 20 },
      { kind: 'rotate', degrees: 30 },
    ];
    expect(buildTransform(transforms)).toBe('translate(10 20) rotate(30)');
  });

  it('rotate + scale 顺序', () => {
    const transforms: Array<Transform> = [
      { kind: 'rotate', degrees: 30, cx: 0, cy: 0 },
      { kind: 'scale', x: 2, y: 2 },
    ];
    expect(buildTransform(transforms)).toBe('rotate(30 0 0) scale(2 2)');
  });

  it('数组顺序决定输出顺序（不重排）', () => {
    const a: Array<Transform> = [
      { kind: 'translate', x: 1, y: 2 },
      { kind: 'scale', x: 2 },
    ];
    const b: Array<Transform> = [
      { kind: 'scale', x: 2 },
      { kind: 'translate', x: 1, y: 2 },
    ];
    expect(buildTransform(a)).toBe('translate(1 2) scale(2 2)');
    expect(buildTransform(b)).toBe('scale(2 2) translate(1 2)');
  });
});

describe('buildTransform: 边界 / 错误路径', () => {
  it('空数组 → undefined（不输出 transform 属性的信号）', () => {
    expect(buildTransform([])).toBeUndefined();
  });

  it('undefined 入参 → undefined', () => {
    expect(buildTransform(undefined)).toBeUndefined();
  });

  it('未识别 kind 抛错（exhaustive switch 防御）', () => {
    const bad = [
      { kind: 'unknown', x: 0, y: 0 } as unknown as Transform,
    ];
    expect(() => buildTransform(bad)).toThrow();
  });

  it('round 函数透传', () => {
    const transforms: Array<Transform> = [
      { kind: 'translate', x: 1.234, y: 2.345 },
      { kind: 'rotate', degrees: 30.5678 },
    ];
    const r = (n: number) => Math.round(n * 10) / 10;
    expect(buildTransform(transforms, r)).toBe('translate(1.2 2.3) rotate(30.6)');
  });
});
