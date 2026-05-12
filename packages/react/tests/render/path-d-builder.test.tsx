import { describe, expect, it } from 'vitest';
import type { PathCommand } from '@retikz/core';
import { buildPathD } from '../../src/render/path-d-builder';

describe('buildPathD: 单 kind 构造', () => {
  it('move → "M x y"', () => {
    const commands: Array<PathCommand> = [{ kind: 'move', to: [3, 4] }];
    expect(buildPathD(commands)).toBe('M 3 4');
  });

  it('line → "M x y L x2 y2"（不带 move 时序时还是要 line 自己 emit L）', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 L 10 0');
  });

  it('quad → "Q cx cy x y"', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'quad', control: [5, 8], to: [10, 0] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 Q 5 8 10 0');
  });

  it('cubic → "C c1x c1y c2x c2y x y"', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'cubic', control1: [3, 3], control2: [7, -3], to: [10, 0] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 C 3 3 7 -3 10 0');
  });

  it('close → "Z"', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 L 10 0 L 10 10 Z');
  });

  it('arc 0°→90° in unit circle → "M r 0 A r r 0 0 1 0 r"', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
      },
    ];
    expect(buildPathD(commands)).toBe('M 10 0 A 10 10 0 0 1 0 10');
  });

  it('arc 0°→270°（large arc）→ largeArc flag = 1', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 270,
      },
    ];
    expect(buildPathD(commands)).toBe('M 10 0 A 10 10 0 1 1 0 -10');
  });

  it('arc 反向 90°→0°（counterClockwise=true via end<start）→ sweep=0', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 90,
        endAngle: 0,
      },
    ];
    // 起点 = (0,10)；终点 = (10, 0)；|Δ|=90 → largeArc=0；endAngle<startAngle → sweep=0
    expect(buildPathD(commands)).toBe('M 0 10 A 10 10 0 0 0 10 0');
  });

  it('arc counterClockwise=true 强制 sweep=0（与端角差无关）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
        counterClockwise: true,
      },
    ];
    expect(buildPathD(commands)).toBe('M 10 0 A 10 10 0 0 0 0 10');
  });

  it('ellipseArc 不同 rx/ry → SVG A 命令 rx 与 ry 不同', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'ellipseArc',
        center: [0, 0],
        radiusX: 15,
        radiusY: 10,
        startAngle: 0,
        endAngle: 180,
      },
    ];
    expect(buildPathD(commands)).toBe('M 15 0 A 15 10 0 0 1 -15 0');
  });

  it('ellipseArc 全 sweep（0°→360°）→ 拆成两段半弧避 A 命令 360° 退化', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'ellipseArc',
        center: [0, 0],
        radiusX: 15,
        radiusY: 10,
        startAngle: 0,
        endAngle: 360,
      },
    ];
    expect(buildPathD(commands)).toBe(
      'M 15 0 A 15 10 0 0 1 -15 0 A 15 10 0 0 1 15 0',
    );
  });

  it('ellipseArc rx=ry 全 sweep 退化为圆全 sweep（仍拆半弧）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'ellipseArc',
        center: [0, 0],
        radiusX: 10,
        radiusY: 10,
        startAngle: 0,
        endAngle: 360,
      },
    ];
    expect(buildPathD(commands)).toBe(
      'M 10 0 A 10 10 0 0 1 -10 0 A 10 10 0 0 1 10 0',
    );
  });

  it('ellipseArc rotation 字段透传到 SVG A 命令 x-axis-rotation', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'ellipseArc',
        center: [0, 0],
        radiusX: 15,
        radiusY: 10,
        rotation: 30,
        startAngle: 0,
        endAngle: 180,
      },
    ];
    // SVG A 命令中第三个参数是 x-axis-rotation；端点仍按未旋转椭圆 polar 投影算
    expect(buildPathD(commands)).toContain('A 15 10 30 0 1');
  });
});

describe('buildPathD: 段组合', () => {
  it('move + line + line → "M..L..L.."', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 L 10 0 L 10 10');
  });

  it('cubic 接 line', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'cubic', control1: [2, 5], control2: [8, 5], to: [10, 0] },
      { kind: 'line', to: [20, 0] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 C 2 5 8 5 10 0 L 20 0');
  });

  it('多 sub-path：close 后再 move 重新开始', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'close' },
      { kind: 'move', to: [20, 0] },
      { kind: 'line', to: [30, 0] },
    ];
    expect(buildPathD(commands)).toBe('M 0 0 L 10 0 Z M 20 0 L 30 0');
  });
});

describe('buildPathD: 边界 / 错误路径', () => {
  it('空 commands → ""', () => {
    expect(buildPathD([])).toBe('');
  });

  it('未识别 kind 抛错（exhaustive switch 防御）', () => {
    const bad = [
      { kind: 'unknown' as unknown as 'move', to: [0, 0] as [number, number] },
    ] as Array<PathCommand>;
    expect(() => buildPathD(bad)).toThrow();
  });

  it('默认 round 保留 2 位小数（与 compile precision 一致），不传 round 时浮点噪声被裁掉', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [1.23456, 2.34567] },
    ];
    expect(buildPathD(commands)).toBe('M 1.23 2.35');
  });

  it('round 函数透传到所有坐标', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [1.234, 2.345] },
      { kind: 'line', to: [3.456, 4.567] },
    ];
    const r = (n: number) => Math.round(n * 100) / 100;
    expect(buildPathD(commands, r)).toBe('M 1.23 2.35 L 3.46 4.57');
  });
});
