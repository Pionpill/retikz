import type { FieldFormatDefinition } from '@retikz/data';

import * as DataPublic from '@retikz/data';
import { DataFieldFormat, defineFieldFormat, resolveFormatRegistry } from '@retikz/data';
import { DataModelSchema, FieldDefinitionSchema } from '@retikz/data';
import { tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { prepareRows } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

/**
 * 构造一个引用单个逻辑字段 `v`（绑 x 通道）的最小 spec
 * @description format 的解析行为驱动 prepareRows → normalized 行；读 normalized[i].v 即拿到 canonical（已解析）值
 */
const specWithField = (field: { name: string } & Record<string, unknown>): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [field, { name: 'y', type: 'continuous' }] },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: field.name }, y: { field: 'y' } } }],
  });

/** 跑一次绑定准备，取首行 logical 字段的 canonical 值 */
const parseFirst = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  logical: string,
  options: LowerPlotsOptions = {},
): unknown => {
  const ingested = tagSourceIndex(datasets.d);
  const { normalized } = prepareRows(spec, datasets, options, ingested);
  return normalized[0][logical];
};

describe('IRDataFieldDefinition.format 解析行为 — happy path', () => {
  it('slashdate_parses_utc', () => {
    // 严格 YYYY/MM/DD 按 UTC 零点 → epoch ms
    const spec = specWithField({ name: 'v', type: 'temporal', format: DataFieldFormat.SlashDate });
    const value = parseFirst(spec, { d: [{ v: '2024/01/01', y: 1 }] }, 'v');
    expect(value).toBe(Date.UTC(2024, 0, 1));
  });

  it('epoch_seconds_scaled', () => {
    // epoch 秒 → ms（*1000）
    const spec = specWithField({ name: 'v', type: 'temporal', format: DataFieldFormat.EpochSeconds });
    expect(parseFirst(spec, { d: [{ v: 1700000000, y: 1 }] }, 'v')).toBe(1700000000 * 1000);
  });

  it('percent_parses', () => {
    // 百分比串 '50%' → 0.5
    const spec = specWithField({ name: 'v', type: 'continuous', format: DataFieldFormat.Percent });
    expect(parseFirst(spec, { d: [{ v: '50%', y: 1 }] }, 'v')).toBe(0.5);
  });
});

describe('IRDataFieldDefinition.format 解析行为 — 边界', () => {
  it('format_omitted_equals_builtin', () => {
    // 不写 format → 与现状内置 coerce 逐字等价（严格 ISO temporal / 严格数字串 continuous）
    const spec = specWithField({ name: 'v', type: 'temporal' });
    const value = parseFirst(spec, { d: [{ v: '2024-01-01', y: 1 }] }, 'v');
    expect(value).toBe(Date.parse('2024-01-01'));
  });

  it('numberstring_lenient', () => {
    // 宽松数字串：千分位逗号 / 前后空白
    const spec = specWithField({ name: 'v', type: 'continuous', format: DataFieldFormat.NumberString });
    expect(parseFirst(spec, { d: [{ v: '1,500', y: 1 }] }, 'v')).toBe(1500);
    expect(parseFirst(spec, { d: [{ v: ' 12 ', y: 1 }] }, 'v')).toBe(12);
  });

  it('format_implies_type_when_omitted', () => {
    // 写 format 不写 type → format 蕴含 continuous，'50%'→0.5（不被推断成 categorical）
    const spec = specWithField({ name: 'v', format: DataFieldFormat.Percent });
    expect(parseFirst(spec, { d: [{ v: '50%', y: 1 }] }, 'v')).toBe(0.5);
  });

  it('slashdate_rejects_ambiguous_layout', () => {
    // 非 YYYY/MM/DD 的歧义布局（D/M/Y）不猜 → NaN（下游按非有限跳过）
    const spec = specWithField({ name: 'v', type: 'temporal', format: DataFieldFormat.SlashDate });
    expect(Number.isNaN(parseFirst(spec, { d: [{ v: '13/01/2024', y: 1 }] }, 'v') as number)).toBe(true);
  });
});

describe('IRDataFieldDefinition.format — 错误路径', () => {
  it('format_type_mismatch_throws', () => {
    // 显式 continuous + format 蕴含 temporal（epochSeconds）冲突 → lowering fail-loud
    const spec = specWithField({ name: 'v', type: 'continuous', format: DataFieldFormat.EpochSeconds });
    expect(() => parseFirst(spec, { d: [{ v: 1700000000, y: 1 }] }, 'v')).toThrow();
  });

  it('unregistered_format_fails_at_lowering', () => {
    // 开放后 schema 接受任意非内置格式串（视作自定义名）；未注册的格式在 lowering fail-loud
    expect(() => FieldDefinitionSchema.parse({ name: 'v', type: 'continuous', format: 'comma' })).not.toThrow();
    const spec = specWithField({ name: 'v', type: 'continuous', format: 'comma' });
    expect(() => parseFirst(spec, { d: [{ v: '1,500', y: 1 }] }, 'v')).toThrow(/not registered/);
  });

  it('empty_format_rejected_by_schema', () => {
    // 空串既非内置、也不是合法自定义名 → schema 拒
    expect(() => FieldDefinitionSchema.parse({ name: 'v', type: 'continuous', format: '' })).toThrow();
  });
});

