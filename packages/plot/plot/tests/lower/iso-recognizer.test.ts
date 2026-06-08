import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { PlotFieldType } from '../../src/ir/data';
import { inferFieldType, isIsoDateString } from '../../src/lower/infer';
import { toTimestamp } from '../../src/lower/scale';
import { type LowerPlotsOptions, prepareRows } from '../../src/lower/expand';
import { tagSourceIndex } from '../../src/lower/provenance';

/** 单字段行 → 推断类型（无 model，纯抽样推断） */
const inferOne = (values: Array<unknown>): string => inferFieldType(values.map(v => ({ v })), 'v');

/** 构造引用逻辑字段 `v` 的最小 spec（绑 x），取 prepareRows 后 normalized[0].v */
const specWithField = (field: { name: string } & Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [field, { name: 'y', type: 'continuous' }] },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: field.name }, y: { field: 'y' } } }],
  });

const parseFirst = (
  spec: PlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = {},
): unknown => {
  const ingested = tagSourceIndex(datasets.d);
  const { normalized } = prepareRows(spec, datasets, options, ingested);
  return normalized[0].v;
};

describe('ISO 识别器扩宽（ADR-09）— happy path', () => {
  it('space_tz_inferred_temporal', () => {
    // 空格分隔 + Z 时区（SQL 时间戳）→ 推断 temporal
    expect(inferOne(['2024-01-01 12:00:00Z', '2024-06-30 08:30:00Z'])).toBe(PlotFieldType.Temporal);
  });

  it('space_offset_inferred_temporal', () => {
    // 空格分隔 + ±HH:MM offset → 推断 temporal
    expect(inferOne(['2024-01-01 12:00:00+08:00'])).toBe(PlotFieldType.Temporal);
  });

  it('space_form_parses_equal_to_T', () => {
    // 空格形与等价 T 形解析出同一 epoch ms
    expect(toTimestamp('2024-01-01 12:00:00Z')).toBe(toTimestamp('2024-01-01T12:00:00Z'));
    expect(toTimestamp('2024-01-01 12:00:00Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });
});

describe('ISO 识别器扩宽（ADR-09）— 边界', () => {
  it('date_only_unchanged', () => {
    // 纯日期正则不动，仍 temporal
    expect(isIsoDateString('2024-01-01')).toBe(true);
    expect(inferOne(['2024-01-01', '2024-12-31'])).toBe(PlotFieldType.Temporal);
  });

  it('strict_T_datetime_unchanged', () => {
    // 既有 T 分隔带时区行为不变
    expect(isIsoDateString('2024-01-01T12:00:00Z')).toBe(true);
    expect(toTimestamp('2024-01-01T12:00:00Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });

  it('fractional_seconds_space', () => {
    // 空格 + 小数秒 + Z → 正确解析
    expect(isIsoDateString('2024-01-01 12:00:00.123Z')).toBe(true);
    expect(toTimestamp('2024-01-01 12:00:00.123Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0, 123));
  });
});

describe('ISO 识别器扩宽（ADR-09）— 错误路径（歧义形态仍拒）', () => {
  it('no_timezone_space_rejected', () => {
    // 无时区（本地歧义）→ 非 temporal、不解析
    expect(isIsoDateString('2024-01-01 12:00:00')).toBe(false);
    expect(toTimestamp('2024-01-01 12:00:00')).toBe(null);
    expect(inferOne(['2024-01-01 12:00:00'])).toBe(PlotFieldType.Categorical);
  });

  it('slash_still_not_temporal', () => {
    // 斜杠日期仍走声明、非自动 temporal
    expect(isIsoDateString('2024/01/01')).toBe(false);
    expect(inferOne(['2024/01/01', '2024/02/01'])).toBe(PlotFieldType.Categorical);
  });

  it('compact_numeric_not_temporal', () => {
    // 紧凑数字串与裸数字歧义，不收
    expect(isIsoDateString('20240101')).toBe(false);
    expect(inferOne(['20240101', '20240102'])).toBe(PlotFieldType.Categorical);
  });
});

describe('ISO 识别器扩宽（ADR-09）— 交互（经 lowering / format）', () => {
  it('declared_temporal_space_value_parses', () => {
    // 声明 temporal + 空格带时区值 → 经 lowering 得正确 epoch ms
    const spec = specWithField({ name: 'v', type: 'temporal' });
    expect(parseFirst(spec, { d: [{ v: '2024-01-01 12:00:00Z', y: 1 }] })).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });

  it('format_iso_accepts_space', () => {
    // format:'iso' 经 toTimestamp，自动继承空格分隔
    const spec = specWithField({ name: 'v', type: 'temporal', format: 'iso' });
    expect(parseFirst(spec, { d: [{ v: '2024-01-01 12:00:00Z', y: 1 }] })).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });
});
