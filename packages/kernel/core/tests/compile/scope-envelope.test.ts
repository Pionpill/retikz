import { describe, expect, it } from 'vitest';

import { calculateScopeEnvelopeBounds, compileScopeRectangleEnvelope, mergeScopeEnvelopeBounds } from '../../src';
import { BUILTIN_SHAPES } from '../../src/providers/shape/shape';

describe('Scope 矩形摘要', () => {
  it('有序分段合并与直接扫描等价，极值删除后可以收缩', () => {
    const left = calculateScopeEnvelopeBounds([{ position: [-20, 3] }, { position: [5, -8] }]);
    const right = calculateScopeEnvelopeBounds([{ position: [40, 12] }]);
    const merged = mergeScopeEnvelopeBounds(left, right);
    expect(merged).toEqual(
      calculateScopeEnvelopeBounds([{ position: [-20, 3] }, { position: [5, -8] }, { position: [40, 12] }]),
    );
    expect(compileScopeRectangleEnvelope(merged).rect).toEqual({ x: 10, y: 2, width: 60, height: 20, rotate: 0 });
    expect(compileScopeRectangleEnvelope(left).rect).toEqual({ x: -7.5, y: -2.5, width: 25, height: 11, rotate: 0 });
    expect(left).toEqual({ minX: -20, minY: -8, maxX: 5, maxY: 3 });
  });
  it('平局保留前段正负零，合法空输入产生零包络', () => {
    const first = calculateScopeEnvelopeBounds([{ position: [-0, 0] }]);
    const second = calculateScopeEnvelopeBounds([{ position: [0, -0] }]);
    const merged = mergeScopeEnvelopeBounds(first, second);
    expect(Object.is(merged?.minX, -0)).toBe(true);
    expect(Object.is(merged?.maxY, 0)).toBe(true);
    expect(calculateScopeEnvelopeBounds([])).toBeUndefined();
    expect(compileScopeRectangleEnvelope(undefined)).toEqual({
      rect: { x: 0, y: 0, width: 0, height: 0, rotate: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
  });
});

it('旋转矩形的角点在同一坐标系形成包络', () => {
  const shape = { name: 'rectangle', definition: BUILTIN_SHAPES.get('rectangle')!, params: {} };
  const bounds = calculateScopeEnvelopeBounds([
    {
      shape,
      boundary: { ...shape, isShape: true },
      geometry: {
        rect: { x: 10, y: 20, width: 4, height: 2, rotate: Math.PI / 2 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
  ])!;
  expect(bounds.minX).toBeCloseTo(9, 12);
  expect(bounds.maxX).toBeCloseTo(11, 12);
  expect(bounds.minY).toBeCloseTo(18, 12);
  expect(bounds.maxY).toBeCloseTo(22, 12);
});
