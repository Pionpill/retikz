import type { IRNode, IRScope } from '@retikz/core';
import type { DataFieldTypeValue } from '@retikz/data';

import { DataFieldType, defineTransform } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { BUILTIN_NODE_CHANNELS, SIZE_MAX_RADIUS, SIZE_MIN_RADIUS } from '../../../src/providers';
import { PlotSpecSchema } from '../../../src/schemas';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

/** size channel 集成测试使用的派生字段 transform 判别值 */
const SizeChannelTestTransform = {
  DeriveValue: 'size-channel-test-derive-value',
} as const;

/** 为每行写入指定派生值，用于验证 transform 输出字段的最终类型推断 */
const deriveSizeValueTransform = defineTransform({
  schema: z
    .strictObject({
      kind: z
        .literal(SizeChannelTestTransform.DeriveValue)
        .describe('Discriminator for the size channel test transform'),
      as: z.string().min(1).describe('Output field receiving the derived value'),
      value: z.union([z.string(), z.number()]).describe('Scalar value written to every output row'),
    })
    .describe('Test-only transform that writes a derived size field'),
  outputFields: operation => [operation.as],
  apply: (rows, operation) => rows.map(row => ({ ...row, [operation.as]: operation.value })),
});

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 Node；颜色分组时 Node 可能位于子 Scope */
const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 读取 Node.minimumSize；它等于逐节点半径乘以 √2 */
const sizeOf = (node: IRNode): number | undefined => (node as { minimumSize?: number }).minimumSize;
const radiusOf = (node: IRNode): number | undefined => {
  const ms = sizeOf(node);
  return ms === undefined ? undefined : ms / Math.SQRT2;
};

const pointSpec = (
  size: { kind: 'field'; value: string; scale?: string } | { kind: 'constant'; value: number } | undefined,
  extraScales: Array<Record<string, unknown>> = [],
  model?: Array<{ name: string; type?: DataFieldTypeValue; format?: string }>,
): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', ...(model === undefined ? {} : { model }) },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, ...extraScales],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', ...(size ? { size } : {}), encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

const derivedSizePointSpec = (value: string | number): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        transform: [{ kind: SizeChannelTestTransform.DeriveValue, as: 'derivedSize', value }],
        size: { kind: 'field', value: 'derivedSize' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
  });

const sizeResolutionOf = (
  size: { kind: 'field'; value: string; scale?: string },
  rows: Array<Record<string, unknown>>,
  extraScales: Array<Record<string, unknown>> = [],
  options: {
    fieldType?: DataFieldTypeValue;
    model?: Array<{ name: string; type?: DataFieldTypeValue }>;
  } = {},
) => {
  const node = pointSpec(size, extraScales, options.model);
  const resolution = BUILTIN_NODE_CHANNELS.size.resolve({
    node,
    rows,
    fieldTypes: new Map([[size.value, options.fieldType ?? DataFieldType.Continuous]]),
  })(node.marks[0]);
  expect(resolution).toBeDefined();
  if (resolution === undefined) throw new Error('expected field-bound size resolution');
  return resolution;
};

describe('size channel 映射节点半径', () => {
  // sqrt 半径映射：domain [0,16]、range [MIN,MAX] 时，v=4 映射到半程半径
  it('size_field_maps_radius_by_sqrt', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 4 },
      { x: 2, y: 2, p: 16 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    const radii = nodes.map(radiusOf);
    expect(radii[0]).toBeCloseTo(SIZE_MIN_RADIUS, 6); // p=0 位于 domain 下界，映射到 MIN
    expect(radii[2]).toBeCloseTo(SIZE_MAX_RADIUS, 6); // p=16 是最大正值，映射到 MAX
    const mid = SIZE_MIN_RADIUS + 0.5 * (SIZE_MAX_RADIUS - SIZE_MIN_RADIUS);
    expect(radii[1]).toBeCloseTo(mid, 6); // p=4 是 sqrt 映射的中点
  });

  // 常量 value 直接表示最终半径，不经过 scale
  it('size_value_is_final_radius_bypassing_scale', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'constant', value: 8 }), { d: data }, cartOpts));
    expect(nodes.every(n => radiusOf(n) !== undefined && Math.abs(radiusOf(n)! - 8) < 1e-6)).toBe(true);
  });

  // size 与 color 独立生效：半径逐节点解析，颜色按值分组
  it('size_with_color_both_apply', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          size: { kind: 'field', value: 'p' },
          color: { kind: 'field', value: 'g', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, p: 1, g: 'a' },
      { x: 1, y: 1, p: 4, g: 'b' },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }, cartOpts));
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => radiusOf(n) !== undefined)).toBe(true);
  });
});

