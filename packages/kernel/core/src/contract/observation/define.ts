import { assertNonEmptyString } from '@retikz/foundation';

import type { CompileObserverDefinition } from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 定义一次显式 observed compile observer */
export const defineCompileObserver = <TOutput>(
  definition: CompileObserverDefinition<TOutput>,
): CompileObserverDefinition<TOutput> => {
  if (typeof definition.key !== 'string')
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: key must be a non-empty string.');
  assertNonEmptyString(definition.key, 'defineCompileObserver: key');
  if (typeof definition.createSession !== 'function') {
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: createSession must be a function.');
  }
  return definition;
};
