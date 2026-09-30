import path from 'node:path';

import { writeRibbonApiReferenceMdx } from './api-reference/ribbon';

const docsRoot = path.resolve(import.meta.dirname, '..');
await writeRibbonApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/library/extension/ribbon/api-reference/_includes'),
);
