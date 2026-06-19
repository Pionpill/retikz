import type { ParsedFieldValue } from '../data';
import type { PlotFieldTypeValue } from '../schemas';

/**
 * 字段解析格式 runtime definition。
 * @description definition 是运行时对象，不进 JSON IR；IR 只在 FieldDef.format 保存格式名串。
 *   内置 6 个格式与自定义格式都经同一 resolveFormatRegistry 分派；name 即注册键 = IR 中的 format 串。
 */
export type FieldFormatDefinition = {
  /** 注册键 = IR 中 FieldDef.format 串；必须非空、且不与内置格式名冲突。 */
  name: string;
  /** 该格式唯一蕴含的字段测量类型；字段省略 type 时由它覆盖推断，显式 type 与之冲突则 lowering fail-loud。 */
  impliedType: PlotFieldTypeValue;
  /** 原始值 → canonical 值；返回 undefined / NaN 表示该值非法（下游按非有限值跳过）。必须纯且确定。 */
  parse: (raw: unknown) => ParsedFieldValue;
};

/**
 * 定义一个字段解析格式 definition。
 * @description 内置与自定义格式经同一 registry 入口分派；写进 spec 的 data.model 仍只是 `{ name, format: '<name>' }` JSON。
 */
export const defineFieldFormat = (def: FieldFormatDefinition): FieldFormatDefinition => def;
