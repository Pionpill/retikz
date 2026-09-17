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

import { createTexApiReferenceMdx, writeTexApiReferenceMdx } from '../../scripts/api-reference/tex';

const compileOptions: CompileOptions = {
  outputFormat: 'function-body',
  development: false,
  remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm],
  rehypePlugins: [rehypeSlug, [rehypeMdxCodeProps, { tagName: 'code' }]],
};

describe('TeX API Reference MDX', () => {
  it('把 package exports 的公开导出生成可直接内联的中文 MDX', async () => {
    const source = await createTexApiReferenceMdx('zh');

    expect(source).toContain('## `@retikz/tex`');
    expect(source).toContain('## `@retikz/tex/react`');
    expect(source).not.toContain('从 `@retikz/tex`.');
    expect(source).toContain('### createLowerTex');
    expect(source).not.toContain('### `createLowerTex`');
    expect(source).toContain('#### 用法\n\n```ts');
    expect(source).toContain("import { createLowerTex, createMathJaxEngine, MathJaxProfile } from '@retikz/tex';");
    expect(source).toContain('| 成员 | 类型 | 默认值 | 说明 |');
    expect(source).toContain('| `onDiagnostic?` |');
    expect(source).toContain('### LowerTexOptions');
    expect(source).not.toContain('```ts\n{ onDiagnostic?: (diagnostic: TexLoweringDiagnostic) => void }\n```');
    const lowerTexState = source.split('### MathJaxLowerTexState\n')[1]?.split('\n### ')[0] ?? '';
    expect(lowerTexState).not.toContain('#### 展开类型');
    expect(source).toContain(
      '<p><ApiSourceLink label={"createLowerTex"} path={"packages/kernel/tex/src/lower/lower-tex.ts"}',
    );
    expect(source).not.toContain('[查看源码](');
  });

  it('投影 JSDoc 的 description、default、remarks、参数、返回值与异常语义', async () => {
    const source = await createTexApiReferenceMdx('zh');

    expect(source).toContain('`base` 仅启用基础 TeX 配置，`math` 额外启用常用数学扩展集合');
    expect(source).toContain('| 成员 | 类型 | 默认值 | 说明 |');
    expect(source).toContain("| `profile?` | `MathJaxProfileValue` | `'base'` | 选择基础或数学扩展集合的内置配置档 |");
    expect(source).toContain('> **备注：** 使用字面量 dynamic import 支持打包器分包');
    expect(source).toContain('#### 参数');
    expect(source).toContain('| `engine` | `MathJaxSvgEngine` | 提供同步 TeX → SVG 转换能力的引擎 |');
    expect(source).toContain('| `options` | `LowerTexOptions` | 控制 lowering 失败诊断的可选配置 |');
    expect(source).toContain('#### 返回值');
    expect(source).toContain('可注入 Core 文本编译流程的同步 `LowerTex`');
    expect(source).toContain('#### 异常');
    expect(source).toContain('`mathjax-full` 无法加载或初始化时');
  });

  it('为英文页面生成相同的 API 结构与英文固定文案', async () => {
    const source = await createTexApiReferenceMdx('en');
    const prose = source.replaceAll(/```[\s\S]*?```/g, '');

    expect(source).toContain('## `@retikz/tex`');
    expect(source).toContain('## `@retikz/tex/react`');
    expect(source).not.toContain('Import from `@retikz/tex/react`.');
    expect(source).toContain('### useLowerTex');
    expect(source).not.toContain('### `useLowerTex`');
    expect(source).toContain('#### Usage\n\n```ts');
    expect(source).toContain("import { useLowerTex } from '@retikz/tex/react';");
    expect(source).toContain('| Member | Type | Default | Description |');
    expect(source).toContain('TeX lowerer configuration');
    expect(source).toContain('Optional configuration for MathJax extensions and lowering diagnostics.');
    expect(source).toContain('> **Notes:** Uses a literal dynamic import to support bundler code splitting');
    expect(source).not.toContain('TeX lowerer 配置');
    expect(prose).not.toMatch(/[\u3400-\u9fff]/u);
    expect(source).toContain(
      '<p><ApiSourceLink label={"useLowerTex"} path={"packages/kernel/tex/src/react/use-lower-tex.ts"}',
    );
    expect(source).not.toContain('[View source](');
  });

  it('写出的 include 可由站点的 MDX 编译器直接编译', async () => {
    const outputDirectory = mkdtempSync(resolve(tmpdir(), 'retikz-tex-api-reference-'));
    try {
      await writeTexApiReferenceMdx(outputDirectory);
      for (const lang of ['zh', 'en'] as const) {
        const source = readFileSync(resolve(outputDirectory, `generated.${lang}.mdx`), 'utf8');
        await expect(compile(source, compileOptions)).resolves.toBeTruthy();
      }
    } finally {
      rmSync(outputDirectory, { force: true, recursive: true });
    }
  });
});
