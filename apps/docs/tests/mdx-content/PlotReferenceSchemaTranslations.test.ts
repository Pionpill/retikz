import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ObjectField } from '@/modules/docs/components/mdx-content/zod-schema/types';

import { SCHEMA_REGISTRY } from '@/modules/docs/components/mdx-content/zod-schema/schema-registry';
import { walk } from '@/modules/docs/components/mdx-content/zod-schema/walker';

type TranslationGap = {
  file: string;
  line: number;
  schema: string;
  fields: Array<string>;
};

const referenceRoot = path.resolve(process.cwd(), 'src/modules/docs/contents/viz/plot/reference');

/** 收集对象 schema 中会渲染为表格行的字段路径 */
const collectFieldPaths = (fields: Array<ObjectField>, prefix = ''): Array<string> => {
  const paths: Array<string> = [];
  for (const field of fields) {
    const fieldPath = prefix === '' ? field.name : `${prefix}.${field.name}`;
    paths.push(fieldPath);
    if (field.type.kind === 'object') {
      paths.push(...collectFieldPaths(field.type.fields, fieldPath));
    }
  }
  return paths;
};

/** 读取 descriptions 对象中显式声明的字段路径 */
const collectDescriptionKeys = (block: string): Set<string> => {
  const match = block.match(/descriptions=\{\{([\s\S]*?)\}\}/);
  if (match == null) return new Set();

  const keys = new Set<string>();
  const propertyPattern = /(?:^|[,{]\s*)\s*(?:(['"])(.*?)\1|([A-Za-z_$][\w$]*))\s*:/g;
  for (const property of match[1].matchAll(propertyPattern)) {
    const quotedKey = property[2] as string | undefined;
    const identifierKey = property[3] as string | undefined;
    const key = quotedKey ?? identifierKey;
    if (key !== undefined) keys.add(key);
  }
  return keys;
};

/** 递归查找 Plot Reference 的中文 MDX 页面 */
const collectChineseReferenceFiles = (directory: string): Array<string> =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectChineseReferenceFiles(entryPath);
    return entry.name === 'index.zh.mdx' ? [entryPath] : [];
  });

describe('Plot Reference schema 中文翻译', () => {
  it('为所有对象字段提供中文 descriptions，避免回退源码英文', () => {
    const gaps: Array<TranslationGap> = [];

    for (const file of collectChineseReferenceFiles(referenceRoot)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(/<ZodSchema\b[\s\S]*?\/>/g)) {
        const block = match[0];
        const schema = block.match(/\bname="([^"]+)"/)?.[1];
        if (schema == null) continue;

        const entry = (SCHEMA_REGISTRY as Record<string, (typeof SCHEMA_REGISTRY)[string] | undefined>)[schema];
        if (entry == null) continue;

        const representation = walk(entry.schema);
        if (representation.kind !== 'object') continue;

        const translatedFields = collectDescriptionKeys(block);
        const fields = collectFieldPaths(representation.fields).filter(field => !translatedFields.has(field));
        if (fields.length === 0) continue;

        gaps.push({
          file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
          line: source.slice(0, match.index).split('\n').length,
          schema,
          fields,
        });
      }
    }

    expect(gaps).toEqual([]);
  });
});
