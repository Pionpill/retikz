import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { compileMatrix } from './pipeline';
import { MatrixSchema } from './schema';
import type { IRMatrix } from './schema';

/** Standard Matrix 的布局感知 Definition */
export const matrixDefinition: CompositeDefinition<IRMatrix, 'standard', 'matrix'> = defineComposite({
  namespace: 'standard',
  type: 'matrix',
  schema: MatrixSchema,
  compile: compileMatrix,
});

/**
 * 保留稀疏 Source 的类型化工厂
 * @param input 完整的 Matrix Source，包含 namespace、type 及 items、data 或 skeleton
 * @returns 输入的浅拷贝；不校验、不补默认值，嵌套对象与输入共享引用
 */
export const createMatrix = (input: IRMatrix): IRMatrix => ({ ...input });

/** Matrix 与单元格 lower target 的按需依赖声明 */
export const matrixProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'matrix' },
  dependencies: [pathClipProvider.key],
  makeDefinition: () => matrixDefinition,
};
