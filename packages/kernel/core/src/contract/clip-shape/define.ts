import { assertNonEmptyString } from '@retikz/foundation';

import type { ClipShape, ClipShapeDefinition, ClipShapeDefinitionInput } from './types';

/**
 * 定义 ClipShape 注册项并校验 registry key
 * @remarks typed identity 保留为稳定的作者入口
 */
export const defineClipShape = <TShape extends ClipShape>(
  definition: ClipShapeDefinitionInput<TShape>,
): ClipShapeDefinition<TShape> => {
  assertNonEmptyString(definition.kind, 'clip shape provider key');
  return definition;
};
