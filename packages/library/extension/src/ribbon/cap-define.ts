import type { JsonObject } from '@retikz/foundation';
import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../errors';
import type { RibbonCapDefinition } from './cap-types';

/** 定义端帽，集中处理参数泛型擦除边界 */
export const defineRibbonCap = <TParams extends JsonObject>(
  definition: RibbonCapDefinition<TParams>,
): RibbonCapDefinition => {
  assertNonEmptyString(
    definition.name,
    'Ribbon cap name',
    new RetikzExtensionError({
      code: RetikzExtensionErrorCode.AuthoringInvalid,
      message: 'Ribbon cap name must be a non-empty string.',
      details: { name: definition.name },
    }),
  );
  return definition as unknown as RibbonCapDefinition;
};
