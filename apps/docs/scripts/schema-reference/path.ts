import path from 'node:path';

import { readSchemaDescriptions } from './descriptions';

/** Path API 与 Schema 参考共用的中文字段说明 */
export const pathSchemaDescriptions = readSchemaDescriptions(
  path.resolve(
    import.meta.dirname,
    '../../src/modules/docs/contents/kernel/components/path/reference/_includes/schemas.zh.mdx',
  ),
  'PathSchema',
);

/** 路径标签公开投影复用同一 Schema 字段说明 */
export const pathLabelSchemaDescriptions = readSchemaDescriptions(
  path.resolve(
    import.meta.dirname,
    '../../src/modules/docs/contents/kernel/components/path/reference/_includes/schemas.zh.mdx',
  ),
  'PathLabelSchema',
);
