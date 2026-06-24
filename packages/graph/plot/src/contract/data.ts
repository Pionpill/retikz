import type { ExternalRow, PlotFieldTypeValue } from '../schemas';

/** 运行时 canonical 值，不含 boolean / null；coerceValue 与自定义 parse 的输出域。 */
export type ParsedFieldValue = string | number | undefined;

/** 运行时 label 解析逃生舱，不进 IR。 */
export type ResolveLabel = (row: ExternalRow) => string;

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

/**
 * 字段解析格式 runtime definition。
 * @description definition 是运行时对象，不进 JSON IR；IR 只在 FieldDef.format 保存格式名。
 */
export type FieldFormatDefinition = {
  /** 注册键 = IR 中 FieldDef.format 字符串；必须非空，且不与内置格式名冲突。 */
  name: string;
  /** 该格式唯一蕴含的字段测量类型；字段省略 type 时由它覆盖推断。 */
  impliedType: PlotFieldTypeValue;
  /** 原始值 -> canonical 值；返回 undefined / NaN 表示该值非法。 */
  parse: (raw: unknown) => ParsedFieldValue;
};

/**
 * 定义一个字段解析格式 definition。
 * @description 内置与自定义格式经同一 registry 入口分派；spec 里仍只写 `{ name, format }` JSON。
 */
export const defineFieldFormat = (def: FieldFormatDefinition): FieldFormatDefinition => def;
