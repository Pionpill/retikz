import type { IRNode, IRScope } from '@retikz/core';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { describe, expect, it } from 'vitest';
import { FieldDefSchema, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { DataModelSchema } from '../../src/ir/data';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

/** 下沉一个 plot spec，取外层 plot scope */
const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions = opts): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope */
const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions = opts): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/**
 * 构造一个 x=band 的散点 spec：x 绑 categorical 字段 cat（带 order）、y 绑 continuous 字段 val。
 * 省略 coordinate.x → 触发 type-driven 派生 band（order 注入派生 scale 的 domain）。
 */
const bandSpec = (model: Array<Record<string, unknown>>, scales: Array<unknown> = []): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model },
    scales,
    coordinate: { type: 'cartesian2D', y: 'yv' },
    marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }],
  });

/**
 * 读出 band 域的实际类别顺序（左→右）。
 * @description point 下沉逐行保序：layer.children[i] ↔ rows[i]。把每行的 cat 与对应 node 的 x 配对，
 *   按 x 升序去重 → 得到 band 域里类别从左到右的真实顺序（而非仅断言「band 等距」这种对任意域都真的废断言）。
 */
const bandCategorySequence = (layer: IRScope, rows: Array<Record<string, unknown>>): Array<string | number> => {
  const paired = layer.children.map((child, index) => ({
    cat: rows[index].cat as string | number,
    x: ((child as IRNode).position as [number, number])[0],
  }));
  paired.sort((a, b) => a.x - b.x);
  const seen = new Set<string | number>();
  const out: Array<string | number> = [];
  for (const { cat } of paired) {
    if (!seen.has(cat)) {
      seen.add(cat);
      out.push(cat);
    }
  }
  return out;
};

describe('FieldDef.order — schema 接受 / 拒绝（ADR-07）', () => {
  it('explicit_array_order_accepted_by_schema', () => {
    const def = { name: 'size', type: 'categorical', order: ['S', 'M', 'L', 'XL'] };
    expect(FieldDefSchema.parse(def)).toEqual(def);
  });

  it('enum_order_accepted_by_schema', () => {
    for (const order of ['data', 'ascending', 'descending'] as const) {
      const def = { name: 'grade', type: 'categorical', order };
      expect(FieldDefSchema.parse(def)).toEqual(def);
    }
  });
});

describe('FieldDef.order — 显式数组域（ADR-07 happy path）', () => {
  it('explicit_array_order', () => {
    // order:['S','M','L'] → band 域按数组序，与数据出现序无关
    const spec = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: ['S', 'M', 'L'] },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    // 数据故意打乱出现序：L 先出现，但域应是 S,M,L（数组序，非出现序）
    const rows = [
      { cat: 'L', val: 1 },
      { cat: 'S', val: 2 },
      { cat: 'M', val: 3 },
    ];
    const layer = firstLayer(spec, { d: rows });
    expect(bandCategorySequence(layer, rows)).toEqual(['S', 'M', 'L']);
  });
});

describe('FieldDef.order — 排序枚举（ADR-07）', () => {
  it('ascending_sorts_numeric', () => {
    // 全数值类别 + order:'ascending' → 按数值升序（10 在 2 之后，而非字符串序）
    const spec = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: 'ascending' },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const rows = [
      { cat: 10, val: 1 },
      { cat: 2, val: 2 },
      { cat: 1, val: 3 },
    ];
    const layer = firstLayer(spec, { d: rows });
    // 域应为 [1, 2, 10]：数值升序，而非字符串字典序（那会给 1,10,2）
    expect(bandCategorySequence(layer, rows)).toEqual([1, 2, 10]);
  });

  it('ascending_mixed_falls_back_string', () => {
    // 类别混 string + number → 统一字符串 locale 比，不抛
    const spec = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: 'ascending' },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const rows = [
      { cat: 'b', val: 1 },
      { cat: 2, val: 2 },
      { cat: 'a', val: 3 },
    ];
    expect(() => firstLayer(spec, { d: rows })).not.toThrow();
    const layer = firstLayer(spec, { d: rows });
    // 统一 String() locale 比 → '2' < 'a' < 'b'；关键是不崩且三类别全在域
    const sequence = bandCategorySequence(layer, rows);
    expect(sequence).toHaveLength(3);
    expect(sequence).toEqual([2, 'a', 'b']);
  });
});

