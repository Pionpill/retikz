import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createLayoutApiReferenceMdx } from '../../scripts/api-reference/layout';

describe('Layout API 公开范围', () => {
  it('只展示组件契约，保留字段类型并生成有效源码链接', async () => {
    const source = await createLayoutApiReferenceMdx('en');
    const headings = [...source.matchAll(/^### (.+)$/gm)].map(match => match[1]);
    expect(headings[0]).toBe('Layout / LayoutProps');
    expect(headings).not.toContain('LayoutProps');
    expect(headings).not.toContain('Layout');
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
    const layoutProps = source.split('### Layout / LayoutProps\n')[1]?.split('\n### ')[0] ?? '';
    expect(layoutProps).toContain('| Group | Member | Type | Default | Description |');
    expect(layoutProps).toMatch(
      /```ts\n(?:(?!```)[\s\S])*export declare const Layout: FC<LayoutProps>;(?:(?!```)[\s\S])*export type LayoutProps = \{/,
    );
    expect(layoutProps).toContain('`computeDisplaySize`');
    const runtimeModeValue = source.split('### LayoutRuntimeModeValue\n')[1]?.split('\n### ')[0] ?? '';
    expect(runtimeModeValue.match(/<DocTabs\b/g)).toHaveLength(1);
    expect(runtimeModeValue).toContain('<DocTabs defaultValue="expanded">');
    expect(runtimeModeValue).toContain('<DocTab value="expanded" label="Expanded type">');
    expect(runtimeModeValue).toContain('<DocTab value="definition" label="Type definition">');
    expect(runtimeModeValue).toContain('export type LayoutRuntimeModeValue = ValueOf<typeof LayoutRuntimeMode>;');
    expect(runtimeModeValue).toContain('export type LayoutRuntimeModeValue =\n  | "retained"\n  | "static";');
    const runtimeOptions = source.split('### LayoutRuntimeOptions\n')[1]?.split('\n### ')[0] ?? '';
    expect(runtimeOptions.match(/<DocTabs\b/g)).toHaveLength(1);
    expect(runtimeOptions).toContain('<DocTabs defaultValue="retained">');
    expect(runtimeOptions).toContain('<DocTab value="retained" label="Members · Retained">');
    expect(runtimeOptions).toContain('<DocTab value="static" label="Members · Static">');
    expect(runtimeOptions).toContain('<DocTab value="definition" label="Type definition">');
    const staticBranch =
      runtimeOptions.split('<DocTab value="static" label="Members · Static">')[1]?.split('</DocTab>')[0] ?? '';
    expect(staticBranch).toContain('`typeof LayoutRuntimeMode.Static`');
    expect(staticBranch).toMatch(/`readonly updateStrategy\?` \| `never`/);
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
