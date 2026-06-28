import type { FieldResolution, ParsedFieldValue, ResolveField } from '../../contract';
import type { DataModel, PlotFieldTypeMap } from '../../schemas';

/**
 * 在已解析的基础类型上叠加 resolveField：类型覆盖、per-field parser 收集和命中标记。
 * @description 优先级为 resolveField.type > model/推断；parse 没有显式 type 且 model 也未声明时 fail-loud。
 */
export const applyFieldResolver = (
  baseTypes: PlotFieldTypeMap,
  userSourceFields: Set<string>,
  model: DataModel | undefined,
  dataReference: string,
  fieldMap: Record<string, string> | undefined,
  resolveField: ResolveField | undefined,
): { fieldTypes: PlotFieldTypeMap; parsers: Map<string, (raw: unknown) => ParsedFieldValue>; resolverHit: boolean } => {
  const parsers = new Map<string, (raw: unknown) => ParsedFieldValue>();
  if (resolveField === undefined) return { fieldTypes: baseTypes, parsers, resolverHit: false };
  const declaredType = new Map(
    (model ?? []).flatMap(field => (field.type !== undefined ? [[field.name, field.type] as const] : [])),
  );
  const fieldTypes: PlotFieldTypeMap = new Map(baseTypes);
  let resolverHit = false;
  for (const field of userSourceFields) {
    const resolution: FieldResolution | undefined = resolveField(field, {
      dataReference,
      physicalPath: fieldMap?.[field] ?? field,
      declaredType: declaredType.get(field),
    });
    if (resolution === undefined) continue;
    resolverHit = true;
    if (resolution.parse !== undefined && resolution.type === undefined && !declaredType.has(field)) {
      throw new Error(
        `lowerPlots: resolveField parse for "${field}" needs a type (declare it in data.model or return type from the resolver)`,
      );
    }
    if (resolution.type !== undefined) fieldTypes.set(field, resolution.type);
    if (resolution.parse !== undefined) parsers.set(field, resolution.parse);
  }
  return { fieldTypes, parsers, resolverHit };
};
