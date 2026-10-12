import type { ExternalRow } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { format as d3Format } from 'd3-format';
import { utcFormat as d3UtcFormat } from 'd3-time-format';

import type { FieldCollector, ResolveLabel } from '../../../contract';
import type { IRPlotChannel, IRPlotMarkLabelContent, IRPlotTextChannel } from '../../../schemas';

/**
 * 取通道值：value 常量优先，否则 field 路径解析
 * @param channel 字段或常量绑定；省略表示未绑定
 * @param row 当前图元使用的数据行
 * @returns 常量或字段值；绑定或字段缺失时返回 undefined
 */
export const channelValue = (channel: IRPlotChannel | undefined, row: ExternalRow): unknown => {
  if (!channel) return undefined;
  if (channel.value !== undefined) return channel.value;
  if (channel.field !== undefined) return resolveFieldPath(row, channel.field);

  return undefined;
};

/**
 * 把字段值按展示格式串格式化
 * @description temporal 使用 d3-time-format，其余使用 d3-format；非法格式或非法值回退到 String(value)
 */
const applyDisplayFormat = (value: unknown, displayFormat: string, fieldType: DataFieldType | undefined): string => {
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
 * text 内容通道某行解析为标签串
 * @description resolveLabel 最高优先；其次 field 解析值；再次 value 常量
 * @param content 字段或常量文本内容及可选展示格式
 * @param row 当前图元使用的数据行
 * @param fieldType 字段类型；temporal 使用 UTC 时间格式，其余使用数值格式
 * @param resolveLabel 优先于声明内容的运行时标签回调；省略时读取 content
 * @returns 格式化文本或常量内容；字段为空或没有内容时返回 undefined
 */
export const labelOf = (
  content: IRPlotTextChannel | IRPlotMarkLabelContent,
  row: ExternalRow,
  fieldType?: DataFieldType,
  resolveLabel?: ResolveLabel,
): IRPlotMarkLabelContent['value'] | string | undefined => {
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

/**
 * 创建 plot 字段收集器，支持 channel 结构并把所有写入落到传入 Set
 * @param fields 接收字段名的可变集合；收集操作直接写入此集合
 * @returns 共享传入集合的字段收集器，常量绑定不会加入字段
 */
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
