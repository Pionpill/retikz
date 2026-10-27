import {
  BUILTIN_ARROWS,
  BUILTIN_BOUNDARIES,
  BUILTIN_CLIPS,
  BUILTIN_PATHS,
  BUILTIN_PATTERNS,
  BUILTIN_SHAPES,
  resolveArrowRegistry,
  resolveBoundaryRegistry,
  resolveClipRegistry,
  resolveCompositeRegistry,
  resolvePathRegistry,
  resolvePatternRegistry,
  resolveShapeRegistry,
  resolveThemeRegistry,
} from '@retikz/core';
import type { AnyCompositeDefinition, ThemeDefinition } from '@retikz/core';
import { expect } from 'vitest';
import { strictObject, string } from 'zod';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { resolveMarkRegistry } from '../../src/providers/mark';
import { createProviderRegistry, providerDefinitionOf } from '../../src/providers/registry';

/** 表规模表示一次编译初始化所注册的 definition 数；128 项为探索规模，不是业务预算 */
const registerRegistry = <T>(
  name: string,
  builtins: ReadonlyMap<string, T>,
  resolve: (custom?: ReadonlyArray<T>) => ReadonlyMap<string, T>,
  customDefinition: (index: number) => T,
  keyOf: (definition: T) => string,
) => {
  for (const count of [8])
    defineBenchmark(
      { id: `providers/registry/${name}/${count}`, dimensions: ['Registry resolve', name, `${count}自定义项`] },
      () => {
        const custom = Array.from({ length: count }, (_, index) => customDefinition(index));
        return {
          run: () => resolve(custom),
          verify: result => {
            expect(result.size).toBe(builtins.size + count);
            for (const [key, definition] of builtins) expect(result.get(key)).toBe(definition);
            for (const definition of custom) expect(result.get(keyOf(definition))).toBe(definition);
            expect(result).not.toBe(builtins);
          },
        };
      },
    );
};
registerRegistry(
  'shape',
  BUILTIN_SHAPES,
  resolveShapeRegistry,
  index => ({ ...BUILTIN_SHAPES.get('rectangle')!, name: `custom-${index}` }),
  definition => definition.name,
);
registerRegistry(
  'boundary',
  BUILTIN_BOUNDARIES,
  resolveBoundaryRegistry,
  index => ({ ...BUILTIN_BOUNDARIES.get('rectangle')!, name: `custom-${index}` }),
  definition => definition.name,
);
registerRegistry(
  'arrow',
  BUILTIN_ARROWS,
  resolveArrowRegistry,
  index => ({ ...BUILTIN_ARROWS.values().next().value!, name: `custom-${index}` }),
  definition => definition.name,
);
registerRegistry(
  'clip',
  BUILTIN_CLIPS,
  resolveClipRegistry,
  index => ({ ...BUILTIN_CLIPS.get('rect')!, kind: `custom-${index}` }),
  definition => definition.kind,
);
registerRegistry(
  'path',
  BUILTIN_PATHS,
  resolvePathRegistry,
  index => ({ ...BUILTIN_PATHS.values().next().value!, name: `custom-${index}` }),
  definition => definition.name,
);
registerRegistry(
  'pattern',
  BUILTIN_PATTERNS,
  resolvePatternRegistry,
  index => ({ ...BUILTIN_PATTERNS.values().next().value!, name: `custom-${index}` }),
  definition => definition.name,
);
registerRegistry<ThemeDefinition>(
  'theme',
  new Map(),
  resolveThemeRegistry,
  index => ({ name: `custom-${index}`, resolve: () => ({}) }),
  definition => definition.name,
);
const compositeSchema = strictObject({ namespace: string(), type: string() });
defineBenchmark(
  { id: 'providers/registry/composite/8', dimensions: ['Registry resolve', 'composite', '8自定义项'] },
  () => {
    const custom: Array<AnyCompositeDefinition> = Array.from({ length: 8 }, (_, index) => ({
      namespace: `namespace-${index % 2}`,
      type: `custom-${Math.floor(index / 2)}`,
      schema: compositeSchema,
      compile: () => ({ children: [] }),
    }));
    return {
      run: () => resolveCompositeRegistry(custom),
      verify: result => {
        expect(result.size).toBe(2);
        for (const definitionsByType of result.values()) expect(definitionsByType.size).toBe(4);
        for (const definition of custom)
          expect(result.get(definition.namespace)?.get(definition.type)).toBe(definition);
      },
    };
  },
);

for (const count of [8])
  defineBenchmark(
    { id: `providers/registry/mark/${count}`, dimensions: ['Registry resolve', 'mark 含箭头投影', `${count}自定义项`] },
    () => {
      const custom = Array.from({ length: count }, (_, index) => ({ name: `custom-${index}`, emit: () => [] }));
      return {
        run: () => resolveMarkRegistry(custom, BUILTIN_ARROWS),
        verify: result => {
          expect(result.size).toBe(4 + BUILTIN_ARROWS.size + count);
          for (const [name, arrow] of BUILTIN_ARROWS) {
            expect(result.get(name)?.emit).toBe(arrow.emit);
            expect(result.get(name)?.anchor).toEqual([arrow.tipX ?? arrow.baseSize ?? 10, (arrow.baseSize ?? 10) / 2]);
            expect(result.get(name)).not.toHaveProperty('lineContactX');
          }
          for (const definition of custom) expect(result.get(definition.name)).toBe(definition);
        },
      };
    },
  );

for (const count of [8, 128]) {
  const custom = Array.from({ length: count }, (_, index) => ({ name: `provider-${index}` }));
  const options = { capability: 'benchmark', custom, keyOf: (definition: { name: string }) => definition.name };
  const registry = new Map(custom.map(definition => [definition.name, definition]));
  defineBenchmark(
    { id: `providers/registry/create/${count}`, dimensions: ['Registry create', '无内置项', `${count}项`] },
    () => ({
      run: () => createProviderRegistry(options),
      verify: result => expect([...result]).toEqual([...registry]),
    }),
  );
  defineBenchmark(
    { id: `providers/registry/lookup/${count}`, dimensions: ['Registry lookup', '命中', `${count}项`] },
    () => ({
      run: () => providerDefinitionOf(registry, custom[count - 1].name),
      verify: result => expect(result).toBe(custom[count - 1]),
    }),
  );
}
