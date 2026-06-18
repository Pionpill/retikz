import type { DataModel, PlotFieldTypeValue } from '../ir';
import type { ParsedFieldValue } from './coerce';

export type { ParsedFieldValue } from './coerce';

/**
 * 单字段解析结果（运行时，不进 IR）
 * @description type 覆盖最终类型（省略 → 用 model/推断）；parse 覆盖内置 coercion（返回 undefined 跳过该值）。
 *   parse 必须返回与最终 type 同形的值（temporal/continuous→number、categorical→string|number）。
 */
export type FieldResolution = {
  /** 覆盖最终字段类型；省略则用 model 声明 / 自动推断 */
  type?: PlotFieldTypeValue;
  /** 覆盖内置 coercion：原始值 → canonical 值；返回 undefined 跳过该值 */
  parse?: (raw: unknown) => ParsedFieldValue;
};

/**
 * 程序化字段解析逃生舱（运行时函数，不进 IR）
 * @description 按字段名返回类型覆盖 + 可选自定义解析；返回 undefined → 回退 model/推断 + 内置 coerce。
 *   context 带数据集上下文：dataReference（同名字段跨源可不同解析）、physicalPath（fieldMap 解析后路径）、declaredType（model 声明类型）。
 */
export type ResolveField = (
  field: string,
  context: { dataReference: string; physicalPath: string; declaredType?: PlotFieldTypeValue },
) => FieldResolution | undefined;

/**
 * 在已解析的基础类型上叠加 resolveField：类型覆盖 + 收集 per-field parser + 命中标记
 * @description 优先级 resolveField.type > model/推断（基础 Map）；不绕过 strict（strict 在 resolveFieldTypes 已先校验）。
 *   parse 无 type 且 model 未声明该字段类型 → fail-loud（类型来源不清，自定义值会被误判）。
 */
export const applyFieldResolver = (
  baseTypes: Map<string, PlotFieldTypeValue>,
  userSourceFields: Set<string>,
  model: DataModel | undefined,
  dataReference: string,
  fieldMap: Record<string, string> | undefined,
  resolveField: ResolveField | undefined,
): { fieldTypes: Map<string, PlotFieldTypeValue>; parsers: Map<string, (raw: unknown) => ParsedFieldValue>; resolverHit: boolean } => {
  const parsers = new Map<string, (raw: unknown) => ParsedFieldValue>();
  if (resolveField === undefined) return { fieldTypes: baseTypes, parsers, resolverHit: false };
  const declaredType = new Map((model ?? []).flatMap(field => (field.type !== undefined ? [[field.name, field.type] as const] : [])));
  const fieldTypes = new Map(baseTypes);
  let resolverHit = false;
  for (const field of userSourceFields) {
    const resolution = resolveField(field, { dataReference, physicalPath: fieldMap?.[field] ?? field, declaredType: declaredType.get(field) });
    if (resolution === undefined) continue;
    resolverHit = true;
    if (resolution.parse !== undefined && resolution.type === undefined && !declaredType.has(field)) {
      throw new Error(`lowerPlots: resolveField parse for "${field}" needs a type (declare it in data.model or return type from the resolver)`);
    }
    if (resolution.type !== undefined) fieldTypes.set(field, resolution.type);
    if (resolution.parse !== undefined) parsers.set(field, resolution.parse);
  }
  return { fieldTypes, parsers, resolverHit };
};