describe('FieldDef.order — 默认与边界（ADR-07）', () => {
  it('default_data_order_preserved', () => {
    // 不写 order（缺省 'data'）→ 出现序，与现状逐字等价
    const noOrder = bandSpec(
      [
        { name: 'cat', type: 'categorical' },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const explicitData = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: 'data' },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const rows = {
      d: [
        { cat: 'c', val: 1 },
        { cat: 'a', val: 2 },
        { cat: 'b', val: 3 },
      ],
    };
    const a = firstLayer(noOrder, rows);
    const b = firstLayer(explicitData, rows);
    // 'data' 与缺省等价：两布局 node 位置逐一相同（出现序 c,a,b 而非排序后）
    const ax = a.children.map(c => ((c as IRNode).position as [number, number])[0]);
    const bx = b.children.map(c => ((c as IRNode).position as [number, number])[0]);
    expect(ax).toEqual(bx);
  });

  it('array_missing_value_appended', () => {
    // 数据含 'XL'，但 order 数组无 → 追加末尾、不丢（4 类别全在域里）
    const spec = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: ['S', 'M', 'L'] },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const rows = [
      { cat: 'S', val: 1 },
      { cat: 'XL', val: 2 },
      { cat: 'M', val: 3 },
      { cat: 'L', val: 4 },
    ];
    const layer = firstLayer(spec, { d: rows });
    // XL 不在 order 数组 → 追加末尾、不丢：域序 = S,M,L,XL
    expect(bandCategorySequence(layer, rows)).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('single_category_order', () => {
    // 单一类别 + order → 正常下沉，一个 band
    const spec = bandSpec(
      [
        { name: 'cat', type: 'categorical', order: ['only'] },
        { name: 'val', type: 'continuous' },
      ],
      [{ type: 'linear', name: 'yv' }],
    );
    const rows = [{ cat: 'only', val: 1 }];
    const layer = firstLayer(spec, { d: rows });
    expect(layer.children).toHaveLength(1);
    expect(bandCategorySequence(layer, rows)).toEqual(['only']);
  });
});

describe('FieldDef.order — 错误契约（ADR-07 fail-loud）', () => {
  it('order_on_continuous_throws', () => {
    // order 配 continuous 字段 → lowering fail-loud（cross-review #3）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'cx', type: 'continuous', order: 'ascending' },
          { name: 'val', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'linear', name: 'xv' },
        { type: 'linear', name: 'yv' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xv', y: 'yv' },
      marks: [{ type: 'point', encoding: { x: { field: 'cx' }, y: { field: 'val' } } }],
    });
    expect(() => expandOf(spec, { d: [{ cx: 1, val: 2 }] })).toThrow();
  });

  it('conflicting_order_same_role_throws', () => {
    // 同一 x role 两字段给不同非默认 order → fail-loud（cross-review #2）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'a', type: 'categorical', order: 'ascending' },
          { name: 'b', type: 'categorical', order: 'descending' },
          { name: 'val', type: 'continuous' },
        ],
      },
      scales: [{ type: 'linear', name: 'yv' }],
      coordinate: { type: 'cartesian2D', y: 'yv' },
      marks: [
        { type: 'point', encoding: { x: { field: 'a' }, y: { field: 'val' } } },
        { type: 'point', encoding: { x: { field: 'b' }, y: { field: 'val' } } },
      ],
    });
    expect(() => expandOf(spec, { d: [{ a: 'x', b: 'p', val: 1 }] })).toThrow();
  });

  it('empty_array_order_rejected', () => {
    // order:[] 被 FieldDefSchema.parse 拒（.min(1)）—— zod parse 错误路径
    expect(() => FieldDefSchema.parse({ name: 'cat', type: 'categorical', order: [] })).toThrow();
    // 整 model 内含空数组 order 同样被拒
    expect(() => DataModelSchema.parse([{ name: 'cat', type: 'categorical', order: [] }])).toThrow();
  });
});

