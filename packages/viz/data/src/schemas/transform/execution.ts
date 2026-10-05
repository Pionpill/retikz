import { NonBlankStringSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { TransformSchema } from './schema';

/** 稀疏执行配置；继承完成后才应用 builtin 默认值 */
export const DataExecutionSchema = strictObject({
  mode: zodEnum(['builtin', 'external', 'hybrid']).optional().describe('Stage execution policy after inheritance'),
  external: NonBlankStringSchema.optional().describe('Named runtime external provider'),
}).describe('Sparse data execution configuration');

/** 数据操作与运行策略的独立声明包装 */
export const DataTransformDeclarationSchema = strictObject({
  operation: TransformSchema.describe('Data operation independent of execution policy'),
  dataExecution: DataExecutionSchema.optional().describe('Execution overrides for this declaration'),
}).describe('Data transform declaration with optional execution policy');

export type IRDataExecution = ZodInfer<typeof DataExecutionSchema>;

export type IRDataTransformDeclaration = ZodInfer<typeof DataTransformDeclarationSchema>;
