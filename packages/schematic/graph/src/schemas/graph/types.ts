import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { GraphSchema } from './schema';

/** 可 JSON 序列化的图根输入 */
export type IRGraph = Omit<ZodInfer<typeof GraphSchema>, 'position'> & Pick<ZodInput<typeof GraphSchema>, 'position'>;
