import path from 'node:path';

import { StepSchema } from '@retikz/core';
import { z } from 'zod';

import { readSchemaDescriptions } from './descriptions';

const stepReference = path.resolve(
  import.meta.dirname,
  '../../src/modules/docs/contents/kernel/components/path/reference/_includes/schemas.zh.mdx',
);

/** 按实际步骤分支复用 Schema 页字段说明；折线的两个 via 分支共享同一参考节 */
const stepDescriptions = new Map<string, Readonly<Record<string, string>>>();
for (const option of StepSchema.options) {
  const branch = option instanceof z.ZodDiscriminatedUnion ? option.options[0] : option;
  const kind = branch.shape.kind.value;
  const name = kind === 'axis-line' ? 'AxisLine' : kind[0].toUpperCase() + kind.slice(1);
  stepDescriptions.set(kind, readSchemaDescriptions(stepReference, name + 'StepSchema'));
}

/** 为从步骤 Input 派生的 JSX 属性解析当前 kind 的字段词典 */
export const resolveStepLocalization = (schema: z.ZodObject) => {
  if (schema.shape.type?.value !== 'step') return undefined;
  const descriptions = stepDescriptions.get(schema.shape.kind?.value);
  if (!descriptions) return undefined;
  return { descriptions: Object.fromEntries(Object.entries(descriptions).filter(([name]) => name in schema.shape)) };
};

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
