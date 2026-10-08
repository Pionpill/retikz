import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type {
  CodeBlockPropsSchema,
  CodeLogicSchema,
  CodeMethodSchema,
  CodeParameterSchema,
  CodePropertySchema,
  CodeSignatureSchema,
} from './schema';

export type IRCodeBlockProps = Omit<ZodInfer<typeof CodeBlockPropsSchema>, 'position'> &
  Pick<ZodInput<typeof CodeBlockPropsSchema>, 'position'>;

export type IRCodeParameter = ZodInfer<typeof CodeParameterSchema>;

export type IRCodeSignature = ZodInfer<typeof CodeSignatureSchema>;

export type IRCodeProperty = ZodInfer<typeof CodePropertySchema>;

export type IRCodeLogic = ZodInfer<typeof CodeLogicSchema>;

export type IRCodeMethod = ZodInfer<typeof CodeMethodSchema>;

/** 代码实体共享事实与开放 composite 标识；具体实体由独立 schema 派生 */
export type IRCodeBlock = IRCodeBlockProps & {
  /** 代码块组件定义的注册命名空间 */
  namespace: string;
  /** 代码块组件定义的注册类型 */
  type: string;
};
