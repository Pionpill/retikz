import { type ChannelResolution } from '../../contract';
import { resolveFieldPath } from '../data';
import { type MarkValueType, type PlotFieldTypeMap, type PlotFieldTypeValue } from '../../schemas';
export type { ChannelResolution, ScaleDescriptor } from '../../contract';

export type MarkValueResolution<T> = ChannelResolution<T> & {
  /** 绑定的数据字段名；常量值没有字段名。 */
  field?: string;
  /** 绑定字段的解析类型；常量值或未知字段类型时省略。 */
  fieldType?: PlotFieldTypeValue;
};

export type MarkValueResolverOptions<T> = {
  /** 用于错误信息的属性 / 通道名。 */
  channelName: string;
  /** 字段变体允许的字段类型；省略表示不做类型限制。 */
  expectedFieldType?: PlotFieldTypeValue;
  /** 把数据行中的原始字段值转换为属性值；返回 undefined 表示该行跳过该属性。 */
  parse: (value: unknown) => T | undefined;
  /** 常量变体是否也产出 resolver；默认产出，PointMark 的 nodeDefault 压缩场景可显式跳过。 */
  constants?: 'resolve' | 'skip';
};

/** 把 MarkValueType 解析为「行 → 属性值」函数，供内置 mark 与自定义 mark 复用。 */
export const makeMarkValueResolver = <T>(
  value: MarkValueType<T> | undefined,
  fieldTypes: PlotFieldTypeMap,
  options: MarkValueResolverOptions<T>,
): MarkValueResolution<T> | undefined => {
  if (value === undefined) return undefined;
  if (value.kind === 'constant') {
    if (options.constants === 'skip') return undefined;
    return { resolver: () => value.value };
  }
  const field = value.value;
  const fieldType = fieldTypes.get(field);
  if (options.expectedFieldType !== undefined && fieldType !== undefined && fieldType !== options.expectedFieldType) {
    throw new Error(`lowerPlots: ${options.channelName} channel field "${field}" is ${fieldType}; ${options.channelName} requires a ${options.expectedFieldType} field`);
  }
  return {
    field,
    fieldType,
    resolver: row => options.parse(resolveFieldPath(row, field)),
  };
};