describe('size channel 边界输入', () => {
  it('field_size_omits_glyphs_for_missing_null_and_non_finite_values', () => {
    const data = [
      { x: 0, y: 0, p: undefined },
      { x: 1, y: 1, p: null },
      { x: 2, y: 2, p: Number.NaN },
      { x: 3, y: 3, p: Number.POSITIVE_INFINITY },
      { x: 4, y: 4, p: 9 },
    ];
    const nodes = collectNodes(
      firstLayer(
        pointSpec({ kind: 'field', value: 'p' }),
        { d: data },
        { ...cartOpts, provenance: true, datumProvenance: true },
      ),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.meta).toMatchObject({ transformedIndex: 4 });
    expect(radiusOf(nodes[0])).toBeCloseTo(SIZE_MAX_RADIUS, 6);
  });

  it('field_size_does_not_filter_generic_point_text_mode', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          size: { kind: 'field', value: 'p' },
          encoding: { x: { field: 'x' }, y: { field: 'y' }, text: { field: 'name' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, p: undefined, name: 'missing' },
      { x: 1, y: 1, p: null, name: 'null' },
      { x: 2, y: 2, p: Number.NaN, name: 'nan' },
      { x: 3, y: 3, p: Number.POSITIVE_INFINITY, name: 'infinity' },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }, { ...cartOpts, provenance: true, datumProvenance: true }));

    expect(nodes.map(node => node.text)).toEqual(['missing', 'null', 'nan', 'infinity']);
    expect(nodes.map(node => node.meta?.transformedIndex)).toEqual([0, 1, 2, 3]);
  });

  it('no_positive_values_all_min_radius', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 0 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MIN_RADIUS) < 1e-6)).toBe(true);
  });

  it('single_positive_value_maps_to_range_top', () => {
    const data = [
      { x: 0, y: 0, p: 7 },
      { x: 1, y: 1, p: 7 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts));
    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MAX_RADIUS) < 1e-6)).toBe(true);
  });

  it('empty_data_no_nodes', () => {
    const outer = expandOf(pointSpec({ kind: 'field', value: 'p' }), { d: [] }, cartOpts);
    expect(outer.children).toHaveLength(0);
  });

  it('empty_data_preserves_explicit_sqrt_definition_in_resolver_and_descriptor', () => {
    const resolution = sizeResolutionOf(
      { kind: 'field', value: 'p', scale: 'sizeScale' },
      [],
      [{ type: 'sqrt', name: 'sizeScale', domain: [0, 16], range: [3, 11] }],
    );

    expect(resolution.resolver({ p: 4 })).toBeCloseTo(7, 6);
    expect(resolution.descriptor).toMatchObject({
      channel: 'size',
      scaleName: 'sizeScale',
      scaleType: 'sqrt',
      domain: [0, 16],
      range: [3, 11],
      field: 'p',
    });
  });

  it.each([
    ['empty', []],
    ['all-missing', [{ p: undefined }, { p: null }, { p: Number.NaN }]],
  ])('untyped_%s_rows_preserve_the_size_descriptor', (_label, rows) => {
    const resolution = sizeResolutionOf({ kind: 'field', value: 'p' }, rows, [], {
      fieldType: DataFieldType.Categorical,
    });

    expect(resolution.descriptor).toMatchObject({
      channel: 'size',
      field: 'p',
      scaleName: '__size_p',
      scaleType: 'sqrt',
    });
    expect(resolution.descriptor?.fieldType).toBeUndefined();
  });

  it('all_zero_data_uses_explicit_sqrt_range_in_resolver_and_descriptor', () => {
    const rows = [{ p: 0 }, { p: 0 }];
    const resolution = sizeResolutionOf({ kind: 'field', value: 'p', scale: 'sizeScale' }, rows, [
      { type: 'sqrt', name: 'sizeScale', domain: [0, 16], range: [3, 11] },
    ]);

    expect(rows.map(row => resolution.resolver(row))).toEqual([3, 3]);
    expect(resolution.descriptor).toMatchObject({
      scaleName: 'sizeScale',
      domain: [0, 16],
      range: [3, 11],
    });
  });

  it('derived_all_zero_scale_reports_the_effective_constant_range', () => {
    const rows = [{ p: 0 }, { p: 0 }];
    const resolution = sizeResolutionOf({ kind: 'field', value: 'p' }, rows);

    expect(rows.map(row => resolution.resolver(row))).toEqual([SIZE_MIN_RADIUS, SIZE_MIN_RADIUS]);
    expect(resolution.descriptor).toMatchObject({
      domain: [0, 0],
      range: [SIZE_MIN_RADIUS, SIZE_MIN_RADIUS],
    });
  });

  it('explicit_degenerate_domain_uses_the_formal_sqrt_mapping', () => {
    const resolution = sizeResolutionOf(
      { kind: 'field', value: 'p', scale: 'sizeScale' },
      [],
      [{ type: 'sqrt', name: 'sizeScale', domain: [5, 5], range: [3, 11] }],
    );

    expect(resolution.resolver({ p: 5 })).toBeCloseTo(7, 6);
    expect(resolution.descriptor).toMatchObject({ domain: [5, 5], range: [3, 11] });
  });

  it('nice_sqrt_scale_exposes_the_domain_used_by_the_resolver', () => {
    const resolution = sizeResolutionOf(
      { kind: 'field', value: 'p', scale: 'sizeScale' },
      [{ p: 2.5 }],
      [{ type: 'sqrt', name: 'sizeScale', domain: [0, 9.1], range: [3, 11], nice: true }],
    );

    expect(resolution.resolver({ p: 2.5 })).toBeCloseTo(7, 6);
    expect(resolution.descriptor).toMatchObject({ domain: [0, 10], range: [3, 11] });
  });

  it('single_positive_default_scale_keeps_resolver_and_descriptor_identity_aligned', () => {
    const rows = [{ p: 7 }];
    const resolution = sizeResolutionOf({ kind: 'field', value: 'p' }, rows);

    expect(resolution.resolver(rows[0])).toBeCloseTo(SIZE_MAX_RADIUS, 6);
    expect(resolution.descriptor).toMatchObject({
      scaleName: '__size_p',
      domain: [0, 7],
      range: [SIZE_MIN_RADIUS, SIZE_MAX_RADIUS],
    });
  });

  it('no_size_channel_keeps_default_uniform_size', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }, cartOpts));
    expect(nodes.every(n => sizeOf(n) === undefined)).toBe(true);
  });
});

