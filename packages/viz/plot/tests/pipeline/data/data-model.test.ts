import { inferFieldType, isIsoDateString, resolveFieldTypes } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { collectSourceFields } from '../../../src/pipeline/source-fields';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

/** 构造最小可解析 IRPlot（cartesian + 给定 marks / transform / model） */
const buildSpec = (overrides: Record<string, unknown>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'path', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
    ...overrides,
  });

const rowsOf = (...values: Array<unknown>): Array<Record<string, unknown>> => values.map(v => ({ f: v }));

describe('inferFieldType — 缺省推断（contract）', () => {
  // Happy path
  it('从 iso 推断时间', () => {
    expect(inferFieldType(rowsOf('2024-01-01', '2024-02-01'), 'f')).toBe(DataFieldType.Temporal);
    expect(inferFieldType(rowsOf('2024-01-01T08:30:00Z'), 'f')).toBe(DataFieldType.Temporal);
  });

  it('从日期实例推断时间', () => {
    expect(inferFieldType(rowsOf(new Date('2024-01-01'), new Date('2024-02-01')), 'f')).toBe(DataFieldType.Temporal);
  });

  it('从编号推断连续', () => {
    expect(inferFieldType(rowsOf(1, 2, 3.5), 'f')).toBe(DataFieldType.Continuous);
  });

  it('从字符串推断分类', () => {
    expect(inferFieldType(rowsOf('apple', 'banana'), 'f')).toBe(DataFieldType.Categorical);
  });

  // 边界
  it('临时防护拒绝裸号码', () => {
    // 数值 5 → continuous；数字串 '5' → categorical（绝不误判 temporal）
    expect(inferFieldType(rowsOf(5, 6), 'f')).toBe(DataFieldType.Continuous);
    expect(inferFieldType(rowsOf('5', '6'), 'f')).toBe(DataFieldType.Categorical);

    // YYYY/MM/DD 非严格 ISO → categorical
    expect(inferFieldType(rowsOf('2024/01/01'), 'f')).toBe(DataFieldType.Categorical);

    // 无时区 datetime → categorical（拒模糊本地时间）
    expect(inferFieldType(rowsOf('2024-01-01T08:30:00'), 'f')).toBe(DataFieldType.Categorical);
  });

  it('空或全部为空字段', () => {
    expect(inferFieldType(rowsOf(null, undefined), 'f')).toBe(DataFieldType.Categorical);
    expect(inferFieldType([], 'f')).toBe(DataFieldType.Categorical);
  });

  it('混合类型回退到分类', () => {
    expect(inferFieldType(rowsOf(1, 'two', 3), 'f')).toBe(DataFieldType.Categorical);
  });

  it('非标量值被跳过', () => {
    // 非标量（对象 / 数组）跳过，剩余数值 → continuous
    expect(inferFieldType(rowsOf({ a: 1 }, 2, 3), 'f')).toBe(DataFieldType.Continuous);
  });

  it('采样双阈值', () => {
    // 前 1000 行全数值、第 1500 行才出现字符串 → 扫描封顶 1000，仍判 continuous
    const rows = Array.from({ length: 2000 }, (_, i) => ({ f: i < 1500 ? i : 'late-string' }));

    expect(inferFieldType(rows, 'f')).toBe(DataFieldType.Continuous);
  });
});

describe('isIsoDateString — 严格 ISO guard（contract）', () => {
  it('iso 接受拒绝', () => {
    expect(isIsoDateString('2024-01-01')).toBe(true);
    expect(isIsoDateString('2024-01-01T08:30:00Z')).toBe(true);
    expect(isIsoDateString('2024-01-01T08:30:00+08:00')).toBe(true);
    expect(isIsoDateString('2024/01/01')).toBe(false);
    expect(isIsoDateString('2024-01-01T08:30:00')).toBe(false); // 无时区
    expect(isIsoDateString('5')).toBe(false);
    expect(isIsoDateString('hello')).toBe(false);
  });
});

