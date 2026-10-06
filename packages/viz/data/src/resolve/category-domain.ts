import type { FieldOrderDefinition } from '../contract';
import { RetikzDataError } from '../error';
import { inferCategoryDomain, resolveFieldOrderRegistry } from '../providers';
import type { IRDataFieldDefinition } from '../schemas';
import { FieldOrderMode } from '../schemas';

/** 校验模型引用的分类顺序，即使当前没有观测值也不能忽略未知名称 */
export const assertFieldOrders = (
  model: ReadonlyArray<Pick<IRDataFieldDefinition, 'name' | 'order'>> | undefined,
  registry: ReadonlyMap<string, FieldOrderDefinition> = resolveFieldOrderRegistry(),
): void => {
  for (const field of model ?? []) {
    if (typeof field.order === 'string' && !registry.has(field.order)) {
      throw new RetikzDataError(`data: field "${field.name}" references unknown order "${field.order}"`, {
        path: field.name,
      });
    }
  }
};

/** 解析分类域，保持类别身份、输入数据与显式数组的既有语义 */
export const resolveCategoryDomain = (
  values: Array<unknown>,
  order: IRDataFieldDefinition['order'],
  registry: ReadonlyMap<string, FieldOrderDefinition> = resolveFieldOrderRegistry(),
): Array<string | number> => {
  const categories = inferCategoryDomain(values);
  if (Array.isArray(order)) {
    const specified = new Set(order);
    return [...order, ...categories.filter(value => !specified.has(value))];
  }
  const name = order ?? FieldOrderMode.Appearance;
  const definition = registry.get(name);
  if (definition === undefined) throw new RetikzDataError(`data: unknown field order "${name}"`);
  const context = { values: categories };
  return [...categories].sort((a, b) => {
    let result: number;
    try {
      result = definition.compare(a, b, context);
    } catch (cause) {
      throw new RetikzDataError(`data: field order "${name}" comparison failed`, { cause });
    }
    if (!Number.isFinite(result))
      throw new RetikzDataError(`data: field order "${name}" must return a finite comparison`);
    return result;
  });
};
