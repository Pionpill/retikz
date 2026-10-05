import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CompileObserverDefinition } from './types';

/**
 * 定义一次显式 observed compile observer
 * @template TOutput 观察会话完成时产生的结果类型
 */
export const defineCompileObserver = <TOutput>(
  definition: CompileObserverDefinition<TOutput>,
): CompileObserverDefinition<TOutput> => {
  if (typeof definition.key !== 'string')
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: key must be a non-empty string.');

  assertNonEmptyString(
    definition.key,
    'defineCompileObserver: key',
    new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: key must be a non-empty string.'),
  );
  if (typeof definition.createSession !== 'function') {
    throw new RetikzCoreError(RetikzCoreErrorCode.Contract, 'defineCompileObserver: createSession must be a function.');
  }

  return definition;
};
