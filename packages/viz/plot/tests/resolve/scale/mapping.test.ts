import { resolveScale } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { domainPaddingScaleOf } from '../../../src/resolve/scale/mapping';

describe('Plot scale padding', () => {
  it('连续留白在非钳位参数空间扩域，重建保留原映射', () => {
    const mapping = resolveScale(
      { type: 'linear', domain: [0, 10], range: [0, 100], params: { clamp: true } },
      { values: [] },
    );
    const padding = domainPaddingScaleOf(mapping, 'test', { continuity: 'continuous', allowsBaseline: true });
    expect(padding.normalize(20)).toBe(2);
    const padded = padding.createScale({ lower: 0.1, upper: 0.1 }, [0, 100]);
    expect(padded.coordinate(0)).toBeCloseTo(10);
    expect(padded.coordinate(10)).toBeCloseTo(90);
    expect(mapping.map(0)).toBe(0);
    padded.setRange([0, 200]);
    expect(padded.coordinate(0)).toBeCloseTo(20);
  });

  it('平方根留白保留非负域和屏幕外缘', () => {
    const mapping = resolveScale({ type: 'sqrt', domain: [0, 100], range: [0, 100] }, { values: [] });
    const padded = domainPaddingScaleOf(mapping, 'test', {
      continuity: 'continuous',
      allowsBaseline: false,
    }).createScale({ lower: 0.1, upper: 0.1 }, [0, 100]);
    expect(padded.domain()[0]).toBe(0);
    expect(padded.coordinate(0)).toBeCloseTo(10);
    expect(padded.coordinate(100)).toBeCloseTo(90);
    padded.setRange([0, 200]);
    expect(padded.coordinate(0)).toBeCloseTo(20);
  });

  it('径向留白在面积参数空间求解', () => {
    const mapping = resolveScale({ type: 'radial', domain: [0, 100], range: [0, 100] }, { values: [] });
    const padding = domainPaddingScaleOf(mapping, 'test', {
      continuity: 'continuous',
      allowsBaseline: true,
      padding: 'radial',
    });
    expect(padding.normalize(25)).toBe(0.25);
    expect(padding.parameter?.(50, [0, 100])).toBe(0.25);
    expect(padding.createScale({ lower: 0.1, upper: 0.1 }, [0, 100]).coordinate(0)).toBeCloseTo(Math.sqrt(1000));
  });

  it('时间留白保留亚毫秒投影精度和 UTC 刻度语义', () => {
    const mapping = resolveScale({ type: 'time', domain: [0, 1], range: [0, 100] }, { values: [] });
    const padded = domainPaddingScaleOf(mapping, 'test', {
      continuity: 'continuous',
      allowsBaseline: true,
      tickKind: 'time',
    }).createScale({ lower: 0.1, upper: 0.1 }, [0, 100]);
    expect(padded.domain()).toEqual([-0.125, 1.125]);
    expect(padded.coordinate(0)).toBeCloseTo(10);
    expect(padded.coordinate(1)).toBeCloseTo(90);
    expect(padded.tickKind).toBe('time');
  });

  it('分类留白改变范围与带宽，不增加类别', () => {
    const mapping = resolveScale({ type: 'band', domain: ['a', 'b'], range: [0, 100] }, { values: [] });
    const padded = domainPaddingScaleOf(mapping, 'test', { continuity: 'discrete', allowsBaseline: true }).createScale(
      { lower: 0.1, upper: 0.1 },
      [0, 100],
    );
    expect(padded.domain()).toEqual(['a', 'b']);
    expect(padded.coordinate('a')).toBe(30);
    expect(padded.bandwidth).toBe(40);
  });
});
