import { describe, expect, it } from 'vitest';
import { ArcStepSchema, CirclePathStepSchema, EllipsePathStepSchema } from '../../src/ir';
import { parseWay } from '../../src/parsers/way';

describe('parseWay 形状算子边界', () => {
  it('正常路径：target → arc 算子（以前 target 为圆心，不消耗下一项）', () => {
    const steps = parseWay([
      [10, 10],
      { arc: { startAngle: 0, endAngle: 90, radius: 5 } },
      [50, 50],
    ]);
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ kind: 'move', to: [10, 10] });
    expect(steps[1]).toMatchObject({ kind: 'arc', startAngle: 0, endAngle: 90, radius: 5 });
    expect(steps[2]).toMatchObject({ kind: 'line', to: [50, 50] });
  });

  it('正常路径：target → circle 算子', () => {
    const steps = parseWay([[0, 0], { circle: { radius: 5 } }]);
    expect(steps[1]).toMatchObject({ kind: 'circlePath', radius: 5 });
  });

  it('正常路径：target → ellipse 算子', () => {
    const steps = parseWay([[0, 0], { ellipse: { radiusX: 4, radiusY: 2 } }]);
    expect(steps[1]).toMatchObject({ kind: 'ellipsePath', radiusX: 4, radiusY: 2 });
  });

  it('arc startAngle === endAngle → parseWay 不报错；schema 接受（0 长度弧由 renderer 处理）', () => {
    const steps = parseWay([
      [0, 0],
      { arc: { startAngle: 90, endAngle: 90, radius: 10 } },
    ]);
    expect(steps[1]).toMatchObject({ kind: 'arc', startAngle: 90, endAngle: 90, radius: 10 });
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 90,
        endAngle: 90,
        radius: 10,
      }).success,
    ).toBe(true);
  });

  it('负 radius → zod schema 层拒绝（`.positive()`）', () => {
    expect(
      CirclePathStepSchema.safeParse({
        type: 'step',
        kind: 'circlePath',
        radius: -5,
      }).success,
    ).toBe(false);

    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
        radius: -10,
      }).success,
    ).toBe(false);

    expect(
      EllipsePathStepSchema.safeParse({
        type: 'step',
        kind: 'ellipsePath',
        radiusX: -4,
        radiusY: 2,
      }).success,
    ).toBe(false);
  });
});
