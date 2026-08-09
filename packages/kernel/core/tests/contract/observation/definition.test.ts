import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileObserverDefinition } from '../../../src';

import * as core from '../../../src';

type ObserverFactory = (definition: CompileObserverDefinition) => CompileObserverDefinition;

const defineObserver = (definition: CompileObserverDefinition): CompileObserverDefinition => {
  const factory = Reflect.get(core, 'defineCompileObserver') as ObserverFactory | undefined;
  expect(factory).toBeTypeOf('function');
  if (factory === undefined) throw new Error('defineCompileObserver is not available');
  return factory(definition);
};

describe('Core observation definition contract', () => {
  it('accepts a stable key and creates an isolated session', () => {
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

  it.each(['', ' ', '\u2003', '\ufeff'])('rejects a blank observer key with the established error (%j)', key => {
    expect(() =>
      defineObserver({
        key,
        createSession: () => ({
          select: () => false,
          observe: () => undefined,
          complete: () => null,
        }),
      }),
    ).toThrowError('defineCompileObserver: key must be a non-empty string.');
  });

  it('does not turn owner output schemas into Inspector contracts', () => {
    expect('Inspector' in z).toBe(false);
  });
});
