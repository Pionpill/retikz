import { describe, expect, it } from 'vitest';
import type { CenteredShape } from '../../src/geometry/transform';
import { localToWorld, worldToLocal } from '../../src/geometry/transform';

/*
 * 约定（见 transform.ts）：
 *   localToWorld：本地系（以 center 为原点）→ 世界系。rotate=0 / 缺省退化为纯平移；
 *     非零按矩阵 [cos −sin; sin cos] 绕中心旋转后再加 (x, y)。
 *   worldToLocal 是其逆（旋转矩阵转置）。
 *   坐标 y-down（SVG 约定）。
 */

const DEG = Math.PI / 180;

describe('localToWorld / worldToLocal 无旋转', () => {
  it('rotate 缺省时 localToWorld 只做平移', () => {
    const s: CenteredShape = { x: 5, y: 7 };
    const [wx, wy] = localToWorld(s, [2, 3]);
    expect(wx).toBeCloseTo(7);
    expect(wy).toBeCloseTo(10);
  });

  it('rotate=0 时 localToWorld 只做平移', () => {
    const s: CenteredShape = { x: -4, y: 1, rotate: 0 };
    const [wx, wy] = localToWorld(s, [10, -2]);
    expect(wx).toBeCloseTo(6);
    expect(wy).toBeCloseTo(-1);
  });

  it('worldToLocal 是 localToWorld 的逆（无旋转）', () => {
    const s: CenteredShape = { x: 5, y: 7 };
    const world: [number, number] = [12, 20];
    const local = worldToLocal(s, world);
    const back = localToWorld(s, local);
    expect(back[0]).toBeCloseTo(world[0]);
    expect(back[1]).toBeCloseTo(world[1]);
  });
});

describe('localToWorld center 偏移生效', () => {
  it('本地原点映射到世界中心 (x, y)', () => {
    const s: CenteredShape = { x: 3, y: -8, rotate: 1.23 };
    const [wx, wy] = localToWorld(s, [0, 0]);
    expect(wx).toBeCloseTo(3);
    expect(wy).toBeCloseTo(-8);
  });

  it('worldToLocal 把世界中心映射回本地原点', () => {
    const s: CenteredShape = { x: 3, y: -8, rotate: 1.23 };
    const [lx, ly] = worldToLocal(s, [3, -8]);
    expect(lx).toBeCloseTo(0);
    expect(ly).toBeCloseTo(0);
  });
});

describe('localToWorld 旋转方向（矩阵 [cos −sin; sin cos]，y-down）', () => {
  it('rotate=90° 把本地 +x 轴 [1,0] 旋成世界 +y 方向（视觉向下）', () => {
    const s: CenteredShape = { x: 0, y: 0, rotate: 90 * DEG };
    const [wx, wy] = localToWorld(s, [1, 0]);
    expect(wx).toBeCloseTo(0);
    expect(wy).toBeCloseTo(1);
  });

  it('rotate=90° 把本地 +y 轴 [0,1] 旋成世界 −x 方向', () => {
    const s: CenteredShape = { x: 0, y: 0, rotate: 90 * DEG };
    const [wx, wy] = localToWorld(s, [0, 1]);
    expect(wx).toBeCloseTo(-1);
    expect(wy).toBeCloseTo(0);
  });

  it('rotate=30° 对 [1,0] 给出 [cos30, sin30] 再加中心', () => {
    const s: CenteredShape = { x: 10, y: 20, rotate: 30 * DEG };
    const [wx, wy] = localToWorld(s, [1, 0]);
    expect(wx).toBeCloseTo(10 + Math.cos(30 * DEG));
    expect(wy).toBeCloseTo(20 + Math.sin(30 * DEG));
  });
});

describe('localToWorld / worldToLocal 带旋转往返还原', () => {
  const cases: Array<{ rotate: number; label: string }> = [
    { rotate: 30 * DEG, label: '30°' },
    { rotate: 90 * DEG, label: '90°' },
    { rotate: -45 * DEG, label: '负角 −45°' },
    { rotate: 2.7, label: '任意弧度 2.7' },
  ];

  for (const { rotate, label } of cases) {
    it(`rotate=${label} 时 localToWorld∘worldToLocal 还原世界点`, () => {
      const s: CenteredShape = { x: -2.5, y: 6.25, rotate };
      const world: [number, number] = [13.5, -4.75];
      const local = worldToLocal(s, world);
      const back = localToWorld(s, local);
      expect(back[0]).toBeCloseTo(world[0]);
      expect(back[1]).toBeCloseTo(world[1]);
    });

    it(`rotate=${label} 时 worldToLocal∘localToWorld 还原本地点`, () => {
      const s: CenteredShape = { x: -2.5, y: 6.25, rotate };
      const local: [number, number] = [4, -9];
      const world = localToWorld(s, local);
      const back = worldToLocal(s, world);
      expect(back[0]).toBeCloseTo(local[0]);
      expect(back[1]).toBeCloseTo(local[1]);
    });
  }
});
