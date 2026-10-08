import path from 'node:path';

import { writeRuntimeApiReferenceMdx } from './api-reference/runtime';

await writeRuntimeApiReferenceMdx(
  path.resolve(import.meta.dirname, '../src/modules/docs/contents/kernel/packages/runtime/api-reference/_includes'),
);
