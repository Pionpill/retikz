import { describe, expect, it } from 'vitest';

import {
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  mergeInspectorRegistries,
  PATH_INSPECTOR_KEY,
} from '../../src';
import { getResolvedInspectorRegistry } from '../../src/providers';

const resolveRegistry = (registry: ReturnType<typeof createInspectorRegistry>) =>
  getResolvedInspectorRegistry(registry);

const definition = (namespace: string, type: string) =>
  defineInspector({
    namespace,
    type,
    owner: { kind: 'path' as const, name: 'stroke' },
    inspect: () => [],
  });

describe('Inspector 注册表', () => {
  it('完成两个编写入口点处省略的选项字段', () => {
    const rawDefinition = {
      namespace: 'test',
      type: 'empty-options',
      owner: { kind: 'path' as const, name: 'stroke' },
      inspect: () => [],
    };
    defineInspector(rawDefinition);
    const registered = resolveRegistry(createInspectorRegistry([rawDefinition])).require(rawDefinition);

    for (const candidate of [registered]) {
      expect(candidate.optionsSchema.parse({})).toEqual({});
      expect(() => candidate.optionsSchema.parse({ unexpected: true })).toThrow();
      expect(Object.isFrozen(candidate)).toBe(true);
      expect(resolveRegistry(createInspectorRegistry([candidate])).require(candidate)).toBe(candidate);
    }
  });

  it('当省略选项 schema 时保留自定义解析器', () => {
    const resolveOptions = () => ({ label: 'marker' });
    const input = defineInspector({
      namespace: 'test',
      type: 'resolved-empty',
      owner: { kind: 'path', name: 'stroke' },
      resolveOptions,
      inspect: (_subject, context) => ({ type: 'node', position: [0, 0], content: context.options.label }),
    });
    const inspector = resolveRegistry(createInspectorRegistry([input])).require(input);

    expect(inspector.optionsSchema.parse({})).toEqual({});
    expect(inspector.resolveOptions).toBe(resolveOptions);
  });

  it('跨注册表重用经过验证的定义', () => {
    const input = definition('test', 'reused');
    const inspector = resolveRegistry(createInspectorRegistry([input])).require(input);

    expect(resolveRegistry(createInspectorRegistry([input])).require(input)).toBe(inspector);
    expect(resolveRegistry(createInspectorRegistry([input])).require(input)).toBe(inspector);
  });

  it('验证并快照直接提供的定义', () => {
    const rawDefinition = { ...definition('test', 'raw'), owner: { kind: 'path' as const, name: 'stroke' } };
    const registered = resolveRegistry(createInspectorRegistry([rawDefinition])).require(rawDefinition);
    rawDefinition.owner.name = 'changed';

    expect(registered.owner).toEqual({ kind: 'path', name: 'stroke' });
    expect(Object.isFrozen(registered)).toBe(true);
    expect(Object.isFrozen(registered.owner)).toBe(true);
    expect(resolveRegistry(createInspectorRegistry([registered])).require(registered)).toBe(registered);
  });

  it('允许一个所属模块使用多个键并解析每个键', () => {
    const registry = createInspectorRegistry([definition('third-party', 'points'), definition('third-party', 'curve')]);
    const resolvedRegistry = resolveRegistry(registry);

    expect(resolvedRegistry.definitions).toHaveLength(2);
    expect(resolvedRegistry.get({ namespace: 'third-party', type: 'points' })?.type).toBe('points');
    expect(Object.isFrozen(resolvedRegistry.definitions)).toBe(true);
  });

  it('在完整的命名空间和类型重复上失败', () => {
    expect(() => createInspectorRegistry([definition('same', 'key'), definition('same', 'key')])).toThrow(/duplicate/i);
  });

  it('按输入顺序合并不透明注册表并保留重复键检查', () => {
    const first = createInspectorRegistry([definition('first', 'points')]);
    const second = createInspectorRegistry([definition('second', 'curve')]);
    const merged = getResolvedInspectorRegistry(mergeInspectorRegistries(first, second));

    expect(merged.definitions.map(registeredDefinition => registeredDefinition.namespace)).toEqual(['first', 'second']);
    expect(() => mergeInspectorRegistries(first, createInspectorRegistry([definition('first', 'points')]))).toThrow(
      /duplicate/i,
    );
  });

  it('当命名空间或类型包含 NUL 字符时，保持不同的键分开', () => {
    const first = definition('a\u0000b', 'c');
    const second = definition('a', 'b\u0000c');

    const registry = createInspectorRegistry([first, second]);

    expect(resolveRegistry(registry).get({ namespace: first.namespace, type: first.type })).toMatchObject({
      namespace: first.namespace,
      type: first.type,
    });
    expect(resolveRegistry(registry).get({ namespace: second.namespace, type: second.type })).toMatchObject({
      namespace: second.namespace,
      type: second.type,
    });
  });

  it('通过相同的默认路径注册内置描边', () => {
    const registry = createDefaultInspectorRegistry([definition('third-party', 'points')]);

    expect(resolveRegistry(registry).get(PATH_INSPECTOR_KEY)).toBeDefined();
    expect(resolveRegistry(registry).get({ namespace: 'third-party', type: 'points' })).toBeDefined();
  });
});
