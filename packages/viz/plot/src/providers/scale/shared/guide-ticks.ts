import { format as d3Format } from 'd3-format';
import { utcFormat as d3UtcFormat } from 'd3-time-format';

import type { PositionScale, TickSet } from '../../../contract';
import type { ScalarValue } from '../../../schemas';

import { coerceTimestamp } from '../../data';

/** axis guide 的刻度来源配置。 */
export type GuideTickSourceInput = {
  /** 目标刻度数；由 scale 自己决定最终刻度值。 */
  count?: number;
  /** 显式刻度值；分类 scale 可用字符串，数值 / 时间 scale 会先校验并归一化。 */
  values?: Array<string | number>;
};

/** axis guide 的刻度标签格式化配置。 */
export type GuideTickLabelFormatInput = {
  /** d3-format 或 d3-time-format 风格格式字符串；未知 tickKind 的自定义 scale 保留原标签。 */
  format?: string;
};

const normalizeExplicitTick = (scale: PositionScale, value: string | number): ScalarValue => {
  if (scale.tickKind === 'category') return value;
  if (scale.tickKind === 'time') {
    const stamp = coerceTimestamp(value);
    if (stamp === null) {
      throw new Error(`lowerPlots: time guide tick value must be an epoch millisecond or ISO-like string (got "${value}")`);
    }
    return stamp;
  }
  if (scale.tickKind === undefined) return value;
  if (typeof value !== 'number') {
    throw new Error(`lowerPlots: numeric guide tick value must be a number (got "${value}")`);
  }
  return value;
};

const formatLabel = (scale: PositionScale, format: string | undefined, value: ScalarValue, fallback: string): string => {
  if (format === undefined || scale.tickKind === undefined || scale.tickKind === 'category') return fallback;
  if (scale.tickKind === 'time') return d3UtcFormat(format)(new Date(Number(value)));
  return d3Format(format)(Number(value));
};

/**
 * 解析 axis guide 使用的刻度值和标签。
 * @description 优先消费显式 ticks.values；否则委托 PositionScale.ticks。格式化按 tickKind 选择数字 / 时间 formatter，分类和未知 tickKind 保留原标签。
 */
export const resolveGuideTicks = (
  scale: PositionScale,
  source?: GuideTickSourceInput,
  labelFormat?: GuideTickLabelFormatInput,
): TickSet => {
  if (source?.values !== undefined) {
    const values = source.values.map(value => normalizeExplicitTick(scale, value));
    const labels = values.map((value, index) =>
      formatLabel(scale, labelFormat?.format, value, String(source.values?.[index] ?? value)),
    );
    return { values, labels };
  }

  const ticks = scale.ticks(source?.count);
  if (labelFormat?.format === undefined) return ticks;
  return {
    values: ticks.values,
    labels: ticks.values.map((value, index) => formatLabel(scale, labelFormat.format, value, ticks.labels[index])),
  };
};
