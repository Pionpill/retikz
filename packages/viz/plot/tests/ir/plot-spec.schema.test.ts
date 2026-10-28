import { describe, expect, it } from 'vitest';

import * as plotSchemas from '../../src/schemas/plot';
import { PlotSchema } from '../../src/schemas/plot';

type FacetConfigurationSchemaContract = {
  parse: (input: unknown) => unknown;
  safeParse: (
    input: unknown,
  ) => { success: true; data: unknown } | { success: false; error: { issues: Array<{ path: Array<PropertyKey> }> } };
};

type RuntimeSchemaContract = {
  parse: (input: unknown) => unknown;
  safeParse: (input: unknown) => { success: boolean };
};

const runtimeSchemaOf = (name: string): RuntimeSchemaContract => {
  const schema = (plotSchemas as Record<string, unknown>)[name];

  expect(schema, `Plot schemas must export ${name}`).toBeDefined();
  return schema as RuntimeSchemaContract;
};

const plotFacetConfigurationSchema = (): FacetConfigurationSchemaContract => {
  const schema = (plotSchemas as Record<string, unknown>).PlotFacetConfigurationSchema;

  expect(schema, 'Plot schemas must export PlotFacetConfigurationSchema').toBeDefined();
  return schema as FacetConfigurationSchemaContract;
};

const baseLine = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue', nice: true },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [
    {
      contributeToDomain: true,
      type: 'path',
      encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } },
    },
  ],
};

