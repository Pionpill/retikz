import path from 'node:path';

import { writeLayoutComponentApiReferences } from './api-reference/layout-components';

await writeLayoutComponentApiReferences(
  path.resolve(import.meta.dirname, '../src/modules/docs/contents/library/layout'),
);
