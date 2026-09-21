import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createLayoutApiReferenceMdx } from '../../scripts/api-reference/layout';

describe('Layout API 公开范围', () => {
  it('只展示组件契约，保留字段类型并生成有效源码链接', async () => {
    const source = await createLayoutApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    expect(headings).toContain('LayoutProps');
    expect(headings).toContain('Layout');
    expect(headings).not.toContain('Node');
    expect(headings).not.toContain('Scope');
    expect(source).toContain("IRScene['theme']");
    expect(source).toContain('`compileDriver?`');
    const extensions = source.split('### LayoutExtensions\n')[1]?.split('\n### ')[0] ?? '';
    const fields = [...extensions.matchAll(/^\| `(?:readonly )?([^`?]+)\?` \|/gm)].map(match => match[1]);
    expect(fields).toEqual([
      'arrows',
      'boundaries',
      'clips',
      'composites',
      'pathGenerators',
      'pathKinds',
      'patterns',
      'shapes',
      'themeStyles',
    ]);
    expect(extensions).toContain('ReadonlyArray<ClipDefinition>');
    expect(extensions).toContain('ReadonlyArray<AnyCompositeDefinition>');
    expect(extensions).toContain('`BUILTIN_ARROWS`');
    expect(extensions).toContain('`BUILTIN_COMPOSITES`');
    expect(extensions).toContain('`ThemeStylesContext`');
    expect(extensions).not.toContain('import("');
    expect(extensions).not.toContain('$ZodTypeInternals');
    expect(extensions).toContain('<DocTabs defaultValue="members">');
    expect(extensions).toMatch(
      /\| Member \|[\s\S]*<DocTab value="definition" label="Type definition">[\s\S]*export type LayoutExtensions = Readonly<\{/,
    );
    const layoutProps = source.split('### LayoutProps\n')[1]?.split('\n### ')[0] ?? '';
    expect(layoutProps).toContain('<DocSteps>');
    expect(layoutProps).toContain('<DocStep title="Drawing input and defaults">');
    const runtimeModeValue = source.split('### LayoutRuntimeModeValue\n')[1]?.split('\n### ')[0] ?? '';
    expect(runtimeModeValue).toContain('#### Expanded type');
    expect(runtimeModeValue).toContain('export type LayoutRuntimeModeValue =\n  | "retained"\n  | "static";');
    const runtimeOptions = source.split('### LayoutRuntimeOptions\n')[1]?.split('\n### ')[0] ?? '';
    expect(runtimeOptions).toContain('#### Expanded type');
    expect(runtimeOptions).toContain('readonly mode?: typeof LayoutRuntimeMode.Retained | undefined;');
    expect(runtimeOptions).toContain(
      'export type LayoutRuntimeOptions = LayoutRetainedRuntimeOptions | LayoutStaticRuntimeOptions;',
    );
    expect(extensions).not.toContain('<details>');
    expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);
    const paths = [...source.matchAll(/path=\{"([^"}]+)"\}/g)].map(match => match[1]);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) expect(existsSync(resolve('../..', path))).toBe(true);
  });
});
