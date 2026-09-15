import type { IRCodeBlock } from '../schemas';
import type { CodeBlockDefinition } from './types';

/** 定义共享主题与 Block 根语义的代码实体 */
export const defineCodeBlock = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
): CodeBlockDefinition<TSource> => Object.freeze(definition);
