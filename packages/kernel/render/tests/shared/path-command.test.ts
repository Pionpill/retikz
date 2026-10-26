import type { PathCommand } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  commandArcStart,
  commandArcSweep,
  commandEndpoint,
  commandEndTangent,
  commandStartTangent,
} from '../../src/shared/path-command';

describe('commandEndpoint', () => {
  it('返回类似线的命令的 `to` 点', () => {
    expect(commandEndpoint({ kind: 'line', to: [3, 4] })).toEqual([3, 4]);
  });

  it('返回圆弧的极端点', () => {
    expect(commandEndpoint({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 0 })).toEqual([10, 0]);
  });

  it('返回 radiusX 和 radiusY 的椭圆端点', () => {
    const point = commandEndpoint({
      kind: 'ellipseArc',
      center: [0, 0],
      radiusX: 10,
      radiusY: 5,
      startAngle: 0,
      endAngle: 90,
    });

    expect(point?.[0]).toBeCloseTo(0);
    expect(point?.[1]).toBeCloseTo(5);
  });

  it('返回旋转后的椭圆端点', () => {
    const command: PathCommand = {
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    };

    const point = commandEndpoint(command);

    expect(point?.[0]).toBeCloseTo(6);
    expect(point?.[1]).toBeCloseTo(20);
  });

  it('对于关闭命令返回 null', () => {
    expect(commandEndpoint({ kind: 'close' })).toBeNull();
  });
});

describe('commandArcStart', () => {
  it('返回圆弧起点', () => {
    const point = commandArcStart({ kind: 'arc', center: [2, 3], radius: 10, startAngle: 180, endAngle: 270 });

    expect(point[0]).toBeCloseTo(-8);
    expect(point[1]).toBeCloseTo(3);
  });

  it('返回旋转后的椭圆起点', () => {
    const point = commandArcStart({
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    });

    expect(point[0]).toBeCloseTo(10);
    expect(point[1]).toBeCloseTo(28);
  });
});

describe('commandArcSweep', () => {
  it('将显式逆时针输入与负长扫描对齐', () => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 90,
        counterClockwise: true,
      }),
    ).toEqual({ start: 0, end: -270, direction: -1 });
  });

  it('将显式顺时针输入与正长扫描对齐', () => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 90,
        endAngle: 0,
        counterClockwise: false,
      }),
    ).toEqual({ start: 90, end: 360, direction: 1 });
  });

  it.each([
    { counterClockwise: false, end: 360, direction: 1 },
    { counterClockwise: true, end: -360, direction: -1 },
  ] as const)('保留整圆方向：$counterClockwise', ({ counterClockwise, end, direction }) => {
    expect(
      commandArcSweep({
        kind: 'arc',
        center: [0, 0],
        radius: 10,
        startAngle: 0,
        endAngle: 360,
        counterClockwise,
      }),
    ).toEqual({ start: 0, end, direction });
  });

  it('标准化大于整圆的扫描', () => {
    expect(commandArcSweep({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 720 })).toEqual({
      start: 0,
      end: 360,
      direction: 1,
    });
  });
});

describe('路径命令切线', () => {
  it('在两个端点使用线方向', () => {
    const command: PathCommand = { kind: 'line', to: [3, 4] };

    expect(commandStartTangent(command, [0, 0])).toEqual([0.6, 0.8]);
    expect(commandEndTangent(command, [0, 0])).toEqual([0.6, 0.8]);
  });

  it('在起点和终点使用圆弧导数', () => {
    const command: PathCommand = { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 90 };
    const start = commandStartTangent(command, [10, 0]);
    const end = commandEndTangent(command, [10, 0]);

    expect(start?.[0]).toBeCloseTo(0);
    expect(start?.[1]).toBeCloseTo(1);
    expect(end?.[0]).toBeCloseTo(-1);
    expect(end?.[1]).toBeCloseTo(0);
  });

  it('反转逆时针圆弧的导数', () => {
    const command: PathCommand = {
      kind: 'arc',
      center: [0, 0],
      radius: 10,
      startAngle: 0,
      endAngle: 90,
      counterClockwise: true,
    };
    const start = commandStartTangent(command, [10, 0]);

    expect(start?.[0]).toBeCloseTo(0);
    expect(start?.[1]).toBeCloseTo(-1);
  });

  it('旋转椭圆导数', () => {
    const command: PathCommand = {
      kind: 'ellipseArc',
      center: [10, 20],
      radiusX: 8,
      radiusY: 4,
      rotation: 90,
      startAngle: 0,
      endAngle: 90,
    };
    const end = commandEndTangent(command, commandArcStart(command));

    expect(end?.[0]).toBeCloseTo(0);
    expect(end?.[1]).toBeCloseTo(-1);
  });

  it('对于没有可绘制切线的命令返回 null', () => {
    expect(commandStartTangent({ kind: 'move', to: [0, 0] }, null)).toBeNull();
    expect(commandEndTangent({ kind: 'close' }, [0, 0])).toBeNull();
    expect(commandStartTangent({ kind: 'line', to: [0, 0] }, null)).toBeNull();
    expect(
      commandStartTangent({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 45, endAngle: 45 }, null),
    ).toBeNull();
    expect(
      commandEndTangent({ kind: 'arc', center: [0, 0], radius: 10, startAngle: 45, endAngle: 45 }, null),
    ).toBeNull();
  });
});
