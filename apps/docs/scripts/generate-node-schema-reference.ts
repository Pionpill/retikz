import path from 'node:path';

import { writeNodeSchemaReferenceMdx } from './schema-reference/node';

writeNodeSchemaReferenceMdx(
  path.resolve(import.meta.dirname, '../src/modules/docs/contents/kernel/components/node/schema-reference'),
);
