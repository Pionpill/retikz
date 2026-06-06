import { describe, expect, it } from 'vitest';
import { AxisGuideSchema, GuideSchema } from '../../src/ir/guide';

describe('GuideSchema (ADR-01 alpha.2)', () => {
  // Happy path
  it('axis_x_valid', () => {
    const guide = { type: 'axis', dimension: 'x' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_y_full_valid', () => {
    const guide = { type: 'axis', dimension: 'y', tickCount: 5, grid: true, tickLabels: false, id: 'yAxis' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_with_grid_valid', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // 边界
  it('axis_omits_optional_valid', () => {
    const guide = { type: 'axis', dimension: 'y' };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('guide_unknown_type_rejected', () => {
    // grid 已不是独立 type；legend 尚未纳入
    expect(() => GuideSchema.parse({ type: 'grid', dimension: 'y' })).toThrow();
    expect(() => GuideSchema.parse({ type: 'legend', dimension: 'y' })).toThrow();
  });

  it('guide_missing_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis' })).toThrow();
  });

  it('guide_bad_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'z' })).toThrow();
  });

  it('axis_tickcount_non_positive_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', tickCount: 0 })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', tickCount: -1 })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', tickCount: 2.5 })).toThrow();
  });

  it('axis_grid_non_boolean_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', grid: 'yes' })).toThrow();
  });

  // 交互
  it('guide_roundtrip', () => {
    const guide = { type: 'axis', dimension: 'y', tickCount: 4, grid: true, tickLabels: true, id: 'yA' };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});

describe('GuideSchema polar dimensions (ADR-04)', () => {
  // Happy path：polar 角向 / 径向维度新成员被接受（非破坏扩展）
  it('axis_angle_dimension_valid', () => {
    const guide = { type: 'axis', dimension: 'angle' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_radius_dimension_valid', () => {
    const guide = { type: 'axis', dimension: 'radius' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_radius_with_grid_valid', () => {
    // 径向轴 + grid（同心环）：grid 子属性在 polar 维度上同样合法
    const guide = { type: 'axis', dimension: 'radius', grid: true, tickCount: 4 };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径：非法 polar 维度别名（theta 不是合法成员）被拒
  it('axis_theta_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'theta' })).toThrow();
  });

  // 交互：polar 维度 JSON round-trip 保形
  it('polar_guide_roundtrip', () => {
    const guide = { type: 'axis', dimension: 'angle', grid: true, tickLabels: false, id: 'angularAxis' };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});
