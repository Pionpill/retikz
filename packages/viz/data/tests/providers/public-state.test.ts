import { describe, expect, it } from 'vitest';

import {
  BUILTIN_FORMATS,
  BUILTIN_ROW_SELECTORS,
  BUILTIN_STATISTICS_REDUCERS,
  BUILTIN_TRANSFORMS,
  DEFAULT_TRANSFORM_CONTEXT,
  resolveFormatRegistry,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
} from '../../src';

/** 断言公开 definition 列表及其元素在运行时只读，并验证被拒绝的写入不改变默认 registry */
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
});
