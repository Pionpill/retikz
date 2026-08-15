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
    const ribbon = readContent('library/standard/extension/ribbon', lang);

    expect(loading).toContain('CrossShapeDefinition');
    expect(loading).toContain('DiamondArrowDefinition');
    expect(loading).toContain('resolveCoreProviderDependencies');
    expect(loading).toContain('CoreProviderContribution');
    expect(landing).toContain('/library/standard/extension/shape');
    expect(landing).toContain('/library/standard/extension/ribbon');
    expect(landing).toContain('/library/standard/extension/capability-loading');
    expect(landing.match(/<LinkedCard /g)?.length).toBeGreaterThanOrEqual(4);
    expect(landing.indexOf('</div>')).toBeGreaterThan(landing.lastIndexOf('</LinkedCard>'));
    expect(ribbon).toContain('RibbonPathKindDefinition');
    expect(ribbon).toContain('pathKinds={[RibbonPathKindDefinition]}');
    expect(ribbon).toContain('createRibbonProviderContribution');
  });

  it.each(['zh', 'en'] as const)('%s 文档不暴露未实现的 Standard provider 与 Arc Node 公共面', lang => {
    const standard = readContent('library/standard', lang);
    const compile = readContent('kernel/reference/runtime/compile', lang);
    const step = readContent('kernel/components/draw/step', lang);
    const shapes = readContent('kernel/components/shapes', lang);
    const arcSector = readContent('kernel/components/shapes/arc-sector', lang);
    const ribbon = readContent('library/standard/extension/ribbon', lang);

    const source = [standard, compile, step, shapes, arcSector, ribbon].join('\n');
    expect(source).not.toContain('@retikz/standard/path-generator');
    expect(source).not.toContain('ParabolaPathGeneratorDefinition');
    expect(source).not.toContain('ArcShapeDefinition');
    expect(source).not.toMatch(/Standard.{0,80}parabola|parabola.{0,80}Standard/iu);
    expect(arcSector).toContain('SectorShapeDefinition');
    expect(arcSector).not.toMatch(/sector \/ arc \*\*node\*\*|Node variants|扇形 \/ 弧形的\*\*节点\*\*/iu);

    expect(source).not.toContain('emitRibbon');
    expect(source).not.toContain('ribbonWidthProfiles');
    expect(source).not.toMatch(/\bribbon\s*:\s*\{/iu);
  });

  it('删除公开文档与演示中的 namespace-local maker 旧协议', () => {
    const files = [
      'kernel/packages/framework/vanilla/index.zh.mdx',
      'kernel/packages/framework/vanilla/index.en.mdx',
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
