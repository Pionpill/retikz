import type { IRJsonObject } from '../../schemas';
import type { PathKindDefinition } from './types';

/**
 * 定义 path kind 注册项，并校验 schema literal key。
 * @remarks 保留入口用于对齐 registry API，并集中处理定义点泛型。
 * @throws 当 schema.shape.kind 不是非空 literal 字符串时。
 */
export const definePathKind = <TOptions = IRJsonObject>(
  definition: PathKindDefinition<TOptions>,
): PathKindDefinition<TOptions> & PathKindDefinition => {
  const kind = definition.schema.shape.kind.value;
  if (typeof kind !== 'string' || kind.trim().length === 0) {
    throw new Error('definePathKind: schema.shape.kind must be a non-empty z.literal string.');
  }
  return definition as PathKindDefinition<TOptions> & PathKindDefinition;
};
