import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import { RenderType } from '../../src/modules/docs/components/mdx-content/zod-schema/RenderType';
import { SCHEMA_REGISTRY } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-registry';
import { schemaTypeText } from '../../src/modules/docs/components/mdx-content/zod-schema/type-text';
import type { TypeRepr } from '../../src/modules/docs/components/mdx-content/zod-schema/types';
import { walk } from '../../src/modules/docs/components/mdx-content/zod-schema/walker';

it('300 字符展示完整类型，301 字符仅展示名称', () => {
  const short: TypeRepr = { kind: 'literal', value: 'a'.repeat(298) };
  const long: TypeRepr = { kind: 'literal', value: 'a'.repeat(299) };

  expect(schemaTypeText(short)).toHaveLength(300);
  expect(renderToStaticMarkup(<RenderType repr={short} name="ExampleSchema.value" />)).toContain('a'.repeat(298));

  const html = renderToStaticMarkup(<RenderType repr={long} name="ExampleSchema.value" />);

  expect(html).toContain('ExampleSchema.value');
  expect(html).not.toContain('aria-expanded');
  expect(html).not.toContain('展开 / 收起类型');
  expect(html).not.toContain('a'.repeat(299));
});

it('各包 Schema 顶层及对象字段的超长类型仅显示名称', () => {
  const summarized = new Set<string>();
  const packages = new Set<string>();

  for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
    const representation = walk(entry.schema);
    const types =
      representation.kind === 'alias'
        ? [{ name, type: representation.type }]
        : representation.fields.map(field => ({ name: `${name}.${field.name}`, type: field.type }));

    for (const item of types) {
      if (schemaTypeText(item.type).length > 300) {
        const html = renderToStaticMarkup(<RenderType repr={item.type} name={item.name} />);
        summarized.add(item.name);
        if (entry.url !== undefined) packages.add(entry.url.split('/')[1] ?? 'unknown');

        expect(html, item.name).toContain(item.name);
        expect(html, item.name).not.toContain('aria-expanded');
      }
    }
  }

  expect(summarized.has('RectangleSchema')).toBe(true);
  expect(summarized.has('CircleSchema')).toBe(true);
  expect(packages).toEqual(new Set(['kernel', 'library', 'schematic', 'viz']));
});
