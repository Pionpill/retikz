import { describe, expect, it } from 'vitest';

import type { CompileObserverDefinition } from '../../../src';
import * as core from '../../../src';

type ObserverFactory = (definition: CompileObserverDefinition) => CompileObserverDefinition;

const defineObserver = (definition: CompileObserverDefinition): CompileObserverDefinition => {
  const factory = Reflect.get(core, 'defineCompileObserver') as ObserverFactory | undefined;

  expect(factory).toBeTypeOf('function');

  if (factory === undefined) throw new Error('defineCompileObserver is not available');

  return factory(definition);
};

describe('Core 观测定义契约', () => {
  it('接受稳定键并创建隔离会话', () => {
    let completed = 0;
    const definition = defineObserver({
      key: 'test/observer',
      createSession: () => ({
        select: () => false,
        observe: () => undefined,
        complete: () => {
          completed += 1;
          return { count: 0 };
        },
      }),
    });

    expect(definition.key).toBe('test/observer');
    expect(definition.createSession()).not.toBe(definition.createSession());
    expect(completed).toBe(0);
  });

  it('不将所属模块输出 schema 转换为 Inspector 契约', () => {
    expect('Inspector' in core).toBe(false);
  });
});
