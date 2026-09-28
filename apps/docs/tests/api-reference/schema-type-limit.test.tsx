import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import { RenderType } from '../../src/modules/docs/components/mdx-content/zod-schema/RenderType';
import { SCHEMA_REGISTRY } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-registry';
import { schemaTypeText } from '../../src/modules/docs/components/mdx-content/zod-schema/type-text';
import type { TypeRepr } from '../../src/modules/docs/components/mdx-content/zod-schema/types';
import { walk } from '../../src/modules/docs/components/mdx-content/zod-schema/walker';

it('300 字符仍展示完整类型，301 字符默认收起并保留展开入口', () => {
  const short: TypeRepr = { kind: 'literal', value: 'a'.repeat(298) };
  const long: TypeRepr = { kind: 'literal', value: 'a'.repeat(299) };
  expect(schemaTypeText(short)).toHaveLength(300);
  expect(renderToStaticMarkup(<RenderType repr={short} />)).not.toContain('aria-expanded');
  const html = renderToStaticMarkup(<RenderType repr={long} />);
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('…');
  expect(html).not.toContain('a'.repeat(299));
});

it('标准包所有 Schema 顶层及对象字段的超长类型均默认收起', () => {
  const collapsed: Array<string> = [];
  for (const [name, entry] of Object.entries(SCHEMA_REGISTRY)) {
    if (!entry.url?.startsWith('/library/standard/')) continue;
    const representation = walk(entry.schema);
    const types =
      representation.kind === 'alias'
        ? [{ name, type: representation.type }]
        : representation.fields.map(field => ({ name: `${name}.${field.name}`, type: field.type }));
    for (const item of types) {
      const html = renderToStaticMarkup(<RenderType repr={item.type} name={item.name} />);
      if (schemaTypeText(item.type).length > 300) {
        collapsed.push(item.name);
        expect(html, item.name).toContain('aria-expanded="false"');
        expect(html, item.name).toContain(item.name);
        expect(html, item.name).not.toContain('data-state="open"');
      } else expect(html, item.name).not.toContain('data-schema-type-collapsed');
    }
  }
  expect(collapsed).toContain('RectangleSchema');
  expect(collapsed).toContain('CircleSchema');
});
