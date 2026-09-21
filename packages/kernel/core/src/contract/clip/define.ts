import { assertNonEmptyString } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type {
  ClipDefinition,
  ClipDefinitionIdentityInput,
  ClipDefinitionResolvedInput,
  ClipLike,
  ClipShape,
  DefineClip,
} from './types';

/**
 * 定义 clip 注册项，并做最小 key 校验
 * @remarks 当前只集中封装泛型擦除边界；保留入口用于对齐 registry API，并为未来校验或归一化预留空间
 * @throws 当 kind 为空字符串时
 */
const defineClipImplementation = (
  definition: ClipDefinitionResolvedInput<ClipLike, ClipShape> | ClipDefinitionIdentityInput<ClipShape>,
): ClipDefinition => {
  assertNonEmptyString(
    definition.kind,
    'clip provider key',
    new RetikzCoreError(RetikzCoreErrorCode.Contract, 'clip provider key must be a non-empty string.'),
  );
  if (definition.resolve === undefined) {
    return {
      ...definition,
      resolve: spec => spec,
      shapeSchema: definition.schema,
    };
  }
  return definition;
};

/** 定义 clip 注册项，并在 identity clip 中派生默认解析与 shapeSchema */
export const defineClip = defineClipImplementation as DefineClip;
