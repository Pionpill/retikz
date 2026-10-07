import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { compileQueue } from './pipeline';
import { QueueSchema } from './schema';
import type { IRQueue } from './schema';

/** Queue 的布局感知编译定义 */
export const QueueDefinition: LayoutCompositeDefinition<IRQueue, 'standard', 'queue'> = defineComposite({
  namespace: 'standard',
  type: 'queue',
  schema: QueueSchema,
  compile: compileQueue,
});

/** 保留作者稀疏字段与队首到队尾顺序 */
export const createQueue = (input: IRQueue): IRQueue => ({ ...input });

/** Queue 及单格裁切依赖 */
export const QueueProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'queue' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => QueueDefinition,
};
