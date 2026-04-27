import { describe, expect, it } from 'vitest';
import { parseWay } from '../../src/parsers/parseWay';

describe('parseWay', () => {
  it('两个节点 id 产出 [move, line]', () => {
    expect(parseWay(['A', 'B'])).toEqual([
      { type: 'step', kind: 'move', to: 'A' },
      { type: 'step', kind: 'line', to: 'B' },
    ]);
  });

  it('多段 way 后续全部为 line', () => {
    const steps = parseWay(['A', [10, 10], 'B']);
    expect(steps).toEqual([
      { type: 'step', kind: 'move', to: 'A' },
      { type: 'step', kind: 'line', to: [10, 10] },
      { type: 'step', kind: 'line', to: 'B' },
    ]);
  });

  it('少于 2 个 way item 抛错', () => {
    expect(() => parseWay(['A'])).toThrow(/at least 2/);
  });
});
