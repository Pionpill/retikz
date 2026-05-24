/**
 * Paint schema 单元测试（alpha.7 ADR-01）
 * @description PaintSpecSchema（linear / radial gradient）+ GradientStopSchema；
 *   stops 最少 2、offset/opacity 0..1、angle/radius finite；纯 JSON 可序列化。
 */
import { describe, expect, it } from 'vitest';
import { PaintSpecSchema } from '../../src/ir';

describe('PaintSpecSchema — linear gradient', () => {
  it('接受 2 stops + angle', () => {
    const spec = {
      type: 'linearGradient' as const,
      angle: 90,
      stops: [
        { offset: 0, color: '#4f8' },
        { offset: 1, color: '#08f' },
      ],
    };
    expect(PaintSpecSchema.parse(spec)).toEqual(spec);
  });

  it('angle 可省（缺省方向由 compile 定）', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'linearGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).not.toThrow();
  });

  it('stop 支持 opacity 与 currentColor', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'linearGradient',
        stops: [
          { offset: 0, color: 'currentColor', opacity: 0.5 },
          { offset: 1, color: 'currentColor', opacity: 1 },
        ],
      }),
    ).not.toThrow();
  });
});

describe('PaintSpecSchema — radial gradient', () => {
  it('接受 2 stops（center / radius 可省）', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'radialGradient',
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'navy' },
        ],
      }),
    ).not.toThrow();
  });

  it('接受 center（objectBoundingBox 0..1）+ radius', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'radialGradient',
        center: [0.5, 0.5],
        radius: 0.75,
        stops: [
          { offset: 0, color: 'white' },
          { offset: 1, color: 'navy' },
        ],
      }),
    ).not.toThrow();
  });
});

describe('PaintSpecSchema — 错误路径', () => {
  it('stops 少于 2 被拒', () => {
    expect(() =>
      PaintSpecSchema.parse({ type: 'linearGradient', stops: [{ offset: 0, color: 'red' }] }),
    ).toThrow();
  });

  it('offset 越界被拒（< 0 / > 1）', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'linearGradient',
        stops: [
          { offset: -0.1, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
    expect(() =>
      PaintSpecSchema.parse({
        type: 'linearGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1.5, color: 'blue' },
        ],
      }),
    ).toThrow();
  });

  it('linear angle 非 finite 被拒', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'linearGradient',
        angle: Number.POSITIVE_INFINITY,
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });

  it('未知 type 被拒', () => {
    expect(() =>
      PaintSpecSchema.parse({
        type: 'conicGradient',
        stops: [
          { offset: 0, color: 'red' },
          { offset: 1, color: 'blue' },
        ],
      }),
    ).toThrow();
  });
});

describe('PaintSpecSchema — JSON 可序列化', () => {
  it('parse 结果 round-trip JSON 不丢失', () => {
    const spec = {
      type: 'radialGradient' as const,
      center: [0.5, 0.5] as [number, number],
      radius: 0.5,
      stops: [
        { offset: 0, color: 'white', opacity: 1 },
        { offset: 1, color: 'black', opacity: 0.8 },
      ],
    };
    const parsed = PaintSpecSchema.parse(spec);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });
});
