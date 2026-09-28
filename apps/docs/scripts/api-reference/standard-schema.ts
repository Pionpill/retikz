import * as coreSchemas from '@retikz/core';
import { MapSchema } from '@retikz/standard/container';
import { z } from 'zod';

import { parseSchemaPath } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-path';
import { SCHEMA_REGISTRY } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-registry';
import type { SchemaPathSegment } from '../../src/modules/docs/components/mdx-content/zod-schema/types';
import { nodeSchemas } from '../schema-reference/node';
import { pathSchemaDescriptions } from '../schema-reference/path';
import { scopeSchemaLocalizations } from './scope';
import { createApiReferenceMdx } from './tex';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';

/** 解包展示元数据，不解析输入或物化默认值 */
const unwrap = (schema: z.ZodType): z.ZodType => {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNonOptional
  )
    return unwrap(schema.unwrap() as z.ZodType);
  return schema;
};

const descriptions = new WeakMap<z.ZodObject, Record<string, string>>();

/** 按 canonical selector 访问真实分支，避免将不同分支的说明混为一份 */
const addDescription = (input: z.ZodType, segments: ReadonlyArray<SchemaPathSegment>, text: string): void => {
  const schema = unwrap(input);
  if (segments.length === 0) return;
  const [segment, ...rest] = segments;
  if (schema instanceof z.ZodUnion) {
    if (segment.kind === 'union') {
      addDescription(schema.options[segment.index] as z.ZodType, rest, text);
    } else if (segment.kind === 'case') {
      for (const option of schema.options) {
        const object = unwrap(option as z.ZodType);
        if (object instanceof z.ZodObject && object.shape[segment.discriminator]?.safeParse(segment.value).success)
          addDescription(object, rest, text);
      }
    } else {
      for (const option of schema.options) addDescription(option as z.ZodType, segments, text);
    }
  } else if (schema instanceof z.ZodObject && segment.kind === 'field') {
    const child = schema.shape[segment.key];
    if (!child) return;
    if (rest.length === 0) {
      const fields = descriptions.get(schema) ?? {};
      fields[segment.key] = text;
      descriptions.set(schema, fields);
    } else addDescription(child, rest, text);
  } else if (schema instanceof z.ZodArray && segment.kind === 'array') {
    addDescription(schema.element as z.ZodType, rest, text);
  }
};

const shared = {
  ...scopeSchemaLocalizations,
  ScopePropsSchema: scopeSchemaLocalizations.ScopeSchema,
  PathBaseSchema: { descriptions: pathSchemaDescriptions },
  ...nodeSchemas,
};
const registry = {
  ...SCHEMA_REGISTRY,
  ...Object.fromEntries(
    Object.entries(shared).flatMap(([name, localization]) => {
      const schema = coreSchemas[name as keyof typeof coreSchemas];
      return schema instanceof z.ZodType ? [[name, { schema, localizations: { zh: localization } }]] : [];
    }),
  ),
};
for (const entry of Object.values(registry)) {
  const localization = entry.localizations?.zh;
  if (!localization) continue;
  for (const [key, text] of Object.entries(localization.descriptions)) {
    if (!text) continue;
    const segments = key.startsWith('/')
      ? parseSchemaPath(key)
      : key.split('.').map(field => ({ kind: 'field' as const, key: field }));
    addDescription(entry.schema, segments, text);
  }
}

/** 查询已按真实对象分支收录的中文字段说明 */
export const resolveStandardSchemaLocalization = (schema: z.ZodObject) => {
  const fields = descriptions.get(schema);
  return fields ? { descriptions: fields } : undefined;
};

/** Standard 的全部入口强制开启投影；缺少对象词典或字段翻译由生成器阻止生成 */
export const createStandardApiReferenceMdx = (
  config: ApiReferencePackageConfig,
  lang: ApiReferenceLanguage,
): Promise<string> =>
  createApiReferenceMdx(
    {
      ...config,
      reachableSchemas: {
        CellSchema: MapSchema.options[0].shape.entries.unwrap().unwrap().element.shape.key.options[1],
      },
      resolveSchemaLocalization: resolveStandardSchemaLocalization,
    },
    lang,
  );