describe('size channel 错误输入', () => {
  it.each([
    ['categorical', 'large'],
    ['temporal', '2026-08-02'],
  ])('observed_derived_%s_size_field_fails_loud', (_label, value) => {
    expect(() =>
      expandOf(
        derivedSizePointSpec(value),
        { d: [{ x: 0, y: 0 }] },
        { ...cartOpts, transformDefinitions: [deriveSizeValueTransform] },
      ),
    ).toThrow(/size requires a continuous field/);
  });

  it('observed_derived_continuous_size_descriptor_reports_its_type', () => {
    const node = pointSpec({ kind: 'field', value: 'derivedSize' });
    const resolution = BUILTIN_NODE_CHANNELS.size.resolve({
      node,
      rows: [{ derivedSize: 4 }],
      fieldTypes: new Map(),
      fieldTypeEvidence: new Set(),
    })(node.marks[0]);

    expect(resolution?.descriptor?.fieldType).toBe(DataFieldType.Continuous);
  });

  it('resolve_field_type_overrides_model_for_size_validation', () => {
    const rows = [{ x: 0, y: 0, p: 4 }];
    const model = [
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
    ];
    const resolver =
      (type: DataFieldTypeValue): LowerPlotsOptions['resolveField'] =>
      field =>
        field === 'p' ? { type } : undefined;

    expect(() =>
      expandOf(
        pointSpec({ kind: 'field', value: 'p' }, [], [...model, { name: 'p', type: DataFieldType.Categorical }]),
        { d: rows },
        { ...cartOpts, resolveField: resolver(DataFieldType.Continuous) },
      ),
    ).not.toThrow();
    expect(() =>
      expandOf(
        pointSpec({ kind: 'field', value: 'p' }, [], [...model, { name: 'p', type: DataFieldType.Continuous }]),
        { d: rows },
        { ...cartOpts, resolveField: resolver(DataFieldType.Categorical) },
      ),
    ).toThrow(/size requires a continuous field/);
  });

  it('resolve_field_type_overrides_format_and_runs_once_per_field', () => {
    const spec = pointSpec(
      { kind: 'field', value: 'p' },
      [],
      [
        { name: 'x', type: DataFieldType.Continuous },
        { name: 'y', type: DataFieldType.Continuous },
        { name: 'p', format: 'iso' },
      ],
    );
    let sizeFieldCalls = 0;
    const resolveField: LowerPlotsOptions['resolveField'] = field => {
      if (field !== 'p') return undefined;
      sizeFieldCalls += 1;
      return { type: DataFieldType.Continuous };
    };

    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, p: undefined }] }, { ...cartOpts, resolveField })).not.toThrow();
    expect(sizeFieldCalls).toBe(1);
  });

  it('mark_local_same_name_transform_keeps_source_type_evidence', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'x', type: DataFieldType.Continuous },
          { name: 'y', type: DataFieldType.Continuous },
          { name: 'p', type: DataFieldType.Categorical },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          transform: [{ kind: 'normalize', field: 'p', as: 'p' }],
          size: { kind: 'field', value: 'p' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });

    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, p: 'large' }] }, cartOpts)).toThrow(
      /size requires a continuous field/,
    );
  });

  it.each([
    ['empty', []],
    ['all-missing', [{ x: 0, y: 0, p: undefined }]],
  ])('resolve_field_type_remains_authoritative_for_%s_rows', (_label, rows) => {
    const spec = pointSpec({ kind: 'field', value: 'p' });
    const resolveField: LowerPlotsOptions['resolveField'] = field =>
      field === 'p' ? { type: DataFieldType.Categorical } : undefined;

    expect(() => expandOf(spec, { d: rows }, { ...cartOpts, resolveField })).toThrow(
      /size requires a continuous field/,
    );
  });

  it('format_implied_type_remains_authoritative_for_all_missing_rows', () => {
    const spec = pointSpec(
      { kind: 'field', value: 'p' },
      [],
      [
        { name: 'x', type: DataFieldType.Continuous },
        { name: 'y', type: DataFieldType.Continuous },
        { name: 'p', format: 'iso' },
      ],
    );

    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, p: undefined }] }, cartOpts)).toThrow(
      /size requires a continuous field/,
    );
  });

  it.each([
    ['categorical', DataFieldType.Categorical],
    ['temporal', DataFieldType.Temporal],
  ])('explicit_%s_size_field_fails_for_positive_empty_and_all_missing_rows', (_label, fieldType) => {
    const model = [{ name: 'p', type: fieldType }];
    const rowSets = [[{ p: 4 }], [], [{ p: undefined }, { p: null }, { p: Number.NaN }]];

    for (const rows of rowSets) {
      expect(() => sizeResolutionOf({ kind: 'field', value: 'p' }, rows, [], { fieldType, model })).toThrow(
        /size requires a continuous field/,
      );
    }
  });

  it.each([
    ['categorical', [{ x: 0, y: 0, p: 'large' }]],
    ['temporal', [{ x: 0, y: 0, p: '2026-08-02' }]],
  ])('observed_untyped_%s_size_field_fails_loud', (_label, rows) => {
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'p' }), { d: rows }, cartOpts)).toThrow(
      /size requires a continuous field/,
    );
  });

  it('negative_field_value_fails_loud', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: -3 },
    ];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'p' }), { d: data }, cartOpts)).toThrow(/negative/);
  });

  it('unknown_size_scale_fails_loud', () => {
    const data = [{ x: 0, y: 0, p: 1 }];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'p', scale: 'nope' }), { d: data }, cartOpts)).toThrow(
      /unknown scale/,
    );
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('unknown_size_scale_fails_loud_for_%s_rows', (_label, rows) => {
    expect(() => sizeResolutionOf({ kind: 'field', value: 'p', scale: 'nope' }, rows)).toThrow(/unknown scale/);
  });

  it('non_sqrt_size_scale_fails_loud', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: 4 },
    ];
    const spec = pointSpec({ kind: 'field', value: 'p', scale: 'mySize' }, [{ type: 'linear', name: 'mySize' }]);
    expect(() => expandOf(spec, { d: data }, cartOpts)).toThrow(/must be a sqrt scale/);
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('non_sqrt_size_scale_fails_loud_for_%s_rows', (_label, rows) => {
    expect(() =>
      sizeResolutionOf({ kind: 'field', value: 'p', scale: 'mySize' }, rows, [{ type: 'linear', name: 'mySize' }]),
    ).toThrow(/must be a sqrt scale/);
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('negative_degenerate_sqrt_domain_fails_loud_for_%s_rows', (_label, rows) => {
    expect(() =>
      sizeResolutionOf({ kind: 'field', value: 'p', scale: 'sizeScale' }, rows, [
        { type: 'sqrt', name: 'sizeScale', domain: [-1, -1] },
      ]),
    ).toThrow(/domain must be non-negative/);
  });

  it('field_size_descriptor_uses_explicit_scale_identity', () => {
    const resolution = sizeResolutionOf(
      { kind: 'field', value: 'p', scale: 'mySize' },
      [{ p: 4 }],
      [{ type: 'sqrt', name: 'mySize' }],
    );

    expect(resolution.descriptor?.scaleName).toBe('mySize');
  });
});
