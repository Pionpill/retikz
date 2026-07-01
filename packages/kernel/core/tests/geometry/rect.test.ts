import { describe, expect, it } from 'vitest';

import type { Rect } from '../../src/geometry/rect';

import { rect } from '../../src/geometry/rect';
import {
  CenterAnchor,
  CompassAnchor,
  CompassAnchorToWebAnchor,
  CompassCorner,
  CompassSide,
  normalizeAnchor,
  normalizeSide,
  TikzAnchor,
  TikzAnchorToWebAnchor,
  TikzCorner,
  TikzSide,
  WebAnchor,
} from '../../src/shared';

const r10x6: Rect = { x: 0, y: 0, width: 10, height: 6 };

describe('anchor vocabularies', () => {
  it('keeps compass side and corner aliases', () => {
    expect(CompassSide).toEqual({
      North: 'north',
      South: 'south',
      East: 'east',
      West: 'west',
    });
    expect(CompassCorner).toEqual({
      NorthEast: 'north-east',
      NorthWest: 'north-west',
      SouthEast: 'south-east',
      SouthWest: 'south-west',
    });
    expect(CompassAnchor).toEqual({
      North: 'north',
      South: 'south',
      East: 'east',
      West: 'west',
      NorthEast: 'north-east',
      NorthWest: 'north-west',
      SouthEast: 'south-east',
      SouthWest: 'south-west',
    });
  });

  it('keeps TikZ positioning side and corner aliases', () => {
    expect(TikzSide).toEqual({
      Above: 'above',
      Below: 'below',
      Right: 'right',
      Left: 'left',
    });
    expect(TikzCorner).toEqual({
      AboveRight: 'above-right',
      AboveLeft: 'above-left',
      BelowRight: 'below-right',
      BelowLeft: 'below-left',
    });
    expect(TikzAnchor).toEqual({
      Above: 'above',
      Below: 'below',
      Right: 'right',
      Left: 'left',
      AboveRight: 'above-right',
      AboveLeft: 'above-left',
      BelowRight: 'below-right',
      BelowLeft: 'below-left',
    });
  });

  it('normalizes compass and TikZ aliases to Web canonical names', () => {
    expect(CenterAnchor).toEqual({ Center: 'center' });
    expect(CompassAnchorToWebAnchor[CompassAnchor.North]).toBe(WebAnchor.Top);
    expect(CompassAnchorToWebAnchor[CompassAnchor.NorthWest]).toBe(WebAnchor.TopLeft);
    expect(TikzAnchorToWebAnchor[TikzAnchor.Above]).toBe(WebAnchor.Top);
    expect(TikzAnchorToWebAnchor[TikzAnchor.BelowRight]).toBe(WebAnchor.BottomRight);
    expect(normalizeAnchor(CenterAnchor.Center)).toBe(CenterAnchor.Center);
    expect(normalizeAnchor(CompassAnchor.North)).toBe(WebAnchor.Top);
    expect(normalizeAnchor(TikzAnchor.AboveLeft)).toBe(WebAnchor.TopLeft);
    expect(normalizeAnchor(WebAnchor.BottomRight)).toBe(WebAnchor.BottomRight);
    expect(normalizeSide('north')).toBe('top');
    expect(normalizeSide('above')).toBe('top');
    expect(normalizeSide('left')).toBe('left');
  });
});

describe('rect.center', () => {
  it('returns the rectangle center', () => {
    expect(rect.center({ x: 3, y: 7, width: 10, height: 4 })).toEqual([3, 7]);
  });
});

describe('rect.contains without rotation', () => {
  it('includes the center', () => {
    expect(rect.contains(r10x6, [0, 0])).toBe(true);
  });

  it('includes boundary corners and edge midpoints', () => {
    expect(rect.contains(r10x6, [5, 3])).toBe(true);
    expect(rect.contains(r10x6, [5, -3])).toBe(true);
    expect(rect.contains(r10x6, [-5, 3])).toBe(true);
    expect(rect.contains(r10x6, [-5, -3])).toBe(true);
    expect(rect.contains(r10x6, [5, 0])).toBe(true);
    expect(rect.contains(r10x6, [0, 3])).toBe(true);
  });

  it('rejects outside points', () => {
    expect(rect.contains(r10x6, [5.01, 0])).toBe(false);
    expect(rect.contains(r10x6, [0, 3.01])).toBe(false);
    expect(rect.contains(r10x6, [-100, -100])).toBe(false);
  });
});

describe('rect.contains with rotation', () => {
  const slim: Rect = { x: 0, y: 0, width: 10, height: 2, rotate: Math.PI / 2 };

  it('rotates containment with the local axes', () => {
    expect(rect.contains(slim, [0, 4])).toBe(true);
    expect(rect.contains(slim, [4, 0])).toBe(false);
  });

  it('treats omitted rotate and rotate=0 the same', () => {
    const noRot: Rect = { x: 0, y: 0, width: 10, height: 6 };
    const rot0: Rect = { ...noRot, rotate: 0 };
    expect(rect.contains(noRot, [4, 2])).toBe(rect.contains(rot0, [4, 2]));
  });

  it('keeps 180 degree rotation symmetric', () => {
    const rot180: Rect = { ...r10x6, rotate: Math.PI };
    expect(rect.contains(rot180, [3, 2])).toBe(rect.contains(r10x6, [3, 2]));
    expect(rect.contains(rot180, [5.01, 0])).toBe(false);
  });
});

