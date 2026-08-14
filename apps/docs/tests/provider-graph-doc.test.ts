import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const contentPath = (relativePath: string, lang: 'zh' | 'en') =>
  resolve(process.cwd(), `src/modules/docs/contents/${relativePath}/index.${lang}.mdx`);

const readContent = (relativePath: string, lang: 'zh' | 'en') => readFileSync(contentPath(relativePath, lang), 'utf8');

describe('provider graph documentation', () => {
  it.each(['zh', 'en'] as const)('%s Kernel 页面说明 rooted closure、冲突与最终 Definition 边界', lang => {
    const concept = readContent('kernel/concepts/design/composite', lang);
    const compile = readContent('kernel/reference/runtime/compile', lang);

    for (const contract of [
      'CoreProviderKey',
      'CoreDependencyProvider',
      'CoreProviderContribution',
      'ResolveCoreProviderDependenciesOptions',
    ]) {
      expect(compile).toContain(contract);
    }
    expect(concept).toContain("capability: 'composite', namespace: 'third'");
    expect(concept).toContain('files="embeddable-flow"');
    expect(concept).toContain('dependencies: [FrameProvider.key]');
    expect(concept).toContain('Object.is');
    expect(concept).toContain('resolveCoreProviderDependencies()');
    expect(compile).toContain('resolveCoreProviderDependencies()');
    expect(compile).toContain('CoreProviderDefinitions');
  });

  it.each(['zh', 'en'] as const)('%s Standard 页面区分 provider 装配与直接 Definition 输入', lang => {
    const loading = readContent('library/standard/extension/capability-loading', lang);
    const landing = readContent('library/standard/extension', lang);

    expect(loading).toContain('CrossShapeDefinition');
    expect(loading).toContain('DiamondArrowDefinition');
    expect(loading).toContain('resolveCoreProviderDependencies');
    expect(loading).toContain('CoreProviderContribution');
    expect(landing).toContain('/library/standard/extension/shape');
    expect(landing).toContain('/library/standard/extension/capability-loading');
    expect(landing.match(/<LinkedCard /g)?.length).toBeGreaterThanOrEqual(4);
    expect(landing.indexOf('</div>')).toBeGreaterThan(landing.lastIndexOf('</LinkedCard>'));
  });

  it('删除公开文档与演示中的 namespace-local maker 旧协议', () => {
    const files = [
      'kernel/packages/vanilla/index.zh.mdx',
      'kernel/packages/vanilla/index.en.mdx',
      'kernel/components/layout/overview/theme-inheritance.zh.demo.tsx',
      'kernel/components/layout/overview/theme-inheritance.en.demo.tsx',
      'kernel/concepts/design/composite/embeddable-flow.demo.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), `src/modules/docs/contents/${file}`), 'utf8');
      expect(source, file).not.toContain('makeComposites');
      expect(source, file).not.toContain('by namespace');
    }
  });
});
