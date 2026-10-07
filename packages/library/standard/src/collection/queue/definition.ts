import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition } from '@retikz/core';

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
