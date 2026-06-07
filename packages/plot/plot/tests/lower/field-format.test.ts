import { describe, expect, it } from 'vitest';
import { DataModelSchema, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { FieldDefSchema, PlotFieldFormat } from '../../src/ir/data';
import { type LowerPlotsOptions, prepareRows } from '../../src/lower/expand';
import { tagSourceIndex } from '../../src/lower/provenance';

/**
 * 构造一个引用单个逻辑字段 `v`（绑 x 通道）的最小 spec
 * @description format 的解析行为驱动 prepareRows → normalized 行；读 normalized[i].v 即拿到 canonical（已解析）值
 */
const specWithField = (field: { name: string } & Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [field, { name: 'y', type: 'continuous' }] },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: field.name }, y: { field: 'y' } } }],
  });

/** 跑一次绑定准备，取首行 logical 字段的 canonical 值 */
const parseFirst = (
  spec: PlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  logical: string,
  options: LowerPlotsOptions = {},
): unknown => {
  const ingested = tagSourceIndex(datasets.d);
  const { normalized } = prepareRows(spec, datasets, options, ingested);
  return normalized[0][logical];
};

describe('FieldDef.format 解析行为（ADR-06）— happy path', () => {
  it('slashdate_parses_utc', () => {
    // 严格 YYYY/MM/DD 按 UTC 零点 → epoch ms
    const spec = specWithField({ name: 'v', type: 'temporal', format: PlotFieldFormat.SlashDate });
    const value = parseFirst(spec, { d: [{ v: '2024/01/01', y: 1 }] }, 'v');
    expect(value).toBe(Date.UTC(2024, 0, 1));
  });

  it('epoch_seconds_scaled', () => {
    // epoch 秒 → ms（*1000）
    const spec = specWithField({ name: 'v', type: 'temporal', format: PlotFieldFormat.EpochSeconds });
    expect(parseFirst(spec, { d: [{ v: 1700000000, y: 1 }] }, 'v')).toBe(1700000000 * 1000);
  });

  it('percent_parses', () => {
    // 百分比串 '50%' → 0.5
    const spec = specWithField({ name: 'v', type: 'continuous', format: PlotFieldFormat.Percent });
    expect(parseFirst(spec, { d: [{ v: '50%', y: 1 }] }, 'v')).toBe(0.5);
  });
});

describe('FieldDef.format 解析行为（ADR-06）— 边界', () => {
  it('format_omitted_equals_builtin', () => {
    // 不写 format → 与现状内置 coerce 逐字等价（严格 ISO temporal / 严格数字串 continuous）
    const spec = specWithField({ name: 'v', type: 'temporal' });
    const value = parseFirst(spec, { d: [{ v: '2024-01-01', y: 1 }] }, 'v');
    expect(value).toBe(Date.parse('2024-01-01'));
  });

  it('numberstring_lenient', () => {
    // 宽松数字串：千分位逗号 / 前后空白
    const spec = specWithField({ name: 'v', type: 'continuous', format: PlotFieldFormat.NumberString });
    expect(parseFirst(spec, { d: [{ v: '1,500', y: 1 }] }, 'v')).toBe(1500);
    expect(parseFirst(spec, { d: [{ v: ' 12 ', y: 1 }] }, 'v')).toBe(12);
  });

  it('format_implies_type_when_omitted', () => {
    // 写 format 不写 type → format 蕴含 continuous，'50%'→0.5（不被推断成 categorical）
    const spec = specWithField({ name: 'v', format: PlotFieldFormat.Percent });
    expect(parseFirst(spec, { d: [{ v: '50%', y: 1 }] }, 'v')).toBe(0.5);
  });

  it('slashdate_rejects_ambiguous_layout', () => {
    // 非 YYYY/MM/DD 的歧义布局（D/M/Y）不猜 → NaN（下游按非有限跳过）
    const spec = specWithField({ name: 'v', type: 'temporal', format: PlotFieldFormat.SlashDate });
    expect(Number.isNaN(parseFirst(spec, { d: [{ v: '13/01/2024', y: 1 }] }, 'v') as number)).toBe(true);
  });
});

describe('FieldDef.format（ADR-06）— 错误路径', () => {
  it('format_type_mismatch_throws', () => {
    // 显式 continuous + format 蕴含 temporal（epochSeconds）冲突 → lowering fail-loud
    const spec = specWithField({ name: 'v', type: 'continuous', format: PlotFieldFormat.EpochSeconds });
    expect(() => parseFirst(spec, { d: [{ v: 1700000000, y: 1 }] }, 'v')).toThrow();
  });

  it('unknown_format_rejected', () => {
    // schema 拒未知 format 字面量
    expect(() => FieldDefSchema.parse({ name: 'v', type: 'continuous', format: 'comma' })).toThrow();
  });
});

describe('FieldDef.format（ADR-06）— 交互', () => {
  it('resolveField_parse_overrides_format', () => {
    // 同字段既有 format 又有 resolveField.parse → 用 parse（优先级 resolveField > format）
    const spec = specWithField({ name: 'v', type: 'continuous', format: PlotFieldFormat.Percent });
    const value = parseFirst(spec, { d: [{ v: '50%', y: 1 }] }, 'v', {
      resolveField: () => ({ parse: () => 999 }),
    });
    expect(value).toBe(999);
  });

  it('format_with_fieldmaps', () => {
    // format + fieldMaps：先按物理路径取值，再按 format 解析
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'v', type: 'continuous', format: PlotFieldFormat.Percent }, { name: 'y', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' }, y: { field: 'y' } } }],
    });
    const value = parseFirst(spec, { d: [{ ratio: '50%', y: 1 }] }, 'v', { fieldMaps: { d: { v: 'ratio' } } });
    expect(value).toBe(0.5);
  });

  it('format_json_roundtrip', () => {
    // 含 format 的 model：JSON 往返后 schema parse 与原 model 等价（可序列化）
    const model = [
      { name: 'createdAt', type: 'temporal', format: 'slashDate' },
      { name: 'ts', type: 'temporal', format: 'epochSeconds' },
      { name: 'ratio', type: 'continuous', format: 'percent' },
    ];
    const roundTripped = DataModelSchema.parse(JSON.parse(JSON.stringify(model)));
    expect(roundTripped).toEqual(model);
  });
});
