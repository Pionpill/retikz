import { coerceTimestamp, inferFieldType, isIsoDateString } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { prepareRows } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

/** 单字段行 → 推断类型（无 model，纯抽样推断） */
const inferOne = (values: Array<unknown>): string =>
  inferFieldType(
    values.map(v => ({ v })),
    'v',
  );

/** 构造引用逻辑字段 `v` 的最小 spec（绑 x），取 prepareRows 后 normalized[0].v */
const specWithField = (field: { name: string } & Record<string, unknown>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [field, { name: 'y', type: 'continuous' }] },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encodings: { position: { x: { field: field.name }, y: { field: 'y' } } } }],
  });

const parseFirst = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions = {},
): unknown => {
  const ingested = tagSourceIndex(datasets.d);
  const { normalized } = prepareRows(spec, datasets, options, ingested);
  return normalized[0].v;
};

describe('ISO 识别器扩宽（contract）— happy path', () => {
  it('空间 tz 推断时间', () => {
    // 空格分隔 + Z 时区（SQL 时间戳）→ 推断 temporal
    expect(inferOne(['2024-01-01 12:00:00Z', '2024-06-30 08:30:00Z'])).toBe(DataFieldType.Temporal);
  });

  it('空间偏移推断时间', () => {
    // 空格分隔 + ±HH:MM offset → 推断 temporal
    expect(inferOne(['2024-01-01 12:00:00+08:00'])).toBe(DataFieldType.Temporal);
  });

  it('空间形式解析等于 T', () => {
    // 空格形与等价 T 形解析出同一 epoch ms
    expect(coerceTimestamp('2024-01-01 12:00:00Z')).toBe(coerceTimestamp('2024-01-01T12:00:00Z'));
    expect(coerceTimestamp('2024-01-01 12:00:00Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });
});

describe('ISO 识别器扩宽（contract）— 边界', () => {
  it('仅日期未更改', () => {
    // 纯日期正则不动，仍 temporal
    expect(isIsoDateString('2024-01-01')).toBe(true);
    expect(inferOne(['2024-01-01', '2024-12-31'])).toBe(DataFieldType.Temporal);
  });

  it('严格的 T 日期时间不变', () => {
    // 既有 T 分隔带时区行为不变
    expect(isIsoDateString('2024-01-01T12:00:00Z')).toBe(true);
    expect(coerceTimestamp('2024-01-01T12:00:00Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });

  it('小数秒空间', () => {
    // 空格 + 小数秒 + Z → 正确解析
    expect(isIsoDateString('2024-01-01 12:00:00.123Z')).toBe(true);
    expect(coerceTimestamp('2024-01-01 12:00:00.123Z')).toBe(Date.UTC(2024, 0, 1, 12, 0, 0, 123));
  });
});

describe('ISO 识别器扩宽（contract）— 错误路径（歧义形态仍拒）', () => {
  it('没有拒绝时区空间', () => {
    // 无时区（本地歧义）→ 非 temporal、不解析
    expect(isIsoDateString('2024-01-01 12:00:00')).toBe(false);
    expect(coerceTimestamp('2024-01-01 12:00:00')).toBe(null);
    expect(inferOne(['2024-01-01 12:00:00'])).toBe(DataFieldType.Categorical);
  });

  it('斜杠仍然不是临时的', () => {
    // 斜杠日期仍走声明、非自动 temporal
    expect(isIsoDateString('2024/01/01')).toBe(false);
    expect(inferOne(['2024/01/01', '2024/02/01'])).toBe(DataFieldType.Categorical);
  });

  it('紧凑数值不推断为时间类型', () => {
    // 紧凑数字串与裸数字歧义，不收
    expect(isIsoDateString('20240101')).toBe(false);
    expect(inferOne(['20240101', '20240102'])).toBe(DataFieldType.Categorical);
  });
});

describe('ISO 识别器扩宽（contract）— 交互（经 lowering / format）', () => {
  it('声明的时间空间值解析', () => {
    // 声明 temporal + 空格带时区值 → 经 lowering 得正确 epoch ms
    const spec = specWithField({ name: 'v', type: 'temporal' });

    expect(parseFirst(spec, { d: [{ v: '2024-01-01 12:00:00Z', y: 1 }] })).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });

  it('iso 格式接受空格', () => {
    // format:'iso' 经 coerceTimestamp，自动继承空格分隔
    const spec = specWithField({ name: 'v', type: 'temporal', format: 'iso' });

    expect(parseFirst(spec, { d: [{ v: '2024-01-01 12:00:00Z', y: 1 }] })).toBe(Date.UTC(2024, 0, 1, 12, 0, 0));
  });
});
