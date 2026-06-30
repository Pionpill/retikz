import type { PlotFieldTypeValue } from '../../schemas';
import type { ParsedFieldValue } from '../data';

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
