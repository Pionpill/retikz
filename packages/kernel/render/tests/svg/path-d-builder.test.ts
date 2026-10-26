import type { PathCommand } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { buildPathD } from '../../src/svg';

describe('buildPathD 圆弧编码', () => {
  it('将完整的逆时针圆弧分割为两个 SVG 圆弧命令', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [10, 0] },
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 360,
        endAngle: 0,
        counterClockwise: true,
      },
    ];

    const d = buildPathD(commands);

    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d).toContain('A 10 10 0 0 0 -10 0');
    expect(d).toContain('A 10 10 0 0 0 10 0');
  });

  it('将完整的顺时针圆弧编码为两个 SVG 圆弧命令', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 360, counterClockwise: false },
    ]);

    expect(d.match(/A 10 10/g)).toHaveLength(2);
    expect(d).toContain('A 10 10 0 0 1 -10 0');
    expect(d).toContain('A 10 10 0 0 1 10 0');
  });

  it('使用明确的逆时针方向进行长扫描', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90, counterClockwise: true },
    ]);

    expect(d).toContain('A 10 10 0 1 0 0 10');
  });

  it('使用明确的顺时针方向进行长扫描', () => {
    const d = buildPathD([
      { kind: 'move', to: [0, 10] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 90, endAngle: 0, counterClockwise: false },
    ]);

    expect(d).toContain('A 10 10 0 1 1 10 0');
  });

  it('以椭圆旋转椭圆弧端点', () => {
    const d = buildPathD([
      { kind: 'move', to: [10, 28] },
      {
        kind: 'ellipseArc',
        center: [10, 20],
        radiusX: 8,
        radiusY: 4,
        rotation: 90,
        startAngle: 0,
        endAngle: 90,
      },
    ]);

    expect(d).toContain('A 8 4 90 0 1 6 20');
  });

  it('当圆弧是第一个命令时，移动到几何起点', () => {
    expect(buildPathD([{ kind: 'arc', center: [20, 20], radius: 20, startAngle: 0, endAngle: 90 }])).toBe(
      'M 40 20 A 20 20 0 0 1 20 40',
    );
  });

  it('将当前光标连接到不匹配的圆弧起点', () => {
    expect(
      buildPathD([
        { kind: 'move', to: [0, 0] },
        { kind: 'arc', center: [20, 20], radius: 20, startAngle: 0, endAngle: 90 },
      ]),
    ).toBe('M 0 0 L 40 20 A 20 20 0 0 1 20 40');
  });
});