describe('IRDataFieldDefinition.format 自定义格式', () => {
  /** 千分位分隔的金额串：'1.234,56' → 1234.56（欧式小数逗号），演示自定义 continuous 解析。 */
  const currencyFormat: FieldFormatDefinition = defineFieldFormat({
    name: 'currency',
    impliedType: 'continuous',
    parse: raw => {
      if (typeof raw !== 'string') return undefined;
      const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : NaN;
    },
  });

  it('custom_format_parses_via_options', () => {
    // data.model 写自定义 format 名；options.formatDefinitions 注入 definition → 按 parse 解析
    const spec = specWithField({ name: 'v', type: 'continuous', format: 'currency' });
    const value = parseFirst(spec, { d: [{ v: '1.234,56', y: 1 }] }, 'v', { formatDefinitions: [currencyFormat] });
    expect(value).toBe(1234.56);
  });

  it('custom_format_implies_type_when_omitted', () => {
    // 省略 type → 由 definition.impliedType 覆盖推断（continuous），不被推断成 categorical
    const spec = specWithField({ name: 'v', format: 'currency' });
    const value = parseFirst(spec, { d: [{ v: '2.000,00', y: 1 }] }, 'v', { formatDefinitions: [currencyFormat] });
    expect(value).toBe(2000);
  });

  it('custom_format_type_mismatch_throws', () => {
    // 显式 temporal + 自定义 impliedType continuous 冲突 → lowering fail-loud
    const spec = specWithField({ name: 'v', type: 'temporal', format: 'currency' });
    expect(() =>
      parseFirst(spec, { d: [{ v: '1.234,56', y: 1 }] }, 'v', { formatDefinitions: [currencyFormat] }),
    ).toThrow(/incompatible/);
  });

  it('builtin_and_custom_share_registry', () => {
    // 同一 model 内内置 percent 与自定义 currency 并存，各按各自 definition 解析
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'v', type: 'continuous', format: DataFieldFormat.Percent },
          { name: 'y', type: 'continuous', format: 'currency' },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' }, y: { field: 'y' } } }],
    });
    const ingested = tagSourceIndex([{ v: '50%', y: '1.000,50' }]);
    const { normalized } = prepareRows(
      spec,
      { d: [{ v: '50%', y: '1.000,50' }] },
      { formatDefinitions: [currencyFormat] },
      ingested,
    );
    expect(normalized[0].v).toBe(0.5);
    expect(normalized[0].y).toBe(1000.5);
  });

  it('duplicate_custom_registration_throws', () => {
    // 同名自定义 format 重复注册 → fail-loud
    expect(() => resolveFormatRegistry([currencyFormat, { ...currencyFormat }])).toThrow(/duplicate/);
  });

  it('custom_cannot_shadow_builtin', () => {
    // 自定义 name 撞内置 → resolveFormatRegistry fail-loud（内置先占位）
    expect(() => resolveFormatRegistry([{ name: 'percent', impliedType: 'continuous', parse: () => 0 }])).toThrow(
      /duplicate/,
    );
  });

  it('resolveFormatRegistry_has_six_builtins', () => {
    // 无自定义时 registry 恰为 6 个内置
    const registry = resolveFormatRegistry();
    expect(registry.size).toBe(6);
    expect(registry.has('percent')).toBe(true);
  });

  it('data_public_barrel_exposes_format_surface', () => {
    // 扩展面经公共 barrel 暴露：工厂 + registry helper + 内置表
    expect(typeof DataPublic.defineFieldFormat).toBe('function');
    expect(typeof DataPublic.resolveFormatRegistry).toBe('function');
    expect(typeof DataPublic.collectFormatFields).toBe('function');
    expect(DataPublic.DataFieldFormat.Percent).toBe('percent');
    expect(DataPublic.BUILTIN_FORMATS.length).toBe(6);
    expect(DataPublic.BUILTIN_FORMAT_DEFINITIONS_BY_NAME.get('iso')?.impliedType).toBe('temporal');
  });
});

describe('IRDataFieldDefinition.format — 交互', () => {
  it('resolveField_parse_overrides_format', () => {
    // 同字段既有 format 又有 resolveField.parse → 用 parse（优先级 resolveField > format）
    const spec = specWithField({ name: 'v', type: 'continuous', format: DataFieldFormat.Percent });
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
      data: {
        reference: 'd',
        model: [
          { name: 'v', type: 'continuous', format: DataFieldFormat.Percent },
          { name: 'y', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
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
