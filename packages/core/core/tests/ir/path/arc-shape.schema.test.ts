import { describe, expect, it } from 'vitest';
import { ArcStepSchema, CirclePathStepSchema, EllipsePathStepSchema, StepSchema } from '../../../src/ir';

describe('arc / circlePath / ellipsePath schema refinement', () => {
  it('arc 接受正圆半径或成对椭圆半径', () => {
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
        radius: 10,
      }).success,
    ).toBe(true);
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
        radiusX: 12,
        radiusY: 8,
      }).success,
    ).toBe(true);
  });

  it('arc 拒绝缺半径、混用半径和非 finite 角度', () => {
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
      }).success,
    ).toBe(false);
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
        radiusX: 12,
      }).success,
    ).toBe(false);
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
        radius: 10,
        radiusX: 12,
        radiusY: 8,
      }).success,
    ).toBe(false);
    expect(
      ArcStepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: Number.POSITIVE_INFINITY,
        endAngle: 90,
        radius: 10,
      }).success,
    ).toBe(false);
  });

  it('circlePath 要求角度同给或同省，并拒绝 partial closed', () => {
    expect(CirclePathStepSchema.safeParse({ type: 'step', kind: 'circlePath', radius: 10 }).success).toBe(true);
    expect(
      CirclePathStepSchema.safeParse({
        type: 'step',
        kind: 'circlePath',
        radius: 10,
        startAngle: 0,
        endAngle: 180,
        closed: 'sector',
      }).success,
    ).toBe(true);
    expect(
      CirclePathStepSchema.safeParse({
        type: 'step',
        kind: 'circlePath',
        radius: 10,
        startAngle: 0,
      }).success,
    ).toBe(false);
    expect(
      CirclePathStepSchema.safeParse({
        type: 'step',
        kind: 'circlePath',
        radius: 10,
        startAngle: 0,
        endAngle: 180,
        closed: 'closed',
      }).success,
    ).toBe(false);
  });

  it('ellipsePath 要求角度同给或同省，并拒绝 partial closed', () => {
    expect(EllipsePathStepSchema.safeParse({ type: 'step', kind: 'ellipsePath', radiusX: 12, radiusY: 8 }).success).toBe(true);
    expect(
      EllipsePathStepSchema.safeParse({
        type: 'step',
        kind: 'ellipsePath',
        radiusX: 12,
        radiusY: 8,
        startAngle: 0,
        endAngle: 180,
        closed: 'open',
      }).success,
    ).toBe(true);
    expect(
      EllipsePathStepSchema.safeParse({
        type: 'step',
        kind: 'ellipsePath',
        radiusX: 12,
        radiusY: 8,
        endAngle: 180,
      }).success,
    ).toBe(false);
    expect(
      EllipsePathStepSchema.safeParse({
        type: 'step',
        kind: 'ellipsePath',
        radiusX: 12,
        radiusY: 8,
        startAngle: 0,
        endAngle: 180,
        closed: 'closed',
      }).success,
    ).toBe(false);
  });

  it('StepSchema 总入口同样执行 arc 约束', () => {
    expect(
      StepSchema.safeParse({
        type: 'step',
        kind: 'arc',
        startAngle: 0,
        endAngle: 90,
      }).success,
    ).toBe(false);
  });
});
