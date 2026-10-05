import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

it('过长的变量字段类型保留公开引用，匿名结构使用成员索引；仅声明配置不生成成员表', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'retikz-member-expansion-'));

  try {
    const entry = path.join(directory, 'index.ts');
    const tsconfigPath = path.join(directory, 'tsconfig.json');
    const fields = Array.from({ length: 40 }, (_, index) => `field${index}: 'value${index}'`).join(',');
    const parameterFields = Array.from({ length: 40 }, (_, index) => `field${index}: string`).join(';');
    writeFileSync(
      entry,
      `
export const PublicSchema = { ${fields} };
export const Definition = { schema: PublicSchema, options: { ${fields} }, enabled: true, expand: (source: { ${parameterFields} }) => source.field0 };
export const HiddenDefinition = Definition;
`,
      'utf8',
    );
    writeFileSync(
      tsconfigPath,
      JSON.stringify({ compilerOptions: { strict: true, target: 'ESNext' }, files: [entry] }),
      'utf8',
    );
    const config = {
      packageName: 'member-expansion-fixture',
      packageDirectory: directory,
      tsconfigPath,
      translate: (text: string) => text,
      entries: [
        {
          source: entry,
          title: { zh: 'Members', en: 'Members' },
          symbols: ['Definition', 'HiddenDefinition'],
          declarationOnlySymbols: ['HiddenDefinition'],
        },
      ],
    };

    for (const lang of ['zh', 'en'] as const) {
      const mdx = await createApiReferenceMdx(config, lang);
      const definition = mdx.split('### Definition\n')[1]?.split('\n### ')[0] ?? '';

      expect(definition).toContain('| `schema` | `typeof PublicSchema` |');
      expect(definition).toContain('| `options` | `typeof Definition["options"]` |');
      expect(definition).toContain('| `expand` | `typeof Definition["expand"]` |');
      expect(definition).toContain('| `enabled` | `boolean` |');

      const hidden = mdx.split('### HiddenDefinition\n')[1] ?? '';

      expect(hidden).toContain('export const HiddenDefinition = Definition;');
      expect(hidden).not.toContain('<ApiTable');

      for (const row of mdx.split('\n').filter(line => line.startsWith('| `'))) {
        expect(row.split(' | ')[1].length).toBeLessThanOrEqual(302);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 60_000);
