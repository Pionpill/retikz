import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { expect, it } from 'vitest';

import { createDrawApiReferenceMdx } from '../../scripts/api-reference/draw';

it('路径函数与重载的调用契约在属性页签中保持单表，完整声明独立展示', async () => {
  const source = await createDrawApiReferenceMdx('en');
  for (const name of ['defineArrow', 'definePathGenerator', 'definePathKind']) {
    const section = source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
    const tabs = [...section.matchAll(/<DocTab value="([^"]+)"[^>]*>([\s\S]*?)<\/DocTab>/g)];
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    for (const [, value, content] of tabs) {
      if (value === 'definition') {
        expect(content).toContain('```ts');
      } else {
        expect(content.match(/\| Category \|/g)).toHaveLength(1);
        expect(content).toContain('| Returns |');
        expect(content).not.toMatch(/^#### /m);
      }
    }
  }
  expect(source).not.toContain('#### Type parameters');
  expect(source).not.toContain('#### Parameters');
  const pathKind = source.split('### definePathKind\n')[1]?.split('\n### ')[0] ?? '';
  const withoutOutput = pathKind.split('<DocTab value="without-owner-output"')[1]?.split('</DocTab>')[0] ?? '';
  const withOutput = pathKind.split('<DocTab value="with-owner-output"')[1]?.split('</DocTab>')[0] ?? '';
  expect(withoutOutput).toContain('`TPath` | `extends IRPathBase = IRPathBase`');
  expect(withOutput).toContain('`TPath` | `extends IRPathBase`');
  expect(withOutput).toContain('`TOwnerOutput` | `extends JsonValue`');
  expect(withoutOutput).toContain('`definition` | `PathKindDefinition<TPath, never>`');
  expect(withOutput).toContain('| Returns | — | `PathKindDefinition<TPath, TOwnerOutput>`');
  expect(pathKind).not.toContain('$Zod');
  await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
}, 30_000);
