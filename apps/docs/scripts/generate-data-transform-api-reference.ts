import path from 'node:path';

import { writeDataTransformApiReferenceMdx } from './api-reference/data-transform';

await writeDataTransformApiReferenceMdx(
  path.resolve(import.meta.dirname, '../src/modules/docs/contents/viz/data/transform/api-reference/_includes'),
);
