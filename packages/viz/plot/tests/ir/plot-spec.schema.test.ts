import { describe, expect, it } from 'vitest';

import { PlotSpecSchema } from '../../src/schemas/plot';

const baseLine = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue', nice: true },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
};

describe('PlotSpecSchema (contract)', () => {
  // Happy path
  it('plot_root_line_valid', () => {
    expect(PlotSpecSchema.parse(baseLine)).toEqual(baseLine);
  });

  it('plot_root_with_id_and_meta_valid', () => {
    const spec = { ...baseLine, id: 'sales-chart', meta: { source: 'contract-example' } };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('plot_root_omits_optionals_valid', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs' }],
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'xs' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('plot_duplicate_scale_name_rejected_at_later_name_path', () => {
    const result = PlotSpecSchema.safeParse({
      ...baseLine,
      scales: [
        { type: 'linear', name: 'shared' },
        { type: 'band', name: 'shared' },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['scales', 1, 'name'] })]),
      );
    }
  });

  // 边界
  it('plot_marks_empty_array_rejected', () => {
    expect(() => PlotSpecSchema.parse({ ...baseLine, marks: [] })).toThrow();
  });

  it('plot_meta_nested_json_valid', () => {
    const spec = { ...baseLine, meta: { a: { b: [1, true, null] } } };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  // 错误路径
  it('plot_missing_namespace_rejected', () => {
    const rest = {
      type: 'plot',
      data: baseLine.data,
      scales: baseLine.scales,
      coordinate: baseLine.coordinate,
      marks: baseLine.marks,
    };
    expect(() => PlotSpecSchema.parse(rest)).toThrow();
  });

  it('plot_wrong_type_literal_rejected', () => {
    expect(() => PlotSpecSchema.parse({ ...baseLine, type: 'chart' })).toThrow();
  });

  it('plot_meta_function_value_rejected', () => {
    expect(() => PlotSpecSchema.parse({ ...baseLine, meta: { f: () => 1 } })).toThrow();
  });

  it('plot_data_inline_values_rejected', () => {
    // 数据不进 IR：data 槽位无 reference（旧内联形态）被拒
    expect(() => PlotSpecSchema.parse({ ...baseLine, data: { values: [{ x: 1 }] } })).toThrow();
  });

  // 交互
  it('plot_multi_mark_layers_valid', () => {
    const spec = {
      ...baseLine,
      marks: [
        { type: 'path', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
    };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('coordinate_references_unknown_scale_name_schema_passes', () => {
    // 引用完整性是 lowering 的校验，非 schema 职责
    const spec = { ...baseLine, coordinate: { type: 'cartesian2D', x: 'nope', y: 'missing' } };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('custom_coordinate_op_type_schema_passes_and_round_trips', () => {
    const spec = { ...baseLine, coordinate: { type: 'arch', x: 'xMonth', archHeight: 30 } };
    expect(PlotSpecSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('compat_rejects_unregistered_custom_coordinate_shape', () => {
    const spec = {
      ...baseLine,
      coordinate: { type: 'custom', name: 'arch', roles: ['x'], params: { archHeight: 30 } },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  // guides are optional schema-level plot annotations.
  it('plot_with_guides_valid', () => {
    const spec = {
      ...baseLine,
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it('plot_omits_guides_valid', () => {
    // compat: specs without guides remain valid.
    expect(PlotSpecSchema.parse(baseLine)).toEqual(baseLine);
  });

  it('plot_empty_guides_valid', () => {
    const spec = { ...baseLine, guides: [] };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });

  it.each([
    ['layout', { ...baseLine, layout: { autoPadding: true } }],
    ['labels', { ...baseLine, labels: [{ type: 'text', role: 'title', text: 'Monthly Revenue' }] }],
  ])('plot_presentation_field_%s_is_rejected', (_field, spec) => {
    expect(PlotSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('plot_theme_label_text_is_rejected', () => {
    expect(
      PlotSpecSchema.safeParse({
        ...baseLine,
        plotTheme: { labelText: { textColor: '#111111', font: { size: 14 } } },
      }).success,
    ).toBe(false);
  });

  it('guides_coexist_with_marks', () => {
    const spec = {
      ...baseLine,
      marks: [
        { type: 'path', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    expect(PlotSpecSchema.parse(spec)).toEqual(spec);
  });
});
