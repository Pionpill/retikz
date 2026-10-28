import type { CenteredBox } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { Anchor, CenterAnchor, Corner, Side, isAnchor, isDirectionalAnchor, isSide } from '../../../src/shared';
import { rect } from '../../../src/shared/geometry/rect';

const r10x6: CenteredBox = { x: 0, y: 0, width: 10, height: 6 };

describe('锚定词汇', () => {
  it('仅在共享中保留规范的锚点和侧面名称', () => {
    expect(CenterAnchor).toEqual({ Center: 'center' });
    expect(Side).toEqual({
      Top: 'top',
      Right: 'right',
      Bottom: 'bottom',
      Left: 'left',
    });
    expect(Corner).toEqual({
      TopRight: 'top-right',
      TopLeft: 'top-left',
      BottomRight: 'bottom-right',
      BottomLeft: 'bottom-left',
    });
    expect(Anchor).toEqual({
      ...Side,
      ...Corner,
    });
  });

  it('识别规范名称而不接受别名', () => {
    expect(isAnchor(CenterAnchor.Center)).toBe(true);
    expect(isAnchor(Anchor.BottomRight)).toBe(true);
    expect(isDirectionalAnchor(Anchor.TopLeft)).toBe(true);
    expect(isDirectionalAnchor(CenterAnchor.Center)).toBe(false);
    expect(isSide(Side.Top)).toBe(true);
    expect(isAnchor('north')).toBe(false);
    expect(isSide('above')).toBe(false);
  });
});

describe('rect.anchor', () => {
  it('返回不旋转的 8 个方向锚点', () => {
    expect(rect.anchor(r10x6, Anchor.Top)).toEqual([0, -3]);
    expect(rect.anchor(r10x6, Anchor.Bottom)).toEqual([0, 3]);
    expect(rect.anchor(r10x6, Anchor.Right)).toEqual([5, 0]);
    expect(rect.anchor(r10x6, Anchor.Left)).toEqual([-5, 0]);
    expect(rect.anchor(r10x6, Anchor.TopRight)).toEqual([5, -3]);
    expect(rect.anchor(r10x6, Anchor.TopLeft)).toEqual([-5, -3]);
    expect(rect.anchor(r10x6, Anchor.BottomRight)).toEqual([5, 3]);
    expect(rect.anchor(r10x6, Anchor.BottomLeft)).toEqual([-5, 3]);
  });

  it('按矩形中心偏移锚点', () => {
    const r: CenteredBox = { x: 100, y: 50, width: 10, height: 6 };

    expect(rect.anchor(r, Anchor.TopRight)).toEqual([105, 47]);
  });

  it('使用矩形旋转顶部和右侧锚点', () => {
    const r: CenteredBox = { ...r10x6, rotate: Math.PI / 2 };
    const [topX, topY] = rect.anchor(r, Anchor.Top);

    expect(topX).toBeCloseTo(3);
    expect(topY).toBeCloseTo(0);

    const [rightX, rightY] = rect.anchor(r, Anchor.Right);

    expect(rightX).toBeCloseTo(0);
    expect(rightY).toBeCloseTo(5);
  });

  it('将 180 度旋转下的顶部映射到未旋转的底部锚点', () => {
    const rRot: CenteredBox = { ...r10x6, rotate: Math.PI };
    const [x, y] = rect.anchor(rRot, Anchor.Top);
    const [sx, sy] = rect.anchor(r10x6, Anchor.Bottom);

    expect(x).toBeCloseTo(sx);
    expect(y).toBeCloseTo(sy);
  });
});
