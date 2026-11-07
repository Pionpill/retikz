import type { DataTransformModel, DataFieldType } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';

import type { ChannelResolution } from '../../../contract';
import { channelField, channelScale } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotChannel } from '../../../schemas';

export type { ChannelResolution, ScaleDescriptor } from '../../../contract';

/**
 * mark 样式值解析出的逐行 resolver 与字段元数据
 * @template T 逐行解析后交给 mark 的视觉值类型
 */
export type MarkValueResolution<T> = ChannelResolution<T> & {
  /** 绑定的数据字段名；常量值没有字段名 */
  field?: string;
  /** 绑定字段的解析类型；常量值或未知字段类型时省略 */
  fieldType?: DataFieldType;
};

/**
 * 创建 mark 样式值 resolver 时的字段类型与常量处理策略
 * @template T 原始字段解析成功时返回的视觉值类型
 */
export type MarkValueResolverOptions<T> = {
  /** 用于错误信息的属性 / 通道名 */
  channelName: string;
  /** 字段变体允许的字段类型；省略表示不做类型限制 */
  expectedFieldType?: DataFieldType;
  /** 把数据行中的原始字段值转换为属性值；返回 undefined 表示该行跳过该属性 */
  parse: (value: unknown) => T | undefined;
};

/**
 * 把 schema 定义的 mark 样式值解析为「行 → 属性值」函数，供内置图元复用
 * @template T 字段解析器产出的视觉值类型
 * @param encoding 字段编码；省略时不产生解析结果
 * @param model 当前数据的完整字段模型
 * @param options 字段类型限制与值解析策略
 * @returns 逐行解析器与字段元数据；未绑定时返回 undefined
 * @throws {RetikzPlotError} 已知字段类型与 expectedFieldType 不一致
 */
export const createMarkValueResolver = <T>(
  encoding: IRPlotChannel | undefined,
  model: DataTransformModel,
  options: MarkValueResolverOptions<T>,
): MarkValueResolution<T> | undefined => {
  if (encoding === undefined) return undefined;
  if (channelScale(encoding) !== undefined)
    throw new RetikzPlotError(`${options.channelName} does not support scale mapping`);
  const field = channelField(encoding);
  const fieldType = model.find(definition => definition.name === field)?.type;
  if (options.expectedFieldType !== undefined && fieldType !== undefined && fieldType !== options.expectedFieldType) {
    throw new RetikzPlotError(
      `lowerPlots: ${options.channelName} channel field "${field}" is ${fieldType}; ${options.channelName} requires a ${options.expectedFieldType} field`,
    );
  }

  return {
    field,
    fieldType,
    resolver: row => options.parse(resolveFieldPath(row, field)),
  };
};

/** 将数据层的布尔分类值还原为绘图布尔属性 */
export const booleanChannelValue = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};
