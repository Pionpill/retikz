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

    for (const name of ['scene', 'InputScene', 'layer', 'layerFromInput', 'InputLayer', 'IRScene', 'IRViewBox'])
      expect(headings).toContain(name);

    for (const owner of ['react', 'vanilla', 'core']) expect(source).toContain('## `@retikz/' + owner + '`');

    const sceneInput = source.split('### InputScene\n')[1]?.split('\n### ')[0] ?? '';
    const layerInput = source.split('### InputLayer\n')[1]?.split('\n### ')[0] ?? '';
    expect(sceneInput).toContain('ReadonlyArray<InputChild>');
    expect(sceneInput).not.toContain('`layers`');
    expect(layerInput).toContain('scene: IRScene;');
    expect(layerInput).toContain('config?: ProcessOptions');
    expect(source).toContain("IRScene['theme']");

    const extensions = source.split('### LayoutExtensions\n')[1]?.split('\n### ')[0] ?? '';
    expect(extensions).toContain('Pick<CompileOptions,');
    for (const field of [
      'arrows',
      'boundaries',
      'clips',
      'composites',
      'marks',
      'paths',
      'patterns',
      'shapes',
      'themeDefinitions',
    ])
      expect(extensions).toContain(`'${field}'`);

    const layoutProps = source.split('### Layout / LayoutProps\n')[1]?.split('\n### ')[0] ?? '';

    expect(layoutProps).toContain('| Group | Member | Type | Default | Description |');
    expect(layoutProps).toMatch(
      /```ts\n(?:(?!```)[\s\S])*export declare const Layout: FC<LayoutProps>;(?:(?!```)[\s\S])*export type LayoutProps = \{/,
    );
    expect(layoutProps).toContain('`computeDisplaySize`');

    expect(layoutProps).toContain("ProcessOptions['reconciler']");
    expect(layoutProps).toContain('onDiagnostic');
    expect(extensions).not.toContain('<details>');
    expect(source.replaceAll(/```[\s\S]*?```/g, '')).not.toMatch(/[\u3400-\u9fff]/u);

    const paths = [...source.matchAll(/path=\{"([^"}]+)"\}/g)].map(match => match[1]);

    expect(paths.length).toBeGreaterThan(0);

    for (const path of paths) expect(existsSync(resolve('../..', path))).toBe(true);
  }, 30_000);
});
