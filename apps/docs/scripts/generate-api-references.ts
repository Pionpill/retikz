import path from 'node:path';

import { writeBlockApiReferenceMdx } from './api-reference/block';
import { writeBranchApiReferenceMdx } from './api-reference/branch';
import { writeContextualReferences } from './api-reference/contextual-reference';
import { writeDataModelApiReferenceMdx } from './api-reference/data-model';
import { writeDataProvenanceApiReferenceMdx } from './api-reference/data-provenance';
import { writeDataTransformApiReferenceMdx } from './api-reference/data-transform';
import { writeDrawApiReferenceMdx } from './api-reference/draw';
import { writeEntityApiReferenceMdx } from './api-reference/entity';
import { writeFlowApiReferenceMdx } from './api-reference/flow';
import { writeFoundationApiReferenceMdx } from './api-reference/foundation';
import { writeGroupApiReferenceMdx } from './api-reference/group';
import { writeInspectApiReferenceMdx } from './api-reference/inspect';
import { writeLayoutApiReferenceMdx } from './api-reference/layout';
import { writeLayoutComponentApiReferences } from './api-reference/layout-components';
import { writeManualReferences } from './api-reference/manual-reference';
import { writeMathApiReferenceMdx } from './api-reference/math';
import { writeNodeApiReferenceMdx } from './api-reference/node';
import { writeRelationApiReferenceMdx } from './api-reference/relation';
import { writeRibbonApiReferenceMdx } from './api-reference/ribbon';
import { writeRuntimeApiReferenceMdx } from './api-reference/runtime';
import { writeScopeApiReferenceMdx } from './api-reference/scope';
import { writeStandardCollectionApiReferences } from './api-reference/standard-collections';
import { writeStandardPresentationApiReferences } from './api-reference/standard-presentation';
import { writeStandardShapeApiReferences } from './api-reference/standard-shapes';
import { writeTexApiReferenceMdx } from './api-reference/tex';
import { writeAnimationApiReference, writeStyleApiReference } from './api-reference/visual';

const docsRoot = path.resolve(import.meta.dirname, '..');
await writeRuntimeApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/runtime/reference/_includes'),
);
await writeBranchApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/diagram/branch/reference/_includes'),
);
await writeStandardPresentationApiReferences(
  path.resolve(docsRoot, 'src/modules/docs/contents/library/standard/presentation'),
);
await writeGroupApiReferenceMdx(path.resolve(docsRoot, 'src/modules/docs/contents/schematic/graph/group/_includes'));
await writeBlockApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/graph/block/reference/_includes'),
);
await writeStandardCollectionApiReferences(
  path.resolve(docsRoot, 'src/modules/docs/contents/library/standard/collection'),
);
await writeEntityApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/graph/entity/reference/_includes'),
);
await writeStyleApiReference(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/visual/style/reference/_includes'),
);
await writeAnimationApiReference(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/visual/animation/reference/_includes'),
);
await writeStandardShapeApiReferences(path.resolve(docsRoot, 'src/modules/docs/contents/library/standard/shape'));

await writeDrawApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/path/reference/_includes'),
);

await writeNodeApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/node/reference/_includes'),
);

await writeInspectApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/inspect/reference/_includes'),
);

await writeTexApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/tex/reference/_includes'),
);
await writeFoundationApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/foundation/reference/_includes'),
);
await writeMathApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/packages/math/reference/_includes'),
);

await writeLayoutApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/layout/reference/_includes'),
);

await writeScopeApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/kernel/components/scope/reference/_includes'),
);

await writeLayoutComponentApiReferences(path.resolve(docsRoot, 'src/modules/docs/contents/library/layout'));
await writeRelationApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/graph/relation/reference/_includes'),
);
await writeRibbonApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/library/extension/ribbon/reference/_includes'),
);
await writeFlowApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/schematic/diagram/flow/reference/_includes'),
);

await writeDataModelApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/viz/data/model/reference/_includes'),
);

await writeDataTransformApiReferenceMdx(
  path.resolve(docsRoot, 'src/modules/docs/contents/viz/data/transform/reference/_includes'),
);

writeManualReferences(path.resolve(docsRoot, 'src/modules/docs/contents'));
await writeDataProvenanceApiReferenceMdx();
writeContextualReferences(path.resolve(docsRoot, 'src/modules/docs/contents'));
