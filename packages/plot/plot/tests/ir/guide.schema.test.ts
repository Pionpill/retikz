import { describe, expect, it } from 'vitest';
import { AxisGuideSchema, GuideSchema, LegendGuideSchema } from '../../src/ir/guide';

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
    // grid 不是独立 type；legend 已纳入 union，但缺 channel 的 legend（仅给 dimension）仍非法
    expect(() => GuideSchema.parse({ type: 'grid', dimension: 'y' })).toThrow();
    expect(() => GuideSchema.parse({ type: 'legend', dimension: 'y' })).toThrow();
  });

  it('guide_missing_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis' })).toThrow();
  });

  it('guide_bad_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'z' })).toThrow();
  });

  // alpha.9 ADR-03：ternary 三角轴维度 a / b / c
  it('axis_ternary_abc_dimensions_valid', () => {
    for (const dimension of ['a', 'b', 'c']) {
      expect(AxisGuideSchema.parse({ type: 'axis', dimension })).toEqual({ type: 'axis', dimension });
    }
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

describe('LegendGuideSchema (ADR-03 alpha.8)', () => {
  // Happy path
  it('legend_minimal_valid', () => {
    // 最小合法 legend：仅 type + channel
    const guide = { type: 'legend', channel: 'color' };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('legend_all_fields_valid', () => {
    const guide = {
      type: 'legend',
      channel: 'size',
      scale: '__size_population',
      title: 'Population',
      position: 'bottom',
      orient: 'horizontal',
      tickCount: 4,
      tickLabels: true,
    };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('legend_each_channel_valid', () => {
    for (const channel of ['color', 'size', 'opacity', 'shape'] as const) {
      expect(LegendGuideSchema.parse({ type: 'legend', channel })).toEqual({ type: 'legend', channel });
    }
  });

  it('legend_each_position_valid', () => {
    for (const position of ['right', 'left', 'top', 'bottom'] as const) {
      const guide = { type: 'legend', channel: 'color', position };
      expect(LegendGuideSchema.parse(guide)).toEqual(guide);
    }
  });

  // 边界：可选字段省略
  it('legend_omits_optional_valid', () => {
    const guide = { type: 'legend', channel: 'opacity' };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('legend_missing_channel_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend' })).toThrow();
  });

  it('legend_bad_channel_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'x' })).toThrow();
  });

  it('legend_bad_position_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', position: 'center' })).toThrow();
  });

  it('legend_bad_orient_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', orient: 'diagonal' })).toThrow();
  });

  it('legend_empty_scale_rejected', () => {
    // scale 给了但为空串 → min(1) 拒
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', scale: '' })).toThrow();
  });

  it('legend_tickcount_non_positive_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickCount: 0 })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickCount: -2 })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickCount: 3.5 })).toThrow();
  });

  it('legend_ticklabels_non_boolean_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickLabels: 'yes' })).toThrow();
  });
});

describe('GuideSchema discriminated union (ADR-03 alpha.8)', () => {
  // union 判别：axis 仍合法（回归）
  it('union_accepts_axis', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // union 判别：legend 合法
  it('union_accepts_legend', () => {
    const guide = { type: 'legend', channel: 'color', position: 'right' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // type 缺失 → union 无法判别 → 报错可定位到 type
  it('union_missing_type_rejected_at_type_path', () => {
    const result = GuideSchema.safeParse({ channel: 'color' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // type 拼错 → union 无合法成员 → 报错可定位
  it('union_bad_type_rejected', () => {
    const result = GuideSchema.safeParse({ type: 'lgend', channel: 'color' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // zod parse 错误路径：legend 缺 channel → issue.path 定位到 channel
  it('union_legend_missing_channel_path', () => {
    const result = GuideSchema.safeParse({ type: 'legend' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('channel'))).toBe(true);
    }
  });

  // JSON round-trip：legend 全字段保形
  it('legend_roundtrip_full', () => {
    const guide = {
      type: 'legend',
      channel: 'color',
      scale: '__color',
      title: 'Density',
      position: 'left',
      orient: 'vertical',
      tickCount: 5,
      tickLabels: false,
    };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  // JSON round-trip：axis（回归 union 后仍保形）
  it('axis_roundtrip_through_union', () => {
    const guide = { type: 'axis', dimension: 'y', tickCount: 4, grid: true };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});
