import type { infer as ZodInfer } from 'zod';

import type {
  CodeBlockPropsSchema,
  CodeLogicSchema,
  CodeMethodSchema,
  CodeParameterSchema,
  CodePropertySchema,
  CodeSignatureSchema,
} from './schema';

export type IRCodeBlockProps = ZodInfer<typeof CodeBlockPropsSchema>;
export type IRCodeParameter = ZodInfer<typeof CodeParameterSchema>;
export type IRCodeSignature = ZodInfer<typeof CodeSignatureSchema>;
export type IRCodeProperty = ZodInfer<typeof CodePropertySchema>;
export type IRCodeLogic = ZodInfer<typeof CodeLogicSchema>;
export type IRCodeMethod = ZodInfer<typeof CodeMethodSchema>;

/** 代码实体共享事实与开放 composite 标识；具体实体由独立 schema 派生 */
export type IRCodeBlock = IRCodeBlockProps & { namespace: string; type: string };
