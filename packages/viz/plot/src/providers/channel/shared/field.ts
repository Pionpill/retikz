import type { IRNodeLabel } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';
import { DataFieldType } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';
import { format as d3Format } from 'd3-format';
import { utcFormat as d3UtcFormat } from 'd3-time-format';

import type { FieldCollector, LabelResolver } from '../../../contract';
import { channelField } from '../../../contract';
import type { IRPlotChannel } from '../../../schemas';

/**
 * 读取字段编码在当前行中的原始值
 * @param channel 字段绑定；省略表示未绑定
 * @param row 当前图元使用的数据行
 * @returns 字段值；绑定或字段缺失时返回 undefined
 */
export const channelValue = (channel: IRPlotChannel | undefined, row: ExternalRow): unknown => {
  return channel === undefined ? undefined : resolveFieldPath(row, channelField(channel));
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
 * @description resolveLabel 最高优先；有字段编码时读取字段，否则使用固定内容
 * @param text 固定文本内容
 * @param row 当前图元使用的数据行
 * @param fieldType 字段类型；temporal 使用 UTC 时间格式，其余使用数值格式
 * @param resolveLabel 优先于声明内容的运行时标签回调；省略时读取 text
 * @param field 可选的字段编码；无效值不回退到固定内容
 * @param displayFormat 字段值的显示格式
 * @returns 格式化文本或常量内容；字段为空或没有内容时返回 undefined
 */
export const labelOf = (
  text: IRNodeLabel['text'] | undefined,
  row: ExternalRow,
  fieldType?: DataFieldType,
  resolveLabel?: LabelResolver,
  field?: string,
  displayFormat?: string,
): IRNodeLabel['text'] | string | undefined => {
  if (resolveLabel !== undefined) return String(resolveLabel(row));
  if (field !== undefined) {
    const value = resolveFieldPath(row, field);
    if (value === null || value === undefined) return undefined;

    return displayFormat !== undefined ? applyDisplayFormat(value, displayFormat, fieldType) : String(value);
  }
  return text;
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
    fields.add(channelField(channel));
  },
});
