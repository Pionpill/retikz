import path from 'node:path';

import { writeTexApiReferenceMdx } from './api-reference/tex';

const docsRoot = path.resolve(import.meta.dirname, '..');

await writeTexApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/tex/api-reference/_includes'),
);
