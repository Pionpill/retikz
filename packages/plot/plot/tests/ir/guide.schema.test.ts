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
