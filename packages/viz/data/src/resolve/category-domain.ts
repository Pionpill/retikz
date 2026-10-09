import type { FieldOrderDefinition } from '../contract';
import { RetikzDataError } from '../error';
import { inferCategoryDomain, resolveFieldOrderRegistry } from '../providers';
import type { IRDataFieldDefinition } from '../schemas';
import { BuiltinFieldOrderMode } from '../schemas';

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

/**
 * 解析分类域，不修改输入值或显式顺序数组
 * @param values 原始类别值；仅保留字符串与有限数字并按首次出现顺序去重
 * @param order 排序名称或非空显式类别数组；undefined 表示按出现顺序。显式数组之后追加未列出的观测类别
 * @param registry 名称到比较器的映射；省略时使用内置排序注册表
 * @returns 排列后的分类域；数字和字符串保持各自身份
 * @throws {RetikzDataError} 排序名称未注册、比较器抛出异常或返回非有限数值
 */
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
  const name = order ?? BuiltinFieldOrderMode.Appearance;
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
