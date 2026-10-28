import { describe, expect, it } from 'vitest';

import type { PositionScale } from '../../../src/contract';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../../src/resolve/guide';

const scaleOf = (
  tickKind: PositionScale['tickKind'],
  domain: ReadonlyArray<string | number>,
  ticks: Array<string | number>,
): PositionScale => ({
  coordinate: value => (typeof value === 'number' ? value : domain.indexOf(value as string) * 10),
  domain: () => domain,
  bandwidth: 0,
  step: 0,
  ticks: count => {
    const values = count === undefined ? ticks : ticks.slice(0, count);
    return { values, labels: values.map(String) };
  },
  tickKind,
  range: () => [0, 100],
  setRange: () => {},
});

describe('resolveGuideTicks 间隔和密度', () => {
  it('数字间隔生成固定步长刻度', () => {
    const scale = scaleOf('number', [0, 50], [0, 25, 50]);
    const ticks = resolveGuideTicks(scale, { interval: { kind: 'number', step: 10 } });

    expect(ticks.values).toEqual([0, 10, 20, 30, 40, 50]);
    expect(ticks.labels).toEqual(['0', '10', '20', '30', '40', '50']);
  });

  it('时间间隔生成 utc 单位刻度', () => {
    const start = Date.UTC(2026, 0, 1);
    const end = Date.UTC(2026, 3, 1);
    const scale = scaleOf('time', [start, end], [start, end]);
    const ticks = resolveGuideTicks(scale, { interval: { kind: 'time', unit: 'month', step: 1 } }, { format: '%Y-%m' });

    expect(ticks.values).toEqual([
      Date.UTC(2026, 0, 1),
      Date.UTC(2026, 1, 1),
      Date.UTC(2026, 2, 1),
      Date.UTC(2026, 3, 1),
    ]);
    expect(ticks.labels).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
  });

  it('类别间隔从定义域类别中采样', () => {
    const scale = scaleOf('category', ['A', 'B', 'C', 'D', 'E'], ['A', 'B', 'C', 'D', 'E']);
    const ticks = resolveGuideTicks(scale, { interval: { kind: 'category', step: 2, offset: 1 } });

    expect(ticks.values).toEqual(['B', 'D']);
    expect(ticks.labels).toEqual(['B', 'D']);
  });

  it('刻度源优先级优先于值，然后是间隔，然后是计数', () => {
    const scale = scaleOf('number', [0, 100], [0, 50, 100]);

    expect(
      resolveGuideTicks(scale, { values: [7, 9], interval: { kind: 'number', step: 10 }, count: 1 }).values,
    ).toEqual([7, 9]);
    expect(resolveGuideTicks(scale, { interval: { kind: 'number', step: 25 }, count: 1 }).values).toEqual([
      0, 25, 50, 75, 100,
    ]);
  });

  it('按密度的最大数量和最小间距采样可见刻度', () => {
    const ticks = { values: [0, 5, 10, 15, 20, 25], labels: ['0', '5', '10', '15', '20', '25'] };

    expect(resolveVisibleGuideTicks(ticks, { density: { kind: 'sample', maxCount: 3 } }, Number).values).toHaveLength(
      3,
    );
    expect(resolveVisibleGuideTicks(ticks, { density: { kind: 'sample', minGap: 12 } }, Number).values).toEqual([
      0, 15, 25,
    ]);
  });

  it('间隔 kind 不匹配时明确报错', () => {
    const scale = scaleOf('number', [0, 10], [0, 10]);

    expect(() => resolveGuideTicks(scale, { interval: { kind: 'time', unit: 'day' } })).toThrow(
      /time guide tick interval/,
    );
  });

  it('间隔生成具有候选数量上限', () => {
    const scale = scaleOf('number', [0, 20_000], [0, 20_000]);

    expect(() => resolveGuideTicks(scale, { interval: { kind: 'number', step: 1 } })).toThrow(/candidate ticks/);
  });

  it('类别区间生成有候选限制', () => {
    const domain = Array.from({ length: 10_001 }, (_unused, index) => `c${index}`);
    const scale = scaleOf('category', domain, domain);

    expect(() => resolveGuideTicks(scale, { interval: { kind: 'category', step: 1 } })).toThrow(/candidate ticks/);
  });
});
