import type { DataFieldTypeValue } from '../schemas';
import type { ParsedFieldValue } from './data';

/**
 * 字段解析格式 runtime definition。
 * @description definition 是运行时对象，不进 JSON IR；IR 只在 FieldDef.format 保存格式名。
 */
export type FieldFormatDefinition = {
  /** 注册键 = IR 中 FieldDef.format 字符串；必须非空，且不与内置格式名冲突。 */
  name: string;
  /** 该格式唯一蕴含的字段测量类型；字段省略 type 时由它覆盖推断。 */
  impliedType: DataFieldTypeValue;
  /** 原始值 -> 运行时字段规范值；返回 undefined / NaN 表示该值非法。 */
  parse: (raw: unknown) => ParsedFieldValue;
};

/**
 * 定义一个字段解析格式 definition。
 * @description 内置与自定义格式经同一 registry 入口分派；spec 里仍只写 `{ name, format }` JSON。
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook。
 */
export const defineFieldFormat = (def: FieldFormatDefinition): FieldFormatDefinition => def;
