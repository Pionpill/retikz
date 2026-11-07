import { describe, expect, it } from 'vitest';

import { createInspectorRegistry, defineInspector, mergeInspectorRegistries } from '../../src';
import { getResolvedInspectorRegistry } from '../../src/providers';

const definition = (namespace: string, type: string) =>
  defineInspector({ namespace, type, subject: { kind: 'primitive', type: 'path' }, inspect: () => [] });
describe('检查器注册', () => {
  it('拒绝空白注册键与空白领域 subject 键', () => {
    expect(() => createInspectorRegistry([definition(' ', 'path')])).toThrow();
    expect(() => createInspectorRegistry([definition('test', '')])).toThrow();
    expect(() =>
      createInspectorRegistry([
        defineInspector({
          namespace: 'test',
          type: 'artifact',
          subject: { kind: 'artifact', namespace: ' ', type: 'box' },
          inspect: () => [],
        }),
      ]),
    ).toThrow();
  });
  it('省略选项时仅接受空对象，定义与 subject 隔离冻结', () => {
    const input = definition('test', 'path');
    const stored = getResolvedInspectorRegistry(createInspectorRegistry([input])).require(input);
    expect(stored.optionsSchema.parse({})).toEqual({});
    expect(() => stored.optionsSchema.parse({ unknown: true })).toThrow();
    expect(Object.isFrozen(stored.subject)).toBe(true);
  });
  it('相同 subject 可以注册多个 key，重复完整 key 拒绝', () => {
    const first = createInspectorRegistry([definition('a', 'points')]);
    const second = createInspectorRegistry([definition('a', 'vertices')]);
    expect(getResolvedInspectorRegistry(mergeInspectorRegistries(first, second)).definitions).toHaveLength(2);
    expect(() => mergeInspectorRegistries(first, first)).toThrow(/Duplicate/);
  });
  it('含分隔符的 namespace 与 type 不混淆', () => {
    const first = definition('a\u0000b', 'c'),
      second = definition('a', 'b\u0000c');
    expect(getResolvedInspectorRegistry(createInspectorRegistry([first, second])).definitions).toHaveLength(2);
  });
});
