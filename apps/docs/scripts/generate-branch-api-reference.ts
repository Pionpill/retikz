import path from 'node:path';

import { writeBranchApiReferenceMdx } from './api-reference/branch';

await writeBranchApiReferenceMdx(
  path.resolve(import.meta.dirname, '../src/modules/docs/contents/schematic/diagram/branch/api-reference/_includes'),
);
