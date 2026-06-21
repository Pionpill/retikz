import type { FieldFormatDefinition, ParsedFieldValue } from '../../contract';
import type { DataModel, PlotFieldTypeMap } from '../../schemas';
import { resolveFormatRegistry } from './definitions';

/**
 * 收集 model 里的 format 声明，按 registry 解析格式，校验 format 与 type 的兼容性，并产出 per-field parser。
 * @description format 经 registry 解析出 definition：impliedType 在字段省略 type 时覆盖基础推断；
 *   format 未注册 / 与显式 type 冲突均 fail-loud，避免静默把自定义值误判为缺失。
 */
export const collectFormatFields = (
  model: DataModel | undefined,
  baseTypes: PlotFieldTypeMap,
  userSourceFields: Set<string>,
  registry: ReadonlyMap<string, FieldFormatDefinition> = resolveFormatRegistry(),
): { fieldTypes: PlotFieldTypeMap; parsers: Map<string, (raw: unknown) => ParsedFieldValue> } => {
  const fieldTypes: PlotFieldTypeMap = new Map(baseTypes);
  const parsers = new Map<string, (raw: unknown) => ParsedFieldValue>();
  if (model === undefined) return { fieldTypes, parsers };
  for (const field of model) {
    if (field.format === undefined) continue;
    if (!userSourceFields.has(field.name)) continue;
    const definition = registry.get(field.format);
    if (definition === undefined) {
      throw new Error(`lowerPlots: field format "${field.format}" is not registered; pass a FieldFormatDefinition via options.formatDefinitions`);
    }
    const impliedType = definition.impliedType;
    if (field.type !== undefined && field.type !== impliedType) {
      throw new Error(`lowerPlots: field "${field.name}" declares type "${field.type}" but format "${field.format}" implies "${impliedType}" (incompatible)`);
    }
    fieldTypes.set(field.name, impliedType);
    parsers.set(field.name, definition.parse);
  }
  return { fieldTypes, parsers };
};
