import path from 'node:path';

import { writeFoundationApiReferenceMdx } from './api-reference/foundation';
import { writeInspectApiReferenceMdx } from './api-reference/inspect';
import { writeLayoutApiReferenceMdx } from './api-reference/layout';
import { writeMathApiReferenceMdx } from './api-reference/math';
import { writeScopeApiReferenceMdx } from './api-reference/scope';
import { writeTexApiReferenceMdx } from './api-reference/tex';

const docsRoot = path.resolve(import.meta.dirname, '..');

await writeInspectApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/inspect/api-reference/_includes'),
);

await writeTexApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/tex/api-reference/_includes'),
);
await writeFoundationApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/foundation/api-reference/_includes'),
);
await writeMathApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/math/api-reference/_includes'),
);

await writeLayoutApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/layout/api-reference/_includes'),
);

await writeScopeApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/scope/api-reference/_includes'),
);
