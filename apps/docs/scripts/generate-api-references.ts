import path from 'node:path';

import { writeDrawApiReferenceMdx } from './api-reference/draw';
import { writeEntityApiReferenceMdx } from './api-reference/entity';
import { writeExtensionAnimationApiReference } from './api-reference/extension-animation';
import { writeFoundationApiReferenceMdx } from './api-reference/foundation';
import { writeInspectApiReferenceMdx } from './api-reference/inspect';
import { writeLayoutApiReferenceMdx } from './api-reference/layout';
import { writeMathApiReferenceMdx } from './api-reference/math';
import { writeNodeApiReferenceMdx } from './api-reference/node';
import { writeScopeApiReferenceMdx } from './api-reference/scope';
import { writeStandardShapeApiReferences } from './api-reference/standard-shapes';
import { writeTexApiReferenceMdx } from './api-reference/tex';
import { writeAnimationApiReference, writeStyleApiReference } from './api-reference/visual';

const docsRoot = path.resolve(import.meta.dirname, '..');
await writeEntityApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/graph/entity/api-reference/_includes'),
);
await writeExtensionAnimationApiReference(
  path.resolve(docsRoot, 'src/modules/docs/contents/library/extension/animation/api-reference/_includes'),
);
await writeStyleApiReference(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/visual/style/api-reference/_includes'),
);
await writeAnimationApiReference(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/visual/animation/api-reference/_includes'),
);
await writeStandardShapeApiReferences(path.resolve(docsRoot, 'src/modules/docs/contents/library/standard'));

await writeDrawApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/path/api-reference/_includes'),
);

await writeNodeApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/node/api-reference/_includes'),
);

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
