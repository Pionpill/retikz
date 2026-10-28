import type { IRNode, IRScope } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import { DataFieldType, defineTransform } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { number, strictObject, string, union } from 'zod';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { BUILTIN_NODE_CHANNELS, SIZE_MAX_RADIUS } from '../../../src/providers';
import type { IRPlot, IRPlotChannel } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const cartOpts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

/** size channel 集成测试使用的派生字段 transform 判别值 */
const SizeChannelTestTransform = {
  DeriveValue: 'size-channel-test-derive-value',
} as const;

/** 为每行写入指定派生值，用于验证 transform 输出字段的最终类型推断 */
const deriveSizeValueTransform = defineTransform({
  kind: SizeChannelTestTransform.DeriveValue,
  paramsSchema: strictObject({
    as: NonBlankStringSchema.describe('Output field receiving the derived value'),
    value: union([string(), number()]).describe('Scalar value written to every output row'),
  }).describe('Test-only transform that writes a derived size field'),
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const deriveSizeValueTransformImplementation = defineTransformImplementation({
  definition: deriveSizeValueTransform,
  apply: (rows, operation) => rows.map(row => ({ ...row, [operation.params.as]: operation.params.value })),
});

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
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
const sizeOf = (node: IRNode): number | undefined =>
  typeof node.layout?.minimumSize === 'number' ? node.layout.minimumSize : undefined;

const radiusOf = (node: IRNode): number | undefined => {
  const ms = sizeOf(node);
  return ms === undefined ? undefined : ms / Math.SQRT2;
};

const pointSpec = (
  size: IRPlotChannel | number | undefined,
  extraScales: Array<Record<string, unknown>> = [],
  model?: Array<{ name: string; type?: DataFieldType; format?: string }>,
): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', ...(model === undefined ? {} : { model }) },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, ...extraScales],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        encodings: {
          position: { x: { field: 'x' }, y: { field: 'y' } },
          ...(typeof size === 'number' ? {} : { size }),
        },
        properties: typeof size === 'number' ? { size } : {},
      },
    ],
  });

const derivedSizePointSpec = (value: string | number): IRPlot =>
  PlotSchema.parse({
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
        transforms: [
          { operation: { kind: SizeChannelTestTransform.DeriveValue, params: { as: 'derivedSize', value } } },
        ],
        encodings: { size: 'derivedSize', position: { x: { field: 'x' }, y: { field: 'y' } } },
      },
    ],
  });

const sizeResolutionOf = (
  size: IRPlotChannel,
  rows: Array<Record<string, unknown>>,
  extraScales: Array<Record<string, unknown>> = [],
  options: {
    fieldType?: DataFieldType;
    model?: Array<{ name: string; type?: DataFieldType }>;
  } = {},
) => {
  const node = pointSpec(size, extraScales, options.model);
  const resolution = BUILTIN_NODE_CHANNELS.size.resolve(
    {
      node,
      rows,
      model: [
        {
          name: typeof size === 'string' ? size : size.field,
          ...(options.fieldType === undefined ? {} : { type: options.fieldType }),
        },
      ],
      resolveChannelScale: () => ({
        of: () => undefined,
        legendForm: 'swatch',
        domain: [],
        range: [],
        scaleType: 'test',
      }),
      resolveCategoryDomain: values =>
        values.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number'),
      resolveColorScheme: () => () => '#000000',
    },
    node.marks[0],
  );

  expect(resolution).toBeDefined();

  if (resolution === undefined) throw new Error('expected field-bound size resolution');

  return resolution;
};