describe('PlotSchema（契约）', () => {
  // Happy path
  it('绘图根线有效', () => {
    expect(PlotSchema.parse(baseLine)).toEqual(baseLine);
  });

  it('绘制具有 id 和元有效的根', () => {
    const spec = { ...baseLine, id: 'sales-chart', meta: { source: 'contract-example' } };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('仅绘制空白 id 被拒绝', () => {
    expect(PlotSchema.safeParse({ ...baseLine, id: '   ' }).success).toBe(false);
  });

  it('绘图根省略有效选项', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'xs' }],
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'xs' },
      marks: [
        { contributeToDomain: true, type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('绘制在后面的名称路径中拒绝的重复比例名称', () => {
    const result = PlotSchema.safeParse({
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
  it('绘图标记空数组被拒绝', () => {
    expect(() => PlotSchema.parse({ ...baseLine, marks: [] })).toThrow();
  });

  it('绘图元嵌套 json 有效', () => {
    const spec = { ...baseLine, meta: { a: { b: [1, true, null] } } };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  // 错误路径
  it('绘图缺少命名空间被拒绝', () => {
    const rest = {
      type: 'plot',
      data: baseLine.data,
      scales: baseLine.scales,
      coordinate: baseLine.coordinate,
      marks: baseLine.marks,
    };

    expect(() => PlotSchema.parse(rest)).toThrow();
  });

  it('绘制错误的类型字面量被拒绝', () => {
    expect(() => PlotSchema.parse({ ...baseLine, type: 'chart' })).toThrow();
  });

  it('绘制元函数值被拒绝', () => {
    expect(() => PlotSchema.parse({ ...baseLine, meta: { f: () => 1 } })).toThrow();
  });

  it('拒绝绘制数据内联值', () => {
    // 数据不进 IR：data 槽位无 reference（旧内联形态）被拒
    expect(() => PlotSchema.parse({ ...baseLine, data: { values: [{ x: 1 }] } })).toThrow();
  });

  // 交互
  it('绘图多标记层有效', () => {
    const spec = {
      ...baseLine,
      marks: [
        {
          contributeToDomain: true,
          type: 'path',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
        {
          contributeToDomain: true,
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
      ],
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('引用未知比例尺名称的坐标配置通过 schema 校验', () => {
    // 引用完整性是 lowering 的校验，非 schema 职责
    const spec = { ...baseLine, coordinate: { type: 'cartesian2D', x: 'nope', y: 'missing' } };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('自定义坐标操作类型通过 schema 校验并保持往返等价', () => {
    const spec = { ...baseLine, coordinate: { type: 'arch', x: 'xMonth', archHeight: 30 } };

    expect(PlotSchema.parse(JSON.parse(JSON.stringify(spec)))).toEqual(spec);
  });

  it('兼容性检查拒绝未注册的自定义坐标形态', () => {
    const spec = {
      ...baseLine,
      coordinate: { type: 'custom', name: 'arch', roles: ['x'], params: { archHeight: 30 } },
    };

    expect(() => PlotSchema.parse(spec)).toThrow();
  });

  // guides are optional schema-level plot annotations.
  it('带有有效辅助线的绘图', () => {
    const spec = {
      ...baseLine,
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ],
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it('绘图省略有效辅助线', () => {
    // compat: specs without guides remain valid.
    expect(PlotSchema.parse(baseLine)).toEqual(baseLine);
  });

  it('绘图空辅助线有效', () => {
    const spec = { ...baseLine, guides: [] };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });

  it.each([
    ['layout', { ...baseLine, layout: { autoPadding: true } }],
    ['labels', { ...baseLine, labels: [{ type: 'text', role: 'title', text: 'Monthly Revenue' }] }],
  ])('绘图呈现字段 %s 被拒绝', (_field, spec) => {
    expect(PlotSchema.safeParse(spec).success).toBe(false);
  });

  it('绘图主题标签文本被拒绝', () => {
    expect(
      PlotSchema.safeParse({
        ...baseLine,
        defaultPlot: { labelText: { textColor: '#111111', font: { size: 14 } } },
      }).success,
    ).toBe(false);
  });

  it('引导线与标记共存', () => {
    const spec = {
      ...baseLine,
      marks: [
        {
          contributeToDomain: true,
          type: 'path',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
        {
          contributeToDomain: true,
          type: 'point',
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    };

    expect(PlotSchema.parse(spec)).toEqual(spec);
  });
});

describe('PlotFacetConfigurationSchema', () => {
  it('往返 JSON 安全的编写方面事实', () => {
    const configuration = {
      id: 'species',
      row: [{ field: 'island' }, { field: 'sex', order: ['female', 'male', null] }],
      column: { field: 'species' },
      empty: 'show',
      header: { row: true, column: { rotate: -30 } },
      resolve: { scale: { x: 'shared', y: 'independent' }, axis: { x: 'outer' }, grid: { y: 'all' } },
      spacing: { panelGap: 12, labelGap: 4 },
    };

    expect(plotFacetConfigurationSchema().parse(JSON.parse(JSON.stringify(configuration)))).toEqual(configuration);
  });

  it('拒绝行路径上没有行或列的配置', () => {
    const result = plotFacetConfigurationSchema().safeParse({ id: 'species' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: ['row'] })]));
    }
  });

  it.each(['view', 'coordinate', 'viewIdTemplate'])('拒绝仅 Plot 的 %s 控制', field => {
    const result = plotFacetConfigurationSchema().safeParse({
      id: 'species',
      column: { field: 'species' },
      [field]: field === 'coordinate' ? { type: 'cartesian2D' } : 'template',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'unrecognized_keys', keys: [field], path: [] })]),
      );
    }
  });
});

describe('Plot 分区编写 schema', () => {
  it('导出可重用分区和构面选项 schema', () => {
    expect(runtimeSchemaOf('PlotPartitionScalarSchema').parse(-0)).toBe(-0);
    expect(runtimeSchemaOf('PlotPartitionDimensionSchema').parse({ field: 'metric', order: ['cpu', null] })).toEqual({
      field: 'metric',
      order: ['cpu', null],
    });
    expect(runtimeSchemaOf('PlotFacetOptionsSchema').parse({ empty: 'show', spacing: { panelGap: 12 } })).toEqual({
      empty: 'show',
      spacing: { panelGap: 12 },
    });
  });

  it('拒绝非有限分区标量', () => {
    expect(runtimeSchemaOf('PlotPartitionScalarSchema').safeParse(Number.NaN).success).toBe(false);
    expect(runtimeSchemaOf('PlotPartitionScalarSchema').safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
  });
});
