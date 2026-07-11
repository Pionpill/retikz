import { describe, expect, it } from 'vitest';

import {
  BUILTIN_FIELD_FORMATS,
  BUILTIN_FORMAT_DEFINITIONS_BY_NAME,
  BUILTIN_FORMATS,
  BUILTIN_ROW_SELECTORS,
  BUILTIN_STATISTICS_REDUCERS,
  BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND,
  BUILTIN_TRANSFORMS,
  DEFAULT_TRANSFORM_CONTEXT,
  resolveFormatRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
} from '../../src';

/** 断言公开 definition 列表及其元素在运行时只读，并验证被拒绝的写入不改变默认 registry。 */
const expectFrozenDefinitionList = (definitions: ReadonlyArray<object>, resolveFirst: () => unknown): void => {
  const original = definitions[0];
  const replacement = definitions[1] ?? original;
  const changed = Reflect.set(definitions, 0, replacement);

  try {
    expect(Object.isFrozen(definitions)).toBe(true);
    expect(Object.isFrozen(original)).toBe(true);
    expect(changed).toBe(false);
    expect(resolveFirst()).toBe(original);
  } finally {
    if (changed) Reflect.set(definitions, 0, original);
  }
};

/** 断言公开 Map 视图不暴露写方法，且 forEach 不泄漏底层可写 Map。 */
const expectReadonlyMapView = <TValue>(registry: ReadonlyMap<string, TValue>): void => {
  let callbackOwner: ReadonlyMap<string, TValue> | undefined;
  registry.forEach((_definition, _key, owner) => {
    callbackOwner = owner;
  });

  expect(Object.isFrozen(registry)).toBe(true);
  expect(Reflect.get(registry, 'set')).toBeUndefined();
  expect(Reflect.get(registry, 'delete')).toBeUndefined();
  expect(Reflect.get(registry, 'clear')).toBeUndefined();
  expect(callbackOwner).toBe(registry);
  expect(Reflect.get(callbackOwner as object, 'set')).toBeUndefined();
  expect(Array.from(registry)).toHaveLength(registry.size);
};

describe('data public default state', () => {
  it('keeps the default transform context immutable at runtime', () => {
    const original = DEFAULT_TRANSFORM_CONTEXT.readSourceIndex;
    const changed = Reflect.set(DEFAULT_TRANSFORM_CONTEXT, 'readSourceIndex', () => -1);

    try {
      expect(Object.isFrozen(DEFAULT_TRANSFORM_CONTEXT)).toBe(true);
      expect(changed).toBe(false);
      expect(DEFAULT_TRANSFORM_CONTEXT.readSourceIndex).toBe(original);
    } finally {
      if (changed) Reflect.set(DEFAULT_TRANSFORM_CONTEXT, 'readSourceIndex', original);
    }
  });

  it('keeps public builtin definition lists isolated from default registries', () => {
    expectFrozenDefinitionList(BUILTIN_TRANSFORMS, () => resolveTransformRegistry().get('sort'));
    expectFrozenDefinitionList(BUILTIN_FORMATS, () => resolveFormatRegistry().get('iso'));
    expectFrozenDefinitionList(BUILTIN_STATISTICS_REDUCERS, () => resolveStatisticsReducerRegistry().get('count'));
    expectFrozenDefinitionList(BUILTIN_ROW_SELECTORS, () => resolveRowSelectorRegistry().get('min'));
  });

  it('does not expose Map mutators or a writable forEach owner', () => {
    expectReadonlyMapView(BUILTIN_TRANSFORM_DEFINITIONS_BY_KIND);
    expectReadonlyMapView(BUILTIN_FORMAT_DEFINITIONS_BY_NAME);
  });

  it('does not expose Set mutators or a writable forEach owner', () => {
    let callbackOwner: ReadonlySet<string> | undefined;
    BUILTIN_FIELD_FORMATS.forEach((_value, _key, owner) => {
      callbackOwner = owner;
    });

    expect(Object.isFrozen(BUILTIN_FIELD_FORMATS)).toBe(true);
    expect(Reflect.get(BUILTIN_FIELD_FORMATS, 'add')).toBeUndefined();
    expect(Reflect.get(BUILTIN_FIELD_FORMATS, 'delete')).toBeUndefined();
    expect(Reflect.get(BUILTIN_FIELD_FORMATS, 'clear')).toBeUndefined();
    expect(callbackOwner).toBe(BUILTIN_FIELD_FORMATS);
    expect(Reflect.get(callbackOwner as object, 'add')).toBeUndefined();
    expect(Array.from(BUILTIN_FIELD_FORMATS)).toHaveLength(BUILTIN_FIELD_FORMATS.size);
  });
});
