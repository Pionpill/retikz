import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

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
  it('函数重载和可调用对象的说明与定义保持对应，无参函数不出现空白页签', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'retikz-callable-reference-'));
    try {
      const entry = resolve(directory, 'index.ts');
      const tsconfigPath = resolve(directory, 'tsconfig.json');
      writeFileSync(
        tsconfigPath,
        JSON.stringify({ compilerOptions: { strict: true, target: 'ESNext' }, files: ['./index.ts'] }),
        'utf8',
      );
      writeFileSync(
        entry,
        `
export declare function convert(value: string): string;
export declare function convert(value: number): number;
export type Callback = { (value: string): void; readonly label: string };
export declare function idle(): void;
/**
 * @throws First failure
 * @throws Second failure
 */
export declare function grouped<T extends string = string, U = number>(first: T, second: U): U;
export declare function optional(first?: string, ...rest: Array<number>): void;
`,
        'utf8',
      );
      const source = await createApiReferenceMdx(
        {
          packageName: 'callable-reference-fixture',
          packageDirectory: directory,
          tsconfigPath,
          entries: [{ source: entry, title: { zh: 'Callables', en: 'Callables' } }],
          translate: value => value,
        },
        'en',
      );
      const section = (name: string): string => source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
      for (const name of ['convert', 'Callback', 'idle']) {
        expect(section(name).match(/<DocTabs\b/g)).toHaveLength(1);
        expect(section(name)).toContain('<DocTabs defaultValue="members">');
      }
      const convert = section('convert');
      const members = convert.split('<DocTab value="members"')[1]?.split('</DocTab>')[0] ?? '';
      const definition = convert.split('<DocTab value="definition"')[1]?.split('</DocTab>')[0] ?? '';
      for (const index of [1, 2]) {
        expect(members).toContain(`| ${index} | Parameters |`);
      }
      expect(members).toContain('| `value` | `string` |');
      expect(members).toContain('| `value` | `number` |');
      expect(members.match(/\| Overload \| Category \|/g)).toHaveLength(1);
      expect(members).not.toContain('#### Overload');
      expect(convert).not.toMatch(/(?:#### |\*\*)Overload [12]/);
      expect(definition.match(/```ts/g)).toHaveLength(1);
      expect(definition).toContain('(value: string) => string');
      expect(definition).toContain('(value: number) => number');
      expect(members).not.toContain('```ts');
      const callbackMembers = section('Callback').split('<DocTab value="members"')[1]?.split('</DocTab>')[0] ?? '';
      expect(callbackMembers).toContain('| `readonly label` |');
      expect(callbackMembers).toContain('| `value` (Parameter) | `string` |');
      expect(section('idle')).toContain('| Returns | — | `void` | — |');
      const grouped = section('grouped').split('<DocTab value="members"')[1]?.split('</DocTab>')[0] ?? '';
      expect(grouped).toContain('| Type parameters | `T` | `extends string = string` |');
      expect(grouped).toContain('|  | `U` | `= number` |');
      expect(grouped).toContain('| Parameters | `first` | `T` |');
      expect(grouped).toContain('|  | `second` | `U` |');
      expect(grouped).toContain('| Returns | — | `U` |');
      expect(grouped).toContain('| Throws | — | — | First failure |');
      expect(grouped).toContain('|  | — | — | Second failure |');
      expect(section('optional')).toContain('| Parameters | `first?` | `string` |');
      expect(section('optional')).toContain('|  | `...rest` | `Array<number>` |');
      await expect(compile(source, compileOptions)).resolves.toBeTruthy();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it.each(['zh', 'en'] as const)('Foundation 函数和类使用统一的单层属性与类型定义页签（%s）', async lang => {
    const source = await createFoundationApiReferenceMdx(lang);
    for (const [name, member] of [
      ['RetikzError', '| `readonly code` |'],
      ['RetikzFoundationError', '| `constructor` |'],
      ['compositeOpaqueColor', '| `foreground` |'],
      ['isRetikzError', '| `value` |'],
    ]) {
      const section = source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
      expect(section.match(/<DocTabs\b/g)).toHaveLength(1);
      expect(section).toContain('<DocTabs defaultValue="members">');
      expect(section).toContain(`label="${lang === 'zh' ? '属性' : 'Members'}"`);
      expect(section).toContain(`label="${lang === 'zh' ? '类型定义' : 'Type definition'}"`);
      const members = section.split('<DocTab value="members"')[1]?.split('</DocTab>')[0] ?? '';
      const definition = section.split('<DocTab value="definition"')[1]?.split('</DocTab>')[0] ?? '';
      expect(members).toContain(member);
      expect(members).not.toContain('```ts');
      expect(definition).toContain('```ts\nexport');
      expect(section.split('<DocTabs')[0]).not.toContain('```ts');
    }
  });
  it('保留 Foundation 类型守卫、模板字符串返回类型和默认参数的可选性', async () => {
    const source = await createFoundationApiReferenceMdx('en');
    expect(source).toContain('(value: unknown) => value is RetikzError');
    expect(source).toContain('=> `#${string}`');
    expect(source).toContain('path?: string');
    expect(source).toContain('options?: MergePropertiesOptions<NoInfer<T>>');
    expect(source).toContain('| `options?` |');
    expect(source).toContain('| `ownerError?` |');
    expect(source).not.toContain('=> predicate');
    expect(source).not.toContain('=> templateLiteral');
  });
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
    expect(section).toContain('minimalEnclosing: (points: Array<Vector2>, epsilon?: number) => Circle | null');
    expect(section).not.toContain('const n = points.length');
  });

  it('Math 工具对象展示方法说明和可选参数，曲线分支与默认值可查', async () => {
    const source = await createMathApiReferenceMdx('en');
    const section = (name: string): string => source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
    expect(section('circle')).toContain('<DocTabs defaultValue="members">');
    expect(section('circle')).toContain('| Member | Signature | Description |');
    expect(section('circle')).toContain('Smallest enclosing circle');
    expect(section('circle')).toContain('returns null for empty input');
    expect(section('CurveSegment').match(/<DocTabs\b/g)).toHaveLength(1);
    for (const name of ['Line', 'Quadratic Bézier', 'Cubic Bézier', 'Circular arc', 'Elliptical arc']) {
      expect(section('CurveSegment')).toContain(`Members · ${name}`);
    }
    expect(section('CurveApproximationOptions')).toContain('| `sampleCount?` | `number` | `32` |');
    expect(section('vector2')).toContain('original fallback reference');
    expect(section('boundsOf')).toContain('Two-dimensional point set to evaluate');
    expect(section('applyAffine')).toContain('| Returns | — | `Position` |');
    expect(section('applyAffine')).not.toContain('import("..")');
    expect(section('intersect')).not.toContain('__namedParameters');
    expect(section('ellipse')).toContain("defaults to 'proportional'");
    expect(section('point')).toContain('Does not normalize direction');
    expect(section('curve')).toContain('no greater than DEFAULT_EPSILON');
  });

  it('不展示继承自 JavaScript Error 的内部成员', async () => {
    const source = await createFoundationApiReferenceMdx('en');

    expect(source).toContain('| `readonly code` |');
    expect(source).toContain('| `readonly code` | `TCode` | — | Classification code of the structured error |');
    expect(source).toContain(
      '| `readonly cause?` | `unknown` | `undefined` | Original exception or value that caused this error |',
    );
    expect(source).toContain('Creates a domain error from structured options, preserving the original cause');
    expect(source).toContain('Creates a Foundation error with the default error code');
    expect(source).toContain('Creates a Foundation error from structured options');
    expect(source).not.toContain('| `captureStackTrace` |');
    expect(source).not.toContain('| `stackTraceLimit` |');
    const definition =
      source.split('### RetikzError\n')[1]?.split('<DocTab value="definition"')[1]?.split('</DocTab>')[0] ?? '';
    expect(definition).toContain('readonly code: TCode;');
    expect(definition).toContain('readonly details: TDetails;');
    expect(definition).toContain('readonly cause?: unknown;');
    expect(definition).not.toContain('super(');
  });

  it('构造重载分行展示且只在首行显示成员名，完整构造声明保留在定义页', async () => {
    const source = await createFoundationApiReferenceMdx('en');
    const section = source.split('### RetikzFoundationError\n')[1]?.split('\n### ')[0] ?? '';
    const members = section.split('<DocTab value="members"')[1]?.split('</DocTab>')[0] ?? '';
    const definition = section.split('<DocTab value="definition"')[1]?.split('</DocTab>')[0] ?? '';
    expect(members).toContain('| Member | Signature | Description |');
    expect(members).toContain(
      '| `constructor` | `(message: string)` | Creates a Foundation error with the default error code |',
    );
    expect(members).toContain(
      '|  | `(options: RetikzErrorOptions<TCode, TDetails>)` | Creates a Foundation error from structured options |',
    );
    expect(members.match(/\| `constructor` \|/g)).toHaveLength(1);
    expect(members).toContain('`TCode` (Type parameter)');
    expect(definition).toContain('constructor(message: string);');
    expect(definition).toContain('constructor(options: RetikzErrorOptions<TCode, TDetails>);');
    expect(definition).not.toContain('optionsOrMessage');
  });

  it('将标准 JSDoc @template 投影为类型参数说明', async () => {
    const source = await createFoundationApiReferenceMdx('en');
    const section = source.split('### RetikzError\n')[1]?.split('\n### ')[0] ?? '';

    expect(section).toContain('`TCode` (Type parameter)');
    expect(section).toContain('String type of the error classification code');
    expect(section).toContain('`TDetails` (Type parameter)');
    expect(section).toContain('Structured detail type associated with the error code');
    expect(section).not.toContain('#### Type parameters');
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
