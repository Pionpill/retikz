import type { DataFieldTypeValue, ExternalRow } from '@retikz/data';

import { resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { format as d3Format } from 'd3-format';
import { utcFormat as d3UtcFormat } from 'd3-time-format';

import type { FieldCollector, ResolveLabel } from '../../../contract';
import type { Channel, MarkLabelContent, TextChannel } from '../../../schemas';

/** 取通道值：value 常量优先，否则 field 路径解析。 */
export const channelValue = (channel: Channel | undefined, row: ExternalRow): unknown => {
  if (!channel) return undefined;
  if (channel.value !== undefined) return channel.value;
  if (channel.field !== undefined) return resolveFieldPath(row, channel.field);
  return undefined;
};

/**
 * 把字段值按展示格式串格式化。
 * @description temporal 使用 d3-time-format，其余使用 d3-format；非法格式或非法值回退到 String(value)。
 */
const applyDisplayFormat = (
  value: unknown,
  displayFormat: string,
  fieldType: DataFieldTypeValue | undefined,
): string => {
  try {
    if (fieldType === DataFieldType.Temporal) {
      if (!isFiniteNumber(value)) return String(value);
      return d3UtcFormat(displayFormat)(new Date(value));
    }
    if (!isFiniteNumber(value)) return String(value);
    return d3Format(displayFormat)(value);
  } catch {
    return String(value);
  }
};

/**
 * text 内容通道某行解析为标签串。
 * @description resolveLabel 最高优先；其次 field 解析值；再次 value 常量。
 */
export const labelOf = (
  content: TextChannel | MarkLabelContent,
  row: ExternalRow,
  fieldType?: DataFieldTypeValue,
  resolveLabel?: ResolveLabel,
): MarkLabelContent['value'] | string | undefined => {
  if (resolveLabel !== undefined) return String(resolveLabel(row));
  if (content.field !== undefined) {
    const value = resolveFieldPath(row, content.field);
    if (value === null || value === undefined) return undefined;
    return content.displayFormat !== undefined
      ? applyDisplayFormat(value, content.displayFormat, fieldType)
      : String(value);
  }
  if (content.value !== undefined) return content.value;
  return undefined;
};

/** 创建 plot 字段收集器，支持 channel 结构并把所有写入落到传入 Set。 */
export const createFieldCollector = (fields: Set<string>): FieldCollector => ({
  addField: field => {
    if (field !== undefined) fields.add(field);
  },
  addFields: (...sourceFields) => {
    for (const field of sourceFields) {
      if (field !== undefined) fields.add(field);
    }
  },
  addChannel: channel => {
    if (channel === undefined) return;
    if ('kind' in channel) {
      if (channel.kind === 'field') fields.add(String(channel.value));
      return;
    }
    if (channel.field !== undefined) fields.add(channel.field);
  },
});