describe('size channel 映射节点半径', () => {
  // sqrt 半径映射：domain [0,16]、range [MIN,MAX] 时，v=4 映射到半程半径
  it('大小字段按 sqrt 映射半径', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 4 },
      { x: 2, y: 2, p: 16 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('p'), { d: data }, cartOpts));
    const radii = nodes.map(radiusOf);

    expect(radii[0]).toBeCloseTo(2, 6); // p=0 位于 domain 下界，映射到 MIN
    expect(radii[2]).toBeCloseTo(SIZE_MAX_RADIUS, 6); // p=16 是最大正值，映射到 MAX

    const mid = 2 + 0.5 * (SIZE_MAX_RADIUS - 2);

    expect(radii[1]).toBeCloseTo(mid, 6); // p=4 是 sqrt 映射的中点
  });

  // 常量 value 直接表示最终半径，不经过 scale
  it('尺寸值为最终绕过比例的半径', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec(8), { d: data }, cartOpts));

    expect(nodes.every(n => radiusOf(n) !== undefined && Math.abs(radiusOf(n)! - 8) < 1e-6)).toBe(true);
  });

  // size 与 color 独立生效：半径逐节点解析，颜色按值分组
  it('尺寸与颜色均适用', () => {
    const spec = PlotSchema.parse({
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
          encodings: {
            size: 'p',
            color: { field: 'g', scale: 'col' },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
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
  it('字段大小省略缺失 null 和非有限值的字形', () => {
    const data = [
      { x: 0, y: 0, p: undefined },
      { x: 1, y: 1, p: null },
      { x: 2, y: 2, p: Number.NaN },
      { x: 3, y: 3, p: Number.POSITIVE_INFINITY },
      { x: 4, y: 4, p: 9 },
    ];
    const nodes = collectNodes(
      firstLayer(pointSpec('p'), { d: data }, { ...cartOpts, provenance: true, datumProvenance: true }),
    );

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.meta).toMatchObject({ transformedIndex: 4 });
    expect(radiusOf(nodes[0])).toBeCloseTo(SIZE_MAX_RADIUS, 6);
  });

  it('字段大小不过滤通用点文本模式', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { size: 'p', text: 'name', position: { x: { field: 'x' }, y: { field: 'y' } } } },
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

  it('所有最小半径都没有正值', () => {
    const data = [
      { x: 0, y: 0, p: 0 },
      { x: 1, y: 1, p: 0 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('p'), { d: data }, cartOpts));

    expect(nodes.every(n => Math.abs(radiusOf(n)! - 2) < 1e-6)).toBe(true);
  });

  it('单正值映射到范围顶部', () => {
    const data = [
      { x: 0, y: 0, p: 7 },
      { x: 1, y: 1, p: 7 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('p'), { d: data }, cartOpts));

    expect(nodes.every(n => Math.abs(radiusOf(n)! - SIZE_MAX_RADIUS) < 1e-6)).toBe(true);
  });

  it('空数据无节点', () => {
    const outer = expandOf(pointSpec('p'), { d: [] }, cartOpts);

    expect(outer.children).toHaveLength(0);
  });

  it('空数据在解析器和描述符中保留显式 sqrt 定义', () => {
    const resolution = sizeResolutionOf(
      { field: 'p', scale: 'sizeScale' },
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
  ])('未指定类型的 %s 行保留尺寸描述符', (_label, rows) => {
    const resolution = sizeResolutionOf('p', rows);

    expect(resolution.descriptor).toMatchObject({
      channel: 'size',
      field: 'p',
      scaleName: '__size_p',
      scaleType: 'sqrt',
    });
    expect(resolution.descriptor?.fieldType).toBeUndefined();

    const data = rows.map(row => ({ x: 0, y: 0, ...row }));

    expect(collectNodes(expandOf(pointSpec('p'), { d: data }, cartOpts))).toEqual([]);
  });

  it('所有零数据在解析器和描述符中使用显式 sqrt 范围', () => {
    const rows = [{ p: 0 }, { p: 0 }];
    const resolution = sizeResolutionOf({ field: 'p', scale: 'sizeScale' }, rows, [
      { type: 'sqrt', name: 'sizeScale', domain: [0, 16], range: [3, 11] },
    ]);

    expect(rows.map(row => resolution.resolver(row))).toEqual([3, 3]);
    expect(resolution.descriptor).toMatchObject({
      scaleName: 'sizeScale',
      domain: [0, 16],
      range: [3, 11],
    });
  });

  it('全零数据推导的比例尺报告实际生效的常量值域', () => {
    const rows = [{ p: 0 }, { p: 0 }];
    const resolution = sizeResolutionOf('p', rows);

    expect(rows.map(row => resolution.resolver(row))).toEqual([2, 2]);
    expect(resolution.descriptor).toMatchObject({
      domain: [0, 0],
      range: [2, 2],
    });
  });

  it('显式退化定义域使用正式 sqrt 映射', () => {
    const resolution = sizeResolutionOf(
      { field: 'p', scale: 'sizeScale' },
      [],
      [{ type: 'sqrt', name: 'sizeScale', domain: [5, 5], range: [3, 11] }],
    );

    expect(resolution.resolver({ p: 5 })).toBeCloseTo(7, 6);
    expect(resolution.descriptor).toMatchObject({ domain: [5, 5], range: [3, 11] });
  });

  it('很好的 sqrt 比例公开了解析器使用的域', () => {
    const resolution = sizeResolutionOf(
      { field: 'p', scale: 'sizeScale' },
      [{ p: 2.5 }],
      [{ type: 'sqrt', name: 'sizeScale', domain: [0, 9.1], range: [3, 11], nice: true }],
    );

    expect(resolution.resolver({ p: 2.5 })).toBeCloseTo(7, 6);
    expect(resolution.descriptor).toMatchObject({ domain: [0, 10], range: [3, 11] });
  });

  it('单个正默认比例保持解析器和描述符身份对齐', () => {
    const rows = [{ p: 7 }];
    const resolution = sizeResolutionOf('p', rows);

    expect(resolution.resolver(rows[0])).toBeCloseTo(SIZE_MAX_RADIUS, 6);
    expect(resolution.descriptor).toMatchObject({
      scaleName: '__size_p',
      domain: [0, 7],
      range: [2, SIZE_MAX_RADIUS],
    });
  });

  it('无尺寸通道保持默认统一尺寸', () => {
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
  ])('观测推导的 %s 尺寸字段明确报错', (_label, value) => {
    expect(() =>
      expandOf(
        derivedSizePointSpec(value),
        { d: [{ x: 0, y: 0 }] },
        {
          definitions: { transforms: [deriveSizeValueTransform] },
          implementations: { transforms: [deriveSizeValueTransformImplementation] },
          ...cartOpts,
        },
      ),
    ).toThrow(/size requires a continuous field/);
  });

  it('观察到的派生连续大小描述符报告其类型', () => {
    const node = pointSpec('derivedSize');
    const resolution = BUILTIN_NODE_CHANNELS.size.resolve(
      {
        node,
        rows: [{ derivedSize: 4 }],
        model: [],
        resolveChannelScale: () => ({
          of: () => undefined,
          legendForm: 'swatch',
          domain: [],
          range: [],
          scaleType: 'test',
        }),
        resolveCategoryDomain: values =>
          values.filter((value): value is string | number => typeof value === 'string' || typeof value === 'number'),
        resolveColorScheme: () => () => '#000000',
      },
      node.marks[0],
    );

    expect(resolution?.descriptor?.fieldType).toBe(DataFieldType.Continuous);
  });

  it('解析字段类型覆盖大小验证的模型', () => {
    const rows = [{ x: 0, y: 0, p: 4 }];
    const model = [
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
    ];
    const resolver =
      (type: DataFieldType): PlotsLoweringOptions['resolveField'] =>
      field =>
        field === 'p' ? { type } : undefined;

    expect(() =>
      expandOf(
        pointSpec('p', [], [...model, { name: 'p', type: DataFieldType.Categorical }]),
        { d: rows },
        { ...cartOpts, resolveField: resolver(DataFieldType.Continuous) },
      ),
    ).not.toThrow();
    expect(() =>
      expandOf(
        pointSpec('p', [], [...model, { name: 'p', type: DataFieldType.Continuous }]),
        { d: rows },
        { ...cartOpts, resolveField: resolver(DataFieldType.Categorical) },
      ),
    ).toThrow(/size requires a continuous field/);
  });

  it('解析字段类型覆盖格式并每个字段运行一次', () => {
    const spec = pointSpec(
      'p',
      [],
      [
        { name: 'x', type: DataFieldType.Continuous },
        { name: 'y', type: DataFieldType.Continuous },
        { name: 'p', format: 'iso' },
      ],
    );
    let sizeFieldCalls = 0;

    const resolveField: PlotsLoweringOptions['resolveField'] = field => {
      if (field !== 'p') return undefined;
      sizeFieldCalls += 1;
      return { type: DataFieldType.Continuous };
    };

    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, p: undefined }] }, { ...cartOpts, resolveField })).not.toThrow();
    expect(sizeFieldCalls).toBe(1);
  });

  it('标记本地同名变换使用输出类型证据', () => {
    const spec = PlotSchema.parse({
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
          transforms: [{ operation: { kind: 'normalize', params: { field: 'p', as: 'p' } } }],
          encodings: { size: 'p', position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    });

    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, p: 'large' }] }, cartOpts)).not.toThrow();
  });

  it.each([
    ['empty', []],
    ['all-missing', [{ x: 0, y: 0, p: undefined }]],
  ])('解析字段类型对于 %s 行仍然具有权威性', (_label, rows) => {
    const spec = pointSpec('p');
    const resolveField: PlotsLoweringOptions['resolveField'] = field =>
      field === 'p' ? { type: DataFieldType.Categorical } : undefined;

    expect(() => expandOf(spec, { d: rows }, { ...cartOpts, resolveField })).toThrow(
      /size requires a continuous field/,
    );
  });

  it('格式隐含类型对于所有缺失的行仍然具有权威性', () => {
    const spec = pointSpec(
      'p',
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
  ])('显式 %s 大小字段对于正空和所有缺失行失败', (_label, fieldType) => {
    const model = [{ name: 'p', type: fieldType }];
    const rowSets = [[{ p: 4 }], [], [{ p: undefined }, { p: null }, { p: Number.NaN }]];

    for (const rows of rowSets) {
      expect(() => sizeResolutionOf('p', rows, [], { fieldType, model })).toThrow(/size requires a continuous field/);
    }
  });

  it.each([
    ['categorical', [{ x: 0, y: 0, p: 'large' }]],
    ['temporal', [{ x: 0, y: 0, p: '2026-08-02' }]],
  ])('观察到的未类型化 %s 大小字段明确报错', (_label, rows) => {
    expect(() => expandOf(pointSpec('p'), { d: rows }, cartOpts)).toThrow(/size requires a continuous field/);
  });

  it('字段值为负时明确报错', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: -3 },
    ];

    expect(() => expandOf(pointSpec('p'), { d: data }, cartOpts)).toThrow(/negative/);
  });

  it('未知尺寸比例尺明确报错', () => {
    const data = [{ x: 0, y: 0, p: 1 }];

    expect(() => expandOf(pointSpec({ field: 'p', scale: 'nope' }), { d: data }, cartOpts)).toThrow(/unknown scale/);
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('%s 行使用未知尺寸比例尺时明确报错', (_label, rows) => {
    expect(() => sizeResolutionOf({ field: 'p', scale: 'nope' }, rows)).toThrow(/unknown scale/);
  });

  it('非 sqrt 尺寸比例尺明确报错', () => {
    const data = [
      { x: 0, y: 0, p: 1 },
      { x: 1, y: 1, p: 4 },
    ];
    const spec = pointSpec({ field: 'p', scale: 'mySize' }, [{ type: 'linear', name: 'mySize' }]);

    expect(() => expandOf(spec, { d: data }, cartOpts)).toThrow(/must be a sqrt scale/);
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('对于 %s 行，非 sqrt 大小比例失败', (_label, rows) => {
    expect(() => sizeResolutionOf({ field: 'p', scale: 'mySize' }, rows, [{ type: 'linear', name: 'mySize' }])).toThrow(
      /must be a sqrt scale/,
    );
  });

  it.each([
    ['empty', []],
    ['all-zero', [{ p: 0 }, { p: 0 }]],
  ])('%s 行使用负的退化 sqrt 定义域时明确报错', (_label, rows) => {
    expect(() =>
      sizeResolutionOf({ field: 'p', scale: 'sizeScale' }, rows, [
        { type: 'sqrt', name: 'sizeScale', domain: [-1, -1] },
      ]),
    ).toThrow(/domain must be non-negative/);
  });

  it('字段大小描述符使用显式比例标识', () => {
    const resolution = sizeResolutionOf(
      { field: 'p', scale: 'mySize' },
      [{ p: 4 }],
      [{ type: 'sqrt', name: 'mySize' }],
    );

    expect(resolution.descriptor?.scaleName).toBe('mySize');
  });
});
