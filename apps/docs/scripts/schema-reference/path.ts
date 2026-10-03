import path from 'node:path';

import { readSchemaDescriptions } from './descriptions';

/** Path API 与 Schema 参考共用的中文字段说明 */
export const pathSchemaDescriptions = readSchemaDescriptions(
  path.resolve(
    import.meta.dirname,
    '../../src/modules/docs/contents/kernel/components/path/schema-reference/index.zh.mdx',
  ),
  'PathSchema',
);

/** 几何标签公开投影复用同一 Schema 字段说明 */
export const geometryLabelSchemaDescriptions = readSchemaDescriptions(
  path.resolve(
    import.meta.dirname,
    '../../src/modules/docs/contents/kernel/components/path/schema-reference/index.zh.mdx',
  ),
  'GeometryLabelSchema',
);
