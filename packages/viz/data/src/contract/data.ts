import type { PlotFieldTypeValue } from '../schemas';

/** 运行时 canonical 值，不含 boolean / null；coerceValue 与自定义 parse 的输出域。 */
export type ParsedFieldValue = string | number | undefined;

/**
 * 单字段解析结果，运行时使用，不进 IR。
 * @description type 覆盖最终类型；parse 覆盖内置 coercion，返回 undefined 跳过该值。
 */
export type FieldResolution = {
  /** 覆盖最终字段类型；省略则用 model 声明 / 自动推断。 */
  type?: PlotFieldTypeValue;
  /** 覆盖内置 coercion：原始值 -> canonical 值；返回 undefined 跳过该值。 */
  parse?: (raw: unknown) => ParsedFieldValue;
};

/**
 * 程序化字段解析逃生舱，运行时函数，不进 IR。
 * @description 按字段名返回类型覆盖 + 可选自定义解析；返回 undefined 则回退 model/推断 + 内置 coerce。
 */
export type ResolveField = (
  field: string,
  context: { dataReference: string; physicalPath: string; declaredType?: PlotFieldTypeValue },
) => FieldResolution | undefined;

/** transform/source-field 收集器；只承载 data 层字段名，不理解 plot channel 结构。 */
export type FieldCollector = {
  /** 登记单个字段名；undefined 会被调用方忽略。 */
  addField: (field: string | undefined) => void;
  /** 批量登记字段名；undefined 会被调用方忽略。 */
  addFields: (...fields: Array<string | undefined>) => void;
};
