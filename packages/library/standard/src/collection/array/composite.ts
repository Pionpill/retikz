import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { compileArray } from './pipeline';
import { ArraySchema } from './schema';
import type { IRArray } from './schema';

/** Standard Array 的布局感知 Definition */
export const arrayDefinition: CompositeDefinition<IRArray, 'standard', 'array'> = defineComposite({
  namespace: 'standard',
  type: 'array',
  schema: ArraySchema,
  compile: compileArray,
});

/**
 * 保留稀疏 Source 的类型化工厂
 * @param input 完整的 Array Source，包含 namespace、type 及 items、data 或 skeleton
 * @returns 输入的浅拷贝；不校验、不补默认值，嵌套对象与输入共享引用
 */
export const createArray = (input: IRArray): IRArray => ({ ...input });

/** Array 与单元格 lower target 的按需依赖声明 */
export const arrayProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'array' },
  dependencies: [pathClipProvider.key],
  makeDefinition: () => arrayDefinition,
};
