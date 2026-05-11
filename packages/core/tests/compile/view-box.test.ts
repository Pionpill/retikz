import { describe, expect, it } from 'vitest';
import { computeViewBox } from '../../src/compile/view-box';
import { makeRound } from '../../src/compile/precision';

const round2 = makeRound(2);
const noRound = (n: number) => n;

describe('computeViewBox', () => {
  it('空点集返回 100×100 兜底框（不抛错）', () => {
    expect(computeViewBox([], 10, round2)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('单个点：bbox 为 0×0 + 四周 padding', () => {
    expect(computeViewBox([[5, 7]], 4, noRound)).toEqual({
      x: 1, // 5 - 4
      y: 3, // 7 - 4
      width: 8, // 0 + 2×4
      height: 8,
    });
  });

  it('两个对角点：bbox = 对角差 + padding 各两边', () => {
    expect(computeViewBox([[0, 0], [10, 20]], 5, noRound)).toEqual({
      x: -5,
      y: -5,
      width: 20, // 10 + 2×5
      height: 30, // 20 + 2×5
    });
  });

  it('负坐标也参与 min/max', () => {
    expect(computeViewBox([[-10, -5], [10, 5]], 0, noRound)).toEqual({
      x: -10,
      y: -5,
      width: 20,
      height: 10,
    });
  });

  it('round 回调被应用于全部 4 个字段', () => {
    expect(computeViewBox([[0.111, 0.222], [10.337, 20.448]], 1, round2)).toEqual({
      x: -0.89, // 0.111 - 1 = -0.889 → -0.89
      y: -0.78, // 0.222 - 1 = -0.778 → -0.78
      width: 12.23, // 10.337 - 0.111 + 2 = 12.226 → 12.23
      height: 22.23, // 20.448 - 0.222 + 2 = 22.226 → 22.23
    });
  });

  it('padding=0 时 bbox 紧贴极值点', () => {
    expect(computeViewBox([[1, 2], [3, 4], [5, 6]], 0, noRound)).toEqual({
      x: 1,
      y: 2,
      width: 4,
      height: 4,
    });
  });

  it('所有点重合：bbox 为 0×0 + padding（不退化为兜底框）', () => {
    expect(computeViewBox([[3, 3], [3, 3]], 2, noRound)).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 4,
    });
  });
});
