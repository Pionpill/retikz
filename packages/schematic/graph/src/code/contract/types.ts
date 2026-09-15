import type { IRChild, ResolvedTheme } from '@retikz/core';
import type { ZodType } from 'zod';

import type { CodeBlockTokens } from '../../contract/theme';
import type { IRCodeBlock } from '../schemas';

/** 代码实体内容组合时已经生效的主题 */
export type CodeBlockComposeContext = Readonly<{
  /** 当前 Core Scope 的有效主题 */
  theme: ResolvedTheme;
  /** 当前 Graph style 的有限视觉 token */
  codeBlockTokens: CodeBlockTokens;
}>;

/** 用独立 Source 描述一个封装代码实体，内容下沉为唯一 Graph Block */
export type CodeBlockDefinition<TSource extends IRCodeBlock> = Readonly<{
  /** 自定义实体的公开命名空间 */
  namespace: TSource['namespace'];
  /** 命名空间内的实体判别值 */
  type: TSource['type'];
  /** 组合完整公共 Block surface 的严格 Source schema */
  schema: ZodType<TSource>;
  /** 生成 Header 与内容区，不生成根 Block 或第二份实体 identity */
  compose: (source: TSource, context: CodeBlockComposeContext) => ReadonlyArray<IRChild>;
}>;