describe('FieldDef.order — 交互（ADR-07）', () => {
  it('order_applies_to_position_and_color', () => {
    // 同一有序字段 cat 既作 x(band) 又作 color(ordinal) → 两处类别序一致
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'cat', type: 'categorical', order: ['S', 'M', 'L'] },
          { name: 'val', type: 'continuous' },
        ],
      },
      scales: [{ type: 'linear', name: 'yv' }],
      coordinate: { type: 'cartesian2D', y: 'yv' },
      marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'val' }, color: { field: 'cat' } } }],
    });
    const rows = [
      { cat: 'L', val: 1 },
      { cat: 'S', val: 2 },
      { cat: 'M', val: 3 },
    ];
    const layer = firstLayer(spec, { d: rows });
    // color 合成 ordinal，域按 order S,M,L → 颜色 S→scheme[0]、M→[1]、L→[2]（与位置同序，与数据出现序 L,S,M 无关）。
    // 每个 color 子 scope 内是同色一组 node；用每个 node 的 band x 反查类别（最左=S、中=M、右=L），核对该组 fill。
    const subScopes = layer.children.map(child => child as IRScope);
    // band 中心 x：S 最小、L 最大；按 x 升序映射域序 S,M,L
    const allX = subScopes.flatMap(scope => (scope.children as Array<IRNode>).map(node => (node.position as [number, number])[0]));
    const sortedX = [...new Set(allX)].sort((a, b) => a - b);
    const categoryByX = new Map<number, string>([
      [sortedX[0], 'S'],
      [sortedX[1], 'M'],
      [sortedX[2], 'L'],
    ]);
    const fillByCategory = new Map<string, unknown>();
    for (const scope of subScopes) {
      const node = scope.children[0] as IRNode;
      const category = categoryByX.get((node.position as [number, number])[0]);
      if (category !== undefined) fillByCategory.set(category, scope.nodeDefault?.fill);
    }
    expect(fillByCategory.get('S')).toBe(schemeCategory10[0]);
    expect(fillByCategory.get('M')).toBe(schemeCategory10[1]);
    expect(fillByCategory.get('L')).toBe(schemeCategory10[2]);
  });

  it('order_with_type_driven_scale', () => {
    // {categorical, order} + 省略 scale → 派生 band 且域按 order
    const spec = bandSpec([
      { name: 'cat', type: 'categorical', order: ['S', 'M', 'L'] },
      { name: 'val', type: 'continuous' },
    ]);
    // 注意：bandSpec 省略 coordinate.x → 触发派生 band；y 仍需 scale，补一个
    const withYScale = PlotSpecSchema.parse({
      ...spec,
      scales: [{ type: 'linear', name: 'yv' }],
    });
    const rows = [
      { cat: 'L', val: 1 },
      { cat: 'S', val: 2 },
      { cat: 'M', val: 3 },
    ];
    const layer = firstLayer(withYScale, { d: rows });
    // 派生 band 的域按 order：S,M,L（非数据出现序 L,S,M）
    expect(bandCategorySequence(layer, rows)).toEqual(['S', 'M', 'L']);
  });

  it('explicit_domain_overrides_order', () => {
    // scale 显式 domain + 字段 order 同在 → 用显式 domain（order 被忽略，cross-review #2）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'cat', type: 'categorical', order: ['S', 'M', 'L'] },
          { name: 'val', type: 'continuous' },
        ],
      },
      // 显式 band domain 反序 L,M,S → 应压过 order 的 S,M,L
      scales: [
        { type: 'band', name: 'xv', domain: ['L', 'M', 'S'] },
        { type: 'linear', name: 'yv' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xv', y: 'yv' },
      marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }],
    });
    const rows = {
      d: [
        { cat: 'S', val: 1 },
        { cat: 'M', val: 2 },
        { cat: 'L', val: 3 },
      ],
    };
    const layer = firstLayer(spec, rows);
    // 与「无 order、仅显式反序 domain」的布局逐一相同 → 证明 order 被忽略
    const reference = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'cat', type: 'categorical' },
          { name: 'val', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'band', name: 'xv', domain: ['L', 'M', 'S'] },
        { type: 'linear', name: 'yv' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xv', y: 'yv' },
      marks: [{ type: 'point', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }],
    });
    const refLayer = firstLayer(reference, rows);
    const xs = layer.children.map(c => ((c as IRNode).position as [number, number])[0]);
    const refXs = refLayer.children.map(c => ((c as IRNode).position as [number, number])[0]);
    expect(xs).toEqual(refXs);
  });
});

describe('FieldDef.order — JSON round-trip（ADR-07 必测）', () => {
  it('order_json_roundtrip', () => {
    // 含 order（含 Array 形态）的 model JSON.parse(JSON.stringify()) 后 schema parse 等价
    const model = DataModelSchema.parse([
      { name: 'size', type: 'categorical', order: ['S', 'M', 'L', 'XL'] },
      { name: 'grade', type: 'categorical', order: 'ascending' },
      { name: 'year', type: 'categorical', order: [2021, 2022, 2023] },
      { name: 'city', type: 'categorical' },
    ]);
    const roundTripped = JSON.parse(JSON.stringify(model));
    expect(DataModelSchema.parse(roundTripped)).toEqual(model);
  });
});
