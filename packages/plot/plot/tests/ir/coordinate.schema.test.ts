import { describe, expect, it } from 'vitest';
import { CoordinateSchema } from '../../src/ir/coordinate';

describe('CoordinateSchema (ADR-04)', () => {
  // Happy path
  it('coordinate_cartesian2d_valid', () => {
    const c = { type: 'cartesian2D', x: 'xs', y: 'ys' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界
  it('coordinate_empty_x_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: '', y: 'ys' })).toThrow();
  });

  // 错误路径
  it('coordinate_missing_x_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', y: 'ys' })).toThrow();
  });

  it('coordinate_missing_y_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: 'xs' })).toThrow();
  });

  it('coordinate_cartesian_wrong_shape_rejected', () => {
    // 原 cartesian 词汇 x/y 不被 polar2D 接受（成员判别）
    expect(() => CoordinateSchema.parse({ type: 'polar2D', x: 'xs', y: 'ys' })).toThrow();
  });

  // 交互：schema 层不做跨字段引用校验（引用完整性归 lowering）
  it('coordinate_references_unknown_scale_name_schema_passes', () => {
    const c = { type: 'cartesian2D', x: 'nonexistent', y: 'alsoMissing' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });
});

describe('CoordinateSchema polar2D (ADR-01)', () => {
  // Happy path
  it('polar2d_minimal_valid_with_defaults', () => {
    const parsed = CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r' });
    // 默认值填充：startAngle=0 / endAngle=360 / innerRadius=0
    expect(parsed).toEqual({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: 0, endAngle: 360, innerRadius: 0 });
  });

  it('polar2d_explicit_fields_valid', () => {
    const c = { type: 'polar2D', angle: 'a', radius: 'r', startAngle: -90, endAngle: 180, innerRadius: 0.3 };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('polar2d_cartesian_still_accepted_regression', () => {
    // 回归：扩 union 后 cartesian2D 仍接受、产物不变
    const c = { type: 'cartesian2D', x: 'xs', y: 'ys' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界
  it('polar2d_innerRadius_at_lower_bound_valid', () => {
    const c = { type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 0 } as const;
    const parsed = CoordinateSchema.parse(c);
    expect(parsed.type === 'polar2D' && parsed.innerRadius).toBe(0);
  });

  it('polar2d_innerRadius_one_rejected', () => {
    // innerRadius 是占外半径比例，必须 < 1（.lt(1)）
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 1 })).toThrow();
  });

  it('polar2d_innerRadius_above_one_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: 1.5 })).toThrow();
  });

  it('polar2d_innerRadius_negative_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', innerRadius: -0.1 })).toThrow();
  });

  // 错误路径
  it('polar2d_missing_angle_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', radius: 'r' })).toThrow();
  });

  it('polar2d_missing_radius_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a' })).toThrow();
  });

  it('polar2d_empty_angle_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: '', radius: 'r' })).toThrow();
  });

  // round-trip：IR 必须 100% JSON 可序列化
  it('polar2d_json_round_trip', () => {
    const ir = CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: -90, endAngle: 270, innerRadius: 0.25 });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});
