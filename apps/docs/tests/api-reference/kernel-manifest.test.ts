import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import type { CompileOptions } from '@mdx-js/mdx';
import { compile } from '@mdx-js/mdx';
import rehypeMdxCodeProps from 'rehype-mdx-code-props';
import rehypeSlug from 'rehype-slug';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import { describe, expect, it } from 'vitest';

import {
  createFoundationApiReferenceMdx,
  writeFoundationApiReferenceMdx,
} from '../../scripts/api-reference/foundation';
import { createMathApiReferenceMdx, writeMathApiReferenceMdx } from '../../scripts/api-reference/math';

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: false,
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
  rehypePlugins: [rehypeSlug, [rehypeMdxCodeProps, { tagName: 'code' }]],
};

const packageReferences = [
  {
    packageName: '@retikz/foundation',
    representativeSymbol: 'RetikzFoundationError',
    sourcePath: 'packages/kernel/foundation/src/error.ts',
    create: createFoundationApiReferenceMdx,
    write: writeFoundationApiReferenceMdx,
  },
  {
    packageName: '@retikz/math',
    representativeSymbol: 'boundsOf',
    sourcePath: 'packages/kernel/math/src/primitives/bounds.ts',
    create: createMathApiReferenceMdx,
    write: writeMathApiReferenceMdx,
  },
] as const;

describe('Kernel API Reference MDX', () => {
  it.each(packageReferences)('从 $packageName 的单入口导出生成正确的双语结构', async reference => {
    const zh = await reference.create('zh');
    const en = await reference.create('en');
    const englishProse = en.replaceAll(/```[\s\S]*?```/g, '');

    expect(zh).toContain(`## \`${reference.packageName}\``);
    expect(en).toContain(`## \`${reference.packageName}\``);
    expect(en).toContain(`### ${reference.representativeSymbol}`);
    expect(en).toContain(`path={${JSON.stringify(reference.sourcePath)}}`);
    expect(en).not.toContain(`## Root entry \`${reference.packageName}\``);
    expect(englishProse).not.toMatch(/[\u3400-\u9fff]/u);
  });

  it.each(packageReferences)('写出的 $packageName include 可由 MDX 编译器编译', async reference => {
    const outputDirectory = mkdtempSync(resolve(tmpdir(), 'retikz-kernel-api-reference-'));
    try {
      await reference.write(outputDirectory);
      for (const lang of ['zh', 'en'] as const) {
        const source = readFileSync(resolve(outputDirectory, `generated.${lang}.mdx`), 'utf8');
        await expect(compile(source, compileOptions)).resolves.toBeTruthy();
      }
    } finally {
      rmSync(outputDirectory, { force: true, recursive: true });
    }
  });

  it('将对象常量内的函数投影为声明，不展示实现体', async () => {
    const source = await createMathApiReferenceMdx('en');
    const section = source.split('### circle\n')[1]?.split('\n### ')[0] ?? '';

    expect(section).toContain('export declare const circle: {');
    expect(section).toContain('minimalEnclosing: (points: Array<Vector2>, epsilon: number) => Circle | null');
    expect(section).not.toContain('const n = points.length');
  });

  it('不展示继承自 JavaScript Error 的内部成员', async () => {
    const source = await createFoundationApiReferenceMdx('en');

    expect(source).toContain('| `readonly code` |');
    expect(source).not.toContain('| `captureStackTrace` |');
    expect(source).not.toContain('| `stackTraceLimit` |');
  });

  it('将标准 JSDoc @template 投影为类型参数说明', async () => {
    const source = await createFoundationApiReferenceMdx('en');
    const section = source.split('### RetikzError\n')[1]?.split('\n### ')[0] ?? '';

    expect(section).toContain('| `TCode` | String type of the error classification code |');
    expect(section).toContain('| `TDetails` | Structured detail type associated with the error code |');
  });

  it('不在 Foundation API 参考中重复展示独立 Schema 参考内容', async () => {
    const source = await createFoundationApiReferenceMdx('en');
    const schemaSymbols = [
      'JsonObjectSchema',
      'JsonValueSchema',
      'NonBlankStringSchema',
      'NonNegativeIntegerSchema',
      'NonNegativeNumberSchema',
      'NormalizedFractionSchema',
      'PositiveIntegerSchema',
      'PositiveNumberSchema',
    ];

    for (const symbol of schemaSymbols) {
      expect(source).not.toContain(`### ${symbol}`);
    }
  });
});
