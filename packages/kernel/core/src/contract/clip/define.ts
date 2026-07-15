import type { ClipDefinition, ClipDefinitionInput, ClipSpecLike } from './types';

/**
 * 定义 clip 注册项，并做最小 key 校验
 * @remarks 当前只集中封装泛型擦除边界；保留入口用于对齐 registry API，并为未来校验或归一化预留空间
 * @throws 当 kind 为空字符串时
 */
export const defineClip = <TSpec extends ClipSpecLike>(definition: ClipDefinitionInput<TSpec>): ClipDefinition => {
  if (definition.kind.trim().length === 0) {
    throw new Error('clip provider key must be a non-empty string.');
  }
  return definition as unknown as ClipDefinition;
};
