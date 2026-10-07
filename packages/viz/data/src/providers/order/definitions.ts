import { createReadonlyMap } from '@retikz/foundation';

import type { FieldOrderDefinition } from '../../contract';
import { defineFieldOrder } from '../../contract';
import { RetikzDataError } from '../../error';
import { FieldOrderMode } from '../../schemas';
import { freezeDefinitions } from '../shared';

/** 按固定文本序与任意长度 ASCII 整数片段比较类别，不改写原始值 */
const compareNatural = (a: string | number, b: string | number): number => {
  const left = String(a).match(/[0-9]+|[^0-9]+/g) ?? [];
  const right = String(b).match(/[0-9]+|[^0-9]+/g) ?? [];
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    const aPart = left[index];
    const bPart = right[index];
    const aNumeric = /^[0-9]/.test(aPart);
    const bNumeric = /^[0-9]/.test(bPart);
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    const aKey = aNumeric ? aPart.replace(/^0+/, '') : aPart;
    const bKey = bNumeric ? bPart.replace(/^0+/, '') : bPart;
    if (aNumeric && aKey.length !== bKey.length) return aKey.length - bKey.length;
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;
  }
  return left.length - right.length;
};

/** 保留既有全数字比较与 locale 字符串比较规则 */
const compareAscending: FieldOrderDefinition['compare'] = (a, b, context) =>
  context.values.every(value => typeof value === 'number')
    ? a === b
      ? 0
      : a < b
        ? -1
        : 1
    : String(a).localeCompare(String(b));

/** 内置与自定义共享相同的比较协议 */
export const BUILTIN_FIELD_ORDERS: ReadonlyArray<FieldOrderDefinition> = freezeDefinitions([
  defineFieldOrder({ name: FieldOrderMode.Appearance, compare: () => 0 }),
  defineFieldOrder({ name: FieldOrderMode.Ascending, compare: compareAscending }),
  defineFieldOrder({
    name: FieldOrderMode.Descending,
    compare: (a, b, context) =>
      -compareAscending(a, b, context) || context.values.indexOf(b) - context.values.indexOf(a),
  }),
  defineFieldOrder({ name: FieldOrderMode.NaturalAscending, compare: compareNatural }),
  defineFieldOrder({ name: FieldOrderMode.NaturalDescending, compare: (a, b) => -compareNatural(a, b) }),
]);

/** 合并请求内的分类顺序定义，禁止重复和覆盖内置名称 */
export const resolveFieldOrderRegistry = (
  definitions: ReadonlyArray<FieldOrderDefinition> = [],
): ReadonlyMap<string, FieldOrderDefinition> => {
  const registry = new Map(BUILTIN_FIELD_ORDERS.map(definition => [definition.name, definition]));
  for (const definition of definitions) {
    if (definition.name.trim().length === 0) throw new RetikzDataError('data: field order name must not be blank');
    if (registry.has(definition.name))
      throw new RetikzDataError(`data: duplicate field order registration "${definition.name}"`);
    registry.set(definition.name, definition);
  }
  return createReadonlyMap(registry);
};
