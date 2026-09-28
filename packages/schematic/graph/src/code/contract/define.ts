import type { IRCodeBlock } from '../schemas';
import type { CodeBlockDefinition } from './types';

/**
 * 定义共享主题与 Block 根语义的代码实体
 * @template TSource 严格 schema 校验的领域 Source，包含公共外框和稳定判别字段
 * @param definition 领域 schema 与内容组合回调
 * @returns 冻结后的同一个 Definition 对象；注册由 createCodeBlockContribution 完成
 */
export const defineCodeBlock = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
): CodeBlockDefinition<TSource> => Object.freeze(definition);
