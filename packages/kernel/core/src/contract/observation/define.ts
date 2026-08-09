import { assertNonEmptyString } from '@retikz/foundation';

import type { CompileObserverDefinition } from './types';

/** 定义一次显式 observed compile observer */
export const defineCompileObserver = <TOutput>(
  definition: CompileObserverDefinition<TOutput>,
): CompileObserverDefinition<TOutput> => {
  if (typeof definition.key !== 'string') throw new Error('defineCompileObserver: key must be a non-empty string.');
  assertNonEmptyString(definition.key, 'defineCompileObserver: key');
  if (typeof definition.createSession !== 'function') {
    throw new Error('defineCompileObserver: createSession must be a function.');
  }
  return definition;
};