describe('rect.anchor', () => {
  it('returns the 8 Web directional anchors without rotation', () => {
    expect(rect.anchor(r10x6, WebAnchor.Top)).toEqual([0, -3]);
    expect(rect.anchor(r10x6, WebAnchor.Bottom)).toEqual([0, 3]);
    expect(rect.anchor(r10x6, WebAnchor.Right)).toEqual([5, 0]);
    expect(rect.anchor(r10x6, WebAnchor.Left)).toEqual([-5, 0]);
    expect(rect.anchor(r10x6, WebAnchor.TopRight)).toEqual([5, -3]);
    expect(rect.anchor(r10x6, WebAnchor.TopLeft)).toEqual([-5, -3]);
    expect(rect.anchor(r10x6, WebAnchor.BottomRight)).toEqual([5, 3]);
    expect(rect.anchor(r10x6, WebAnchor.BottomLeft)).toEqual([-5, 3]);
  });

  it('accepts WebAnchor constants', () => {
    expect(rect.anchor(r10x6, WebAnchor.TopRight)).toEqual(rect.anchor(r10x6, WebAnchor.TopRight));
  });

  it('offsets anchors by rectangle center', () => {
    const r: Rect = { x: 100, y: 50, width: 10, height: 6 };
    expect(rect.center(r)).toEqual([100, 50]);
    expect(rect.anchor(r, WebAnchor.TopRight)).toEqual([105, 47]);
  });

  it('rotates top and right anchors with the rectangle', () => {
    const r: Rect = { ...r10x6, rotate: Math.PI / 2 };
    const [topX, topY] = rect.anchor(r, WebAnchor.Top);
    expect(topX).toBeCloseTo(3);
    expect(topY).toBeCloseTo(0);

    const [rightX, rightY] = rect.anchor(r, WebAnchor.Right);
    expect(rightX).toBeCloseTo(0);
    expect(rightY).toBeCloseTo(5);
  });

  it('maps top under 180 degree rotation to the unrotated bottom anchor', () => {
    const rRot: Rect = { ...r10x6, rotate: Math.PI };
    const [x, y] = rect.anchor(rRot, WebAnchor.Top);
    const [sx, sy] = rect.anchor(r10x6, WebAnchor.Bottom);
    expect(x).toBeCloseTo(sx);
    expect(y).toBeCloseTo(sy);
  });
});

describe('rect.boundaryPoint', () => {
  it('intersects cardinal rays with the rectangle boundary', () => {
    expect(rect.boundaryPoint(r10x6, [10, 0])).toEqual([5, 0]);
    expect(rect.boundaryPoint(r10x6, [0, 10])).toEqual([0, 3]);
    expect(rect.boundaryPoint(r10x6, [-10, 0])).toEqual([-5, 0]);
    expect(rect.boundaryPoint(r10x6, [0, -10])).toEqual([0, -3]);
  });

  it('intersects diagonal rays at corners', () => {
    const [x, y] = rect.boundaryPoint(r10x6, [10, 6]);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(3);
  });

  it('returns center when toward equals center', () => {
    expect(rect.boundaryPoint(r10x6, [0, 0])).toEqual([0, 0]);
  });

  it('uses rectangle center as the ray origin', () => {
    const r: Rect = { x: 100, y: 50, width: 10, height: 6 };
    expect(rect.boundaryPoint(r, [200, 50])).toEqual([105, 50]);
  });

  it('respects rotation', () => {
    const r: Rect = { ...r10x6, rotate: Math.PI / 2 };
    const [x, y] = rect.boundaryPoint(r, [10, 0]);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(0);
  });

  it('keeps rotated boundary hits on one local edge', () => {
    const r: Rect = { x: 5, y: 5, width: 8, height: 4, rotate: Math.PI / 6 };
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    const targets: Array<[number, number]> = [
      [50, 5],
      [5, 50],
      [-50, -50],
      [50, -20],
    ];
    const cos = Math.cos(r.rotate ?? 0);
    const sin = Math.sin(r.rotate ?? 0);
    for (const target of targets) {
      const hit = rect.boundaryPoint(r, target);
      const dx = hit[0] - r.x;
      const dy = hit[1] - r.y;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      const onVerticalEdge = Math.abs(Math.abs(lx) - halfW) < 1e-9;
      const onHorizontalEdge = Math.abs(Math.abs(ly) - halfH) < 1e-9;
      expect(onVerticalEdge || onHorizontalEdge).toBe(true);
    }
  });
});
