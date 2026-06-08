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

  // ADR-03：x/y 绑定改为可选（缺省按字段类型派生），故「省略」由 reject 变为 accept
  it('coordinate_missing_x_accepted_derives', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', y: 'ys' })).not.toThrow();
  });

  it('coordinate_missing_y_accepted_derives', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D', x: 'xs' })).not.toThrow();
  });

  it('coordinate_both_omitted_accepted_derives', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian2D' })).not.toThrow();
  });

  it('coordinate_polar_ignores_cartesian_keys', () => {
    // polar2D 不识别 x/y（被 zod 剥离），angle/radius 可省 → 解析成 polar2D
    expect(CoordinateSchema.parse({ type: 'polar2D', x: 'xs', y: 'ys' }).type).toBe('polar2D');
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
  it('polar2d_missing_angle_accepted_derives', () => {
    // ADR-03：angle/radius 绑定可省（派生）
    expect(() => CoordinateSchema.parse({ type: 'polar2D', radius: 'r' })).not.toThrow();
  });

  it('polar2d_missing_radius_accepted_derives', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a' })).not.toThrow();
  });

  it('polar2d_empty_angle_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: '', radius: 'r' })).toThrow();
  });

  // 错误路径：非有限角度破坏 JSON 可序列化（Infinity → JSON null），必须拒（Bug Hunter B-1）
  it('polar2d_startAngle_infinity_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: Infinity })).toThrow();
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: -Infinity })).toThrow();
  });

  it('polar2d_endAngle_infinity_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', endAngle: Infinity })).toThrow();
  });

  // round-trip：IR 必须 100% JSON 可序列化
  it('polar2d_json_round_trip', () => {
    const ir = CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r', startAngle: -90, endAngle: 270, innerRadius: 0.25 });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});

describe('CoordinateSchema 一维坐标系族 cartesian1D / polar1D (alpha.9 ADR-02)', () => {
  // Happy path：cartesian1D
  it('cartesian1d_minimal_valid', () => {
    const c = { type: 'cartesian1D', x: 'xs' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('cartesian1d_bare_type_valid_derives', () => {
    // x 可省（派生）、orientation 可省（lowering 默认 horizontal，schema 不填默认）
    expect(CoordinateSchema.parse({ type: 'cartesian1D' })).toEqual({ type: 'cartesian1D' });
  });

  it('cartesian1d_vertical_orientation_valid', () => {
    const c = { type: 'cartesian1D', x: 'xs', orientation: 'vertical' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('cartesian1d_bad_orientation_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'cartesian1D', orientation: 'diagonal' })).toThrow();
  });

  // Happy path：polar1D
  it('polar1d_minimal_valid', () => {
    const c = { type: 'polar1D', angle: 'a' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  it('polar1d_explicit_fields_valid', () => {
    const c = { type: 'polar1D', angle: 'a', radius: 0.5, startAngle: 180, endAngle: 360 };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界：radius 占比 0<r≤1
  it('polar1d_radius_one_valid', () => {
    expect(CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 1 })).toEqual({ type: 'polar1D', angle: 'a', radius: 1 });
  });

  it('polar1d_radius_zero_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 0 })).toThrow();
  });

  it('polar1d_radius_above_one_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 1.5 })).toThrow();
  });

  // 错误路径：非有限角度破坏 JSON 可序列化
  it('polar1d_startAngle_infinity_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', startAngle: Infinity })).toThrow();
  });

  it('polar1d_radius_infinity_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: Infinity })).toThrow();
  });

  it('polar1d_empty_angle_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'polar1D', angle: '' })).toThrow();
  });

  // 回归：扩 union 后 cartesian2D / polar2D 仍接受
  it('two_d_coordinates_still_accepted_regression', () => {
    expect(CoordinateSchema.parse({ type: 'cartesian2D', x: 'x', y: 'y' }).type).toBe('cartesian2D');
    expect(CoordinateSchema.parse({ type: 'polar2D', angle: 'a', radius: 'r' }).type).toBe('polar2D');
  });

  // round-trip
  it('cartesian1d_json_round_trip', () => {
    const ir = CoordinateSchema.parse({ type: 'cartesian1D', x: 'xs', orientation: 'vertical' });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });

  it('polar1d_json_round_trip', () => {
    const ir = CoordinateSchema.parse({ type: 'polar1D', angle: 'a', radius: 0.8, startAngle: 90, endAngle: 270 });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});

describe('CoordinateSchema ternary2D (alpha.9 ADR-03)', () => {
  // Happy path
  it('ternary2d_minimal_valid', () => {
    expect(CoordinateSchema.parse({ type: 'ternary2D' })).toEqual({ type: 'ternary2D' });
  });

  it('ternary2d_with_scale_names_valid', () => {
    const c = { type: 'ternary2D', a: 'as', b: 'bs', c: 'cs' };
    expect(CoordinateSchema.parse(c)).toEqual(c);
  });

  // 边界：a/b/c 各自可省（派生 / 归一化）
  it('ternary2d_partial_scale_names_valid', () => {
    expect(() => CoordinateSchema.parse({ type: 'ternary2D', a: 'as' })).not.toThrow();
  });

  it('ternary2d_empty_a_rejected', () => {
    expect(() => CoordinateSchema.parse({ type: 'ternary2D', a: '' })).toThrow();
  });

  // 回归 + round-trip
  it('ternary2d_union_regression', () => {
    expect(CoordinateSchema.parse({ type: 'cartesian1D' }).type).toBe('cartesian1D');
    expect(CoordinateSchema.parse({ type: 'ternary2D' }).type).toBe('ternary2D');
  });

  it('ternary2d_json_round_trip', () => {
    const ir = CoordinateSchema.parse({ type: 'ternary2D', a: 'as', b: 'bs', c: 'cs' });
    expect(CoordinateSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});
