import { expect, it } from 'vitest';

import { SCHEMA_REGISTRY } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-registry';
import type { ObjectField } from '../../src/modules/docs/components/mdx-content/zod-schema/types';
import { walk } from '../../src/modules/docs/components/mdx-content/zod-schema/walker';

it('Standard 普通 Schema 表的所有可展示字段均有中文说明且词典没有无效路径', () => {
  const failures: Array<string> = [];

  for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
    if (!entry.url?.startsWith('/library/standard/')) continue;

    const representation = walk(entry.schema);
    if (representation.kind !== 'object') continue;

    const descriptions = entry.localizations?.zh?.descriptions ?? {};

    // canonical 展开页由独立的 typed-path 翻译契约负责
    if (Object.keys(descriptions).some(key => key.startsWith('/'))) continue;

    const paths = new Set<string>();

    const visit = (fields: Array<ObjectField>, prefix = ''): void => {
      for (const field of fields) {
        const key = `${prefix}${field.name}`;
        paths.add(key);
        if (!descriptions[key]) failures.push(`${name}.${key}: missing translation`);
        if (field.type.kind === 'object') visit(field.type.fields, `${key}.`);
      }
    };

    visit(representation.fields);

    for (const key of Object.keys(descriptions)) {
      if (!paths.has(key)) failures.push(`${name}.${key}: unknown path`);
    }
  }

  expect(failures).toEqual([]);
});
