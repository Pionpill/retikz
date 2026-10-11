import path from 'node:path';

import { writeNodeApiReferenceMdx } from './api-reference/node';
import { writeNodeSchemaReferenceMdx } from './schema-reference/node';

const output = path.resolve(
  import.meta.dirname,
  '../src/modules/docs/contents/kernel/components/node/reference/_includes',
);
writeNodeSchemaReferenceMdx(output);
await writeNodeApiReferenceMdx(output);
