import { describe, expect, it } from 'vitest';
import type { PathCommand, Transform } from '@retikz/core';
import { buildPathD } from '../../src/render/path-d-builder';
import { buildTransform } from '../../src/render/transform-builder';

/**
 * ADR-01 builder 层的破坏视角补强测试。
 * 关注点：构造让 builder 挂掉 / 输出错的输入，以及"未来扩展 kind"的防御行为
 */

describe('buildPathD 对抗：浮点 / 360° / 退化', () => {
  it('arc 360° 整圈应拆两段半弧而非单 A（避免 SVG 退化）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 5,
        startAngle: 0,
        endAngle: 360,
      },
    ];
    const d = buildPathD(commands);
    expect(d.match(/A /g) ?? []).toHaveLength(2);
  });

  it('arc 跨度恰 180° 的 largeArc=0（边界条件，|Δ|>180 而非 ≥180）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 5,
        startAngle: 0,
        endAngle: 180,
      },
    ];
    expect(buildPathD(commands)).toBe('M 5 0 A 5 5 0 0 1 -5 0');
  });

  it('arc 跨度 180.001° 的 largeArc=1（紧贴边界另一侧）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 5,
        startAngle: 0,
        endAngle: 180.001,
      },
    ];
    expect(buildPathD(commands)).toContain('A 5 5 0 1 1');
  });

  it('arc counterClockwise=true 即使 startAngle<endAngle 也 sweep=0', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 5,
        startAngle: 0,
        endAngle: 90,
        counterClockwise: true,
      },
    ];
    // sweep=0
    expect(buildPathD(commands)).toBe('M 5 0 A 5 5 0 0 0 0 5');
  });

  it('arc 端角刚好相等（zero arc）→ largeArc=0, sweep=1，端点重合不出错', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 5,
        startAngle: 30,
        endAngle: 30,
      },
    ];
    // 不应抛错；输出某个有效 A 命令
    expect(() => buildPathD(commands)).not.toThrow();
  });

  it('ellipseArc rotation 字段透传到 SVG A 命令第 3 参', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'ellipseArc',
        center: [10, 10],
        radiusX: 6,
        radiusY: 4,
        rotation: 45,
        startAngle: 0,
        endAngle: 90,
      },
    ];
    // 第 3 个数字（x-axis-rotation）应是 45
    expect(buildPathD(commands)).toContain('A 6 4 45 ');
  });

  it("两个 sub-path 都被 close 收尾（多段 cycle 形状）", () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [10, 10] },
      { kind: 'close' },
      { kind: 'move', to: [20, 0] },
      { kind: 'line', to: [30, 0] },
      { kind: 'line', to: [30, 10] },
      { kind: 'close' },
    ];
    expect(buildPathD(commands)).toBe(
      'M 0 0 L 10 0 L 10 10 Z M 20 0 L 30 0 L 30 10 Z',
    );
  });

  it('round 不传时浮点输出按默认 2 位裁剪（cos(90)=6.12e-17 等噪声不进 d）', () => {
    const commands: Array<PathCommand> = [
      {
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
      },
    ];
    const d = buildPathD(commands);
    // 90° 终点应是 (0, 10)，不带浮点尾巴
    expect(d).toMatch(/A 10 10 0 0 1 0 10$/);
  });

  it("超精度 round 传入：保留 4 位小数", () => {
    const r = (n: number) => Math.round(n * 10000) / 10000;
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [1.234567, 2.345678] },
    ];
    expect(buildPathD(commands, r)).toBe('M 1.2346 2.3457');
  });

  it('arc 第一段时自动 emit M 起点（adapter 单独调用 builder 不需要消费者先 move）', () => {
    const commands: Array<PathCommand> = [
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
    ];
    expect(buildPathD(commands)).toBe('M 10 0 A 10 10 0 0 1 0 10');
  });

  it('arc 之前已有 move 时不再重复 emit M', () => {
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [10, 0] },
      { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 },
    ];
    // 只有一个 M
    expect((buildPathD(commands).match(/M /g) ?? []).length).toBe(1);
  });

  it('未识别 kind（防御未来扩展）→ 抛错（exhaustive switch）', () => {
    const bad = [
      {
        kind: 'spline' as 'move',
        to: [0, 0] as [number, number],
      },
    ] as Array<PathCommand>;
    expect(() => buildPathD(bad)).toThrow(/unknown PathCommand kind/);
  });

  it('空 commands → 空字符串（不抛错）', () => {
    expect(buildPathD([])).toBe('');
  });
});

describe('buildTransform 对抗', () => {
  it('rotate cx 给 0 cy 给 undefined 仍写 3 参形态（防止 0 被当 undefined）', () => {
    const transforms: Array<Transform> = [
      { kind: 'rotate', degrees: 90, cx: 0 },
    ];
    expect(buildTransform(transforms)).toBe('rotate(90 0 0)');
  });

  it('rotate cx undefined cy 给 0 同理', () => {
    const transforms: Array<Transform> = [
      { kind: 'rotate', degrees: 90, cy: 0 },
    ];
    expect(buildTransform(transforms)).toBe('rotate(90 0 0)');
  });

  it('rotate 两个都 undefined 走 2 参短形', () => {
    const transforms: Array<Transform> = [
      { kind: 'rotate', degrees: 90 },
    ];
    expect(buildTransform(transforms)).toBe('rotate(90)');
  });

  it('scale y=0 仍写出（合法压扁变换，不被 ?? 替换为 x）', () => {
    const transforms: Array<Transform> = [
      { kind: 'scale', x: 2, y: 0 },
    ];
    expect(buildTransform(transforms)).toBe('scale(2 0)');
  });

  it('5 项混合长链顺序保留', () => {
    const transforms: Array<Transform> = [
      { kind: 'translate', x: 10, y: 20 },
      { kind: 'rotate', degrees: 30 },
      { kind: 'scale', x: 2 },
      { kind: 'translate', x: -10, y: -20 },
      { kind: 'rotate', degrees: -30, cx: 0, cy: 0 },
    ];
    expect(buildTransform(transforms)).toBe(
      'translate(10 20) rotate(30) scale(2 2) translate(-10 -20) rotate(-30 0 0)',
    );
  });

  it('未识别 kind → 抛错', () => {
    const bad = [{ kind: 'skew', x: 0 } as unknown as Transform];
    expect(() => buildTransform(bad)).toThrow(/unknown Transform kind/);
  });

  it('round 函数透传到所有数值字段', () => {
    const r = (n: number) => Math.round(n);
    const transforms: Array<Transform> = [
      { kind: 'translate', x: 1.6, y: 2.4 },
      { kind: 'rotate', degrees: 30.7, cx: 5.5, cy: 9.5 },
      { kind: 'scale', x: 2.5 },
    ];
    expect(buildTransform(transforms, r)).toBe(
      'translate(2 2) rotate(31 6 10) scale(3 3)',
    );
  });
});
