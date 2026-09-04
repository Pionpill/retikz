import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { changelogForModule } from '@/modules/docs/data';

const readContent = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Flow Diagram documentation', () => {
  it.each(['zh', 'en'] as const)(
    '%s provides a landing page and runnable basics without a separate extension guide',
    lang => {
      const landing = readContent(`src/modules/docs/contents/schematic/diagram/flow/index.${lang}.mdx`);
      const basic = readContent(`src/modules/docs/contents/schematic/diagram/flow/basic/index.${lang}.mdx`);

      expect(landing).toContain('/schematic/diagram/flow/basic');
      expect(landing).not.toContain('/schematic/diagram/flow/extension');
      expect(basic).not.toContain('/schematic/diagram/flow/extension');
      expect(basic).toContain('files="flow-basic"');
      expect(basic).toContain('files="flow-compound"');
      expect(basic).toContain('files="flow-theme"');
      expect(basic).toContain('FlowDiagramArtifact');
      expect(basic).toContain('entities');
      expect(basic).toContain('groups');
      expect(basic).toContain('layouts');
      expect(basic).toContain('FlowLayout');
      expect(basic).toContain('FlowEntities');
      expect(basic).toContain('FlowRelations');
      expect(basic).toContain('complete');
      expect(basic).toContain(lang === 'zh' ? '追加收集器' : 'additive collectors');
      expect(basic).not.toContain('### Flow Source');
      expect(basic).not.toContain('### FlowDiagramArtifact');
      expect(basic).not.toContain("kind: 'layout' | 'visible'");
      expect(basic).not.toContain('layout-group');
      expect(basic).toContain(
        lang === 'zh'
          ? '`flowTheme` 让 Flow 根为全部同类对象提供统一默认样式'
          : '`flowTheme` supplies one shared default style for each Flow object category at the root',
      );
      expect(basic).toContain('relation.style');
    },
  );

  it.each(['zh', 'en'] as const)('%s migrates the IR-centric figure to automatic Flow layout', lang => {
    const demo = readContent(`src/modules/docs/contents/kernel/introduction/ir-centric.${lang}.demo.tsx`);

    expect(demo).toContain('FlowDiagram');
    expect(demo).toContain('FlowEntity');
    expect(demo).toContain('FlowRelation');
    expect(demo).not.toContain('<FlowRelation id=');
    expect(demo).not.toContain('position=');
    expect(demo).not.toContain('<Draw');
  });

  it('registers the Diagram package family in the shared Schematic v0.1 changelog', () => {
    const release = changelogForModule('schematic').find(entry => entry.minor === 'v0.1');
    const diagramBlocks = release?.packages.filter(block => block.pkg.startsWith('@retikz/diagram')) ?? [];

    expect(diagramBlocks.map(block => block.pkg)).toEqual([
      '@retikz/diagram',
      '@retikz/diagram-react',
      '@retikz/diagram-vanilla',
    ]);
    expect(diagramBlocks.every(block => block.subVersions.some(version => version.version === 'alpha.1'))).toBe(true);
    expect(JSON.stringify(diagramBlocks)).toContain('IRFlowDiagram');
    expect(JSON.stringify(diagramBlocks)).toContain('LLM-first');
    expect(JSON.stringify(diagramBlocks)).toContain('entities');
    expect(JSON.stringify(diagramBlocks)).toContain('layouts');
    expect(JSON.stringify(diagramBlocks)).toContain('FlowLayout');
    expect(JSON.stringify(diagramBlocks)).toContain('FlowEntities');
    expect(JSON.stringify(diagramBlocks)).toContain('FlowRelations');
    expect(JSON.stringify(diagramBlocks)).toContain('complete');
    expect(JSON.stringify(diagramBlocks)).not.toContain('layout Group');
  });
});
