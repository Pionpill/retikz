import path from 'node:path';

import { writeFoundationApiReferenceMdx } from './api-reference/foundation';
import { writeMathApiReferenceMdx } from './api-reference/math';
import { writeTexApiReferenceMdx } from './api-reference/tex';

const docsRoot = path.resolve(import.meta.dirname, '..');

await writeTexApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/tex/api-reference/_includes'),
);
await writeFoundationApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/foundation/api-reference/_includes'),
);
await writeMathApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/math/api-reference/_includes'),
);