describe('collectSourceFields — 用户源字段集（contract）', () => {
  it('收集编码顺序系列', () => {
    const spec = buildSpec({
      marks: [
        {
          type: 'path',
          encodings: {
            order: 'idx',
            series: 'cat',
            color: 'cat',
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('month')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    expect(fields.has('idx')).toBe(true);
    expect(fields.has('cat')).toBe(true);
  });

  it('收集变换输入', () => {
    const spec = buildSpec({
      transform: [
        { operation: { kind: 'sort', params: { field: 'month' } } },
        { operation: { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } } },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('month')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    expect(fields.has('product')).toBe(true);
  });

  it('派生字段未收集', () => {
    // stack 输出 startField/endField、interval y0Field/y1Field 是派生字段，不应进用户源集
    const spec = buildSpec({
      transform: [
        { operation: { kind: 'stack', params: { x: 'month', y: 'revenue', startField: 'lo', endField: 'hi' } } },
      ],
      marks: [
        {
          type: 'interval',
          encodings: {
            bounds: { y: { from: { field: 'lo' }, to: { field: 'hi' } } },
            position: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
  });

  it('常量值通道未收集', () => {
    const spec = buildSpec({
      marks: [
        {
          type: 'path',
          properties: { color: 'red' },
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
      ],
    });

    expect(collectSourceFields(spec).has('red')).toBe(false);
  });

  it('收集标签及文本内容字段', () => {
    // 位置 mark 的 datum label 内容字段与 TextMark 的 text 内容字段都进入用户源字段集
    const spec = buildSpec({
      marks: [
        {
          type: 'interval',
          encodings: { label: { text: 'lbl' }, position: { x: { field: 'month' }, y: { field: 'revenue' } } },
          properties: { label: {} },
        },
        { type: 'point', encodings: { text: 'note', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('lbl')).toBe(true);
    expect(fields.has('note')).toBe(true);
  });

  it('收集间隔范围范围字段而不使用常量基线', () => {
    // 各维区间端点字段进入用户源集，常量基线不作为字段
    const spec = buildSpec({
      marks: [
        {
          type: 'interval',
          encodings: {
            position: { x: { field: 'a' }, y: { field: 'lo' } },
            bounds: {
              x: { from: { field: 'a' }, to: { field: 'b' } },
              y: { from: { field: 'lo' }, to: { field: 'hi' } },
            },
          },
          properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
        },
        {
          type: 'interval',
          encodings: { position: { x: { field: 'a' }, y: { field: 'lo' } } },
          properties: { bounds: { x: { kind: 'full' }, y: { kind: 'span', baseline: 90 } } },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('lo')).toBe(true);
    expect(fields.has('hi')).toBe(true);
    expect(fields.has('a')).toBe(true);
    expect(fields.has('b')).toBe(true);
    expect(fields.has('90')).toBe(false);
  });

  it('文本字段输入严格模型 alpha11', () => {
    // 声明 model 时，TextMark text 引用的字段必须列入 model，否则 fail-loud（P1：之前被绕过、静默空文本）
    const spec = buildSpec({
      marks: [
        { type: 'point', encodings: { text: 'note', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const userFields = collectSourceFields(spec);

    expect(() =>
      resolveFieldTypes([{ name: 'month' }, { name: 'revenue' }], [{ month: 1, revenue: 2, note: 'x' }], userFields),
    ).toThrow(/unknown field/i);
  });

  // contract：bin / summarize 输入字段进、派生输出字段不进
  it('bin 输入输入输出输出', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: {
            kind: 'bin',
            params: {
              field: 'measurement',
              metrics: [{ kind: 'sum', field: 'weight', as: 'totalWeight' }],
            },
          },
        },
      ],
      marks: [
        {
          type: 'interval',
          encodings: {
            bounds: { x: { from: { field: 'binStart' }, to: { field: 'binEnd' } } },
            position: { y: { field: 'totalWeight' } },
          },
          properties: { bounds: { x: { kind: 'extent' } } },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    // 输入字段进
    expect(fields.has('measurement')).toBe(true);
    expect(fields.has('weight')).toBe(true);

    // 派生输出字段不进（即便被 mark 的 encoding.y / x0Field / x1Field 引用）
    expect(fields.has('binStart')).toBe(false);
    expect(fields.has('binEnd')).toBe(false);
    expect(fields.has('totalWeight')).toBe(false);
  });

  it('未收集 bin 自定义输出字段', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: {
            kind: 'bin',
            params: {
              field: 'm',
              startField: 'lo',
              endField: 'hi',
              metrics: [{ kind: 'count', as: 'n' }],
            },
          },
        },
      ],
      marks: [
        {
          type: 'interval',
          encodings: { bounds: { x: { from: { field: 'lo' }, to: { field: 'hi' } } }, position: { y: { field: 'n' } } },
          properties: { bounds: { x: { kind: 'extent' } } },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('m')).toBe(true);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
    expect(fields.has('n')).toBe(false);
  });

  it('汇总输入输入输出输出', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: {
            kind: 'summarize',
            params: {
              groupBy: ['region', 'product'],
              metrics: [{ kind: 'sum', field: 'revenue', as: 'total' }],
            },
          },
        },
      ],
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'region' }, y: { field: 'total' } } } }],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('region')).toBe(true);
    expect(fields.has('product')).toBe(true);
    expect(fields.has('revenue')).toBe(true);

    // 派生输出字段 as 不进（即便被 encoding.y 引用）
    expect(fields.has('total')).toBe(false);
  });

  it('未收集汇总计数输出', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: { kind: 'summarize', params: { groupBy: ['region'], metrics: [{ kind: 'count', as: 'count' }] } },
        },
      ],
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'region' }, y: { field: 'count' } } } }],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('count')).toBe(false);
  });

  // contract：normalize / derive-interval / jitter 输入字段进、派生输出不进
  it('normalize 的输入字段进入源集合且 as 输出字段排除在外', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: {
            kind: 'normalize',
            params: { field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' },
          },
        },
      ],
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'quarter' }, y: { field: 'share' } } } }],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('amount')).toBe(true);
    expect(fields.has('quarter')).toBe(true);
    expect(fields.has('share')).toBe(false); // 派生输出
  });

  it('规范化覆盖保留字段', () => {
    // as 缺省（原位覆盖）→ field 仍是用户源字段（被读取）
    const spec = buildSpec({
      transform: [{ operation: { kind: 'normalize', params: { field: 'amount', groupBy: ['quarter'] } } }],
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'quarter' }, y: { field: 'amount' } } } }],
    });

    expect(collectSourceFields(spec).has('amount')).toBe(true);
  });

  it('normalize 显式同名输出保留源字段', () => {
    const spec = buildSpec({
      transform: [{ operation: { kind: 'normalize', params: { field: 'amount', as: 'amount' } } }],
      marks: [{ type: 'point', encodings: { position: { x: { field: 'amount' }, y: { field: 'amount' } } } }],
    });

    expect(collectSourceFields(spec).has('amount')).toBe(true);
  });

  it('链式变换输出不会成为源字段', () => {
    const spec = buildSpec({
      transform: [
        { operation: { kind: 'normalize', params: { field: 'amount', as: 'share' } } },
        { operation: { kind: 'normalize', params: { field: 'share', as: 'finalShare' } } },
      ],
      marks: [{ type: 'point', encodings: { position: { x: { field: 'finalShare' }, y: { field: 'finalShare' } } } }],
    });

    expect([...collectSourceFields(spec)]).toEqual(['amount']);
  });

  it('标记本地输出不隐藏另一个标记源字段', () => {
    const spec = buildSpec({
      marks: [
        {
          type: 'point',
          transforms: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'derived' } } }],
          encodings: { position: { x: { field: 'derived' }, y: { field: 'derived' } } },
        },
        { type: 'point', encodings: { position: { x: { field: 'derived' }, y: { field: 'derived' } } } },
      ],
    });

    expect([...collectSourceFields(spec)].sort()).toEqual(['derived', 'value']);
  });

  it('派生区间的输入字段进入源集合且输出字段排除在外', () => {
    const spec = buildSpec({
      transform: [
        {
          operation: {
            kind: 'derive-interval',
            params: { startFrom: 'start', endFrom: 'end', startField: 'lo', endField: 'hi' },
          },
        },
      ],
      marks: [
        {
          type: 'interval',
          encodings: {
            bounds: { y: { from: { field: 'lo' }, to: { field: 'hi' } } },
            position: { x: { field: 'task' }, y: { field: 'end' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });
    const fields = collectSourceFields(spec);

    expect(fields.has('start')).toBe(true);
    expect(fields.has('end')).toBe(true);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
  });

  it('jitter 字段进入源字段集合', () => {
    // jitter 原位覆盖被抖连续数值字段（读+写同字段）→ 是用户源字段，须进 strict 集
    const spec = buildSpec({
      transform: [{ operation: { kind: 'jitter', params: { axis: 'x', xField: 'dose', amount: 0.3, seed: 1 } } }],
      marks: [{ type: 'point', encodings: { position: { x: { field: 'dose' }, y: { field: 'response' } } } }],
    });

    expect(collectSourceFields(spec).has('dose')).toBe(true);
  });
});

describe('resolveFieldTypes — 类型解析 + strict 校验（contract）', () => {
  const rows = [{ month: '2024-01-01', revenue: 10, cat: 'A' }];

  it('模型类型覆盖推理', () => {
    // model 声明 categorical、数据是数值 → 用声明类型，不推 continuous
    const map = resolveFieldTypes([{ name: 'revenue', type: 'categorical' }], [{ revenue: 5 }], new Set(['revenue']));

    expect(map.get('revenue')).toBe(DataFieldType.Categorical);
  });

  it('没有型号可以推断全部', () => {
    const map = resolveFieldTypes(undefined, rows, new Set(['month', 'revenue', 'cat']));

    expect(map.get('month')).toBe(DataFieldType.Temporal);
    expect(map.get('revenue')).toBe(DataFieldType.Continuous);
    expect(map.get('cat')).toBe(DataFieldType.Categorical);
  });

  it('已解决的地图覆盖所有字段', () => {
    const map = resolveFieldTypes(
      [
        { name: 'month', type: 'temporal' },
        { name: 'revenue', type: 'continuous' },
      ],
      rows,
      new Set(['month', 'revenue']),
    );

    expect(map.size).toBe(2);
  });

  // 错误路径
  it('严格未知字段抛出', () => {
    expect(() => resolveFieldTypes([{ name: 'month', type: 'temporal' }], rows, new Set(['quater']))).toThrow(
      /unknown field/i,
    );
  });

  it('重复字段名称抛出', () => {
    expect(() =>
      resolveFieldTypes(
        [
          { name: 'month', type: 'temporal' },
          { name: 'month', type: 'categorical' },
        ],
        rows,
        new Set(['month']),
      ),
    ).toThrow(/duplicate field/i);
  });

  it('没有模型跳过参考检查', () => {
    // 无 model：引用任意字段不报错（全推断）
    expect(() => resolveFieldTypes(undefined, rows, new Set(['anything', 'whatever']))).not.toThrow();
  });
});

describe('resolveFieldTypes — 部分声明 model（type 可选，contract）', () => {
  const rows = [{ month: '2024-01-01', revenue: 10, cat: 'A' }];

  it('部分模型推断为无类型', () => {
    // month 显式 temporal、revenue 仅 name → 推断 continuous
    const map = resolveFieldTypes(
      [{ name: 'month', type: 'temporal' }, { name: 'revenue' }],
      rows,
      new Set(['month', 'revenue']),
    );

    expect(map.get('month')).toBe(DataFieldType.Temporal);
    expect(map.get('revenue')).toBe(DataFieldType.Continuous);
  });

  it('在部分模型中键入字段使用声明', () => {
    // 部分 model 里带 type 的字段用声明（不被数据推断盖）：revenue 数值但声明 categorical
    const map = resolveFieldTypes(
      [{ name: 'revenue', type: 'categorical' }, { name: 'month' }],
      [{ revenue: 5, month: '2024-01-01' }],
      new Set(['revenue', 'month']),
    );

    expect(map.get('revenue')).toBe(DataFieldType.Categorical);
    expect(map.get('month')).toBe(DataFieldType.Temporal);
  });

  it('仅名称满足严格', () => {
    // 字段仅给 name → 满足 strict、不抛，类型推断
    expect(() => resolveFieldTypes([{ name: 'revenue' }], [{ revenue: 5 }], new Set(['revenue']))).not.toThrow();

    const map = resolveFieldTypes([{ name: 'revenue' }], [{ revenue: 5 }], new Set(['revenue']));

    expect(map.get('revenue')).toBe(DataFieldType.Continuous);
  });

  it('所有名称仅等于推断', () => {
    // 全 name-only model → 类型结果与无 model 推断一致
    const partial = resolveFieldTypes(
      [{ name: 'month' }, { name: 'revenue' }, { name: 'cat' }],
      rows,
      new Set(['month', 'revenue', 'cat']),
    );
    const inferred = resolveFieldTypes(undefined, rows, new Set(['month', 'revenue', 'cat']));

    expect(partial).toEqual(inferred);
  });

  it('仅命名空数据属于分类', () => {
    // name-only 字段数据空 → 推断默认 categorical
    const map = resolveFieldTypes([{ name: 'x' }], [], new Set(['x']));

    expect(map.get('x')).toBe(DataFieldType.Categorical);
  });

  // 错误路径：type 可选不削弱 strict
  it('仅名称不削弱严格', () => {
    // model 仅含 name-only 字段，但引用了未列字段 → 仍抛 unknown
    expect(() => resolveFieldTypes([{ name: 'month' }], rows, new Set(['quater']))).toThrow(/unknown field/i);
  });

  it('名称重复时无论类型如何均抛出错误', () => {
    // 重名（一条带 type、一条 name-only）→ 抛 duplicate
    expect(() =>
      resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'month' }], rows, new Set(['month'])),
    ).toThrow(/duplicate field/i);
  });
});
