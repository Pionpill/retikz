import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as blockPreviewSourceEn } from '../src/modules/docs/contents/schematic/graph/block/basic/block-basic.en.demo';
import { previewSource as blockPreviewSource } from '../src/modules/docs/contents/schematic/graph/block/basic/block-basic.zh.demo';
import { previewSource as blockConnectionPreviewSourceEn } from '../src/modules/docs/contents/schematic/graph/block/basic/block-connection.en.demo';
import { previewSource as blockConnectionPreviewSource } from '../src/modules/docs/contents/schematic/graph/block/basic/block-connection.zh.demo';
import { previewSource as blockStylePreviewSourceEn } from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.en.demo';
import { previewSource as blockStylePreviewSource } from '../src/modules/docs/contents/schematic/graph/block/basic/block-style.zh.demo';

const readContent = (relativePath: string): string => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Graph Block documentation', () => {
  it.each(['zh', 'en'] as const)('%s documents open Block content and independent structure composites', lang => {
    const landing = readContent(`src/modules/docs/contents/schematic/graph/block/index.${lang}.mdx`);
    const page = readContent(`src/modules/docs/contents/schematic/graph/block/basic/index.${lang}.mdx`);
    const api = readContent(`src/modules/docs/contents/schematic/graph/api-reference/index.${lang}.mdx`);

    expect(landing).toContain('/schematic/graph/block/basic');
    expect(landing).toContain('/schematic/graph/block/builtin');
    expect(landing).toContain('/schematic/graph/block/extension');
    expect(landing).toContain(lang === 'zh' ? '内置实现' : 'Built-in Implementation');

    const sections = [
      '## ' + (lang === 'zh' ? '用法' : 'Usage'),
      '## ' + (lang === 'zh' ? '例子' : 'Examples'),
      '## ' + (lang === 'zh' ? '技术原理' : 'How it works'),
      '## ' + (lang === 'zh' ? 'API 参考' : 'API Reference'),
    ];
    const positions = sections.map(section => page.indexOf(section));
    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(page).toContain('BlockHeader');
    expect(page).toContain('BlockSection');
    expect(page).toContain('BlockRow');
    expect(page).toContain('BlockCell');
    expect(page).toContain('NodeTarget + anchor / boundary');
    expect(page).toContain('files="block-basic"');
    expect(page).toContain('files="block-connection"');
    expect(page).toContain('files="block-style"');
    expect(page).toContain(lang === 'zh' ? '支持完整的 Core Scope' : 'supports the complete Core Scope');
    expect(page).toContain('localNamespace');
    expect(page).toContain(lang === 'zh' ? '不会自动添加 Block 前缀' : 'do not automatically receive a Block prefix');
    expect(lang === 'zh' ? page : page.toLowerCase()).toContain(
      lang === 'zh' ? '任意有序 children' : 'arbitrary ordered children',
    );
    expect(page).toContain('width?');
    expect(page).toContain('minWidth?');
    expect(page).toContain('direction?');
    expect(page).toContain('itemGap?');
    expect(page).toContain('justifyContent?');
    expect(page).toContain(lang === 'zh' ? '主标题；默认 `base`、粗体' : 'Primary title; defaults to `base` and bold');
    expect(page).toContain(lang === 'zh' ? '次要说明；默认 `xs`' : 'Secondary text; defaults to `xs`');
    expect(page).not.toContain('| `header`');
    expect(page).not.toContain('| `sections?`');
    expect(readContent(`src/modules/docs/contents/schematic/graph/block/basic/block-style.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(readContent(`src/modules/docs/contents/schematic/graph/block/basic/block-basic.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(api).toContain('BlockSchema');
    expect(api).toContain('BlockProviderKey');
    expect(api).toContain('BlockInputEmbedAdapter');
  });

  it('keeps open Block children and independent composites in executable IR and Vanilla code views', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preview = buildPreviewIR(() => blockPreviewSource.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview);

      expect(vanilla.code).toContain("block('preview-block-1'");
      expect(vanilla.code).toContain('BlockInputEmbedAdapter');
      expect(vanilla.code).toContain("blockHeader('preview-blockHeader-1'");
      expect(vanilla.code).toContain('BlockHeaderInputEmbedAdapter');
      expect(vanilla.code).toContain("blockSection('preview-blockSection-1'");
      expect(vanilla.code).toContain("blockRow('preview-blockRow-1'");
      expect(vanilla.code).toContain("title: { text: 'User' }");
      expect(vanilla.code).toContain("description: { text: '领域实体' }");
      expect(vanilla.code).not.toContain("direction: 'vertical'");
      expect(vanilla.code).not.toContain('itemGap: 4');
      expect(vanilla.code).not.toContain("justifyContent: 'start'");
      expect(vanilla.code).toContain("shape: 'circle'");
      expect(vanilla.code).toContain("text: 'B'");
      expect(vanilla.code).toContain('padding: 4');
      expect(vanilla.code).toContain("fill: '#f97316'");
      expect(vanilla.code).toContain('fillOpacity: 0.1');
      expect(vanilla.code).toContain("text: 'public'");
      expect(vanilla.code).toContain("font: { size: 'sm' }");
      expect(vanilla.code).toContain('cornerRadius: 4');
      expect(vanilla.code).not.toContain("text: '可序列化对象'");
      expect(vanilla.code).not.toContain('basis: 0');
      expect(vanilla.code).not.toContain('grow: 1');
      expect(vanilla.code).toContain("id: 'user.email'");
      expect(vanilla.code).toContain('child: node({');
      expect(vanilla.code).toContain("text: 'email'");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('在可见 Source IR 中只保留 Block 文本 Node 的非默认输入', () => {
    const preview = buildPreviewIR(() => blockPreviewSource.canonicalRender?.() ?? null);
    const source = JSON.stringify(preview.sourceIr);

    expect(source).not.toContain('"margin":0');
    expect(source).not.toContain('"textColor":"currentColor"');
    expect(source).not.toContain('"padding":8');
    expect(source).not.toContain('"gap":8');
    expect(source).not.toContain('"background"');
    expect(source).not.toContain('"border"');
    expect(source).toContain('"padding":0');
    expect(source).toContain('"fill":"none"');
    expect(source).toContain('"stroke":"none"');
  });

  it.each([
    ['basic', blockPreviewSource],
    ['connection', blockConnectionPreviewSource],
    ['style', blockStylePreviewSource],
  ] as const)('renders the %s preview canonical state', (_name, previewSource) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(buildPreviewIR(() => previewSource.canonicalRender?.() ?? null)).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['basic zh', blockPreviewSource],
    ['basic en', blockPreviewSourceEn],
    ['connection zh', blockConnectionPreviewSource],
    ['connection en', blockConnectionPreviewSourceEn],
    ['style zh', blockStylePreviewSource],
    ['style en', blockStylePreviewSourceEn],
  ] as const)('centers the %s viewBox on its compiled visual layout', (_name, previewSource) => {
    const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
    const viewBox = preview.ir.viewBox;
    expect(viewBox).toBeDefined();
    if (viewBox === undefined) return;

    const { viewBox: _viewBox, ...ir } = preview.ir;
    void _viewBox;
    const definitions = resolveCoreProviderDependencies({ contributions: preview.contributions });
    const layout = compileToScene(ir, { ...definitions, padding: 0 }).scene.layout;

    const viewCenter = {
      x: viewBox.x + viewBox.width / 2,
      y: viewBox.y + viewBox.height / 2,
    };
    const layoutCenter = {
      x: layout.x + layout.width / 2,
      y: layout.y + layout.height / 2,
    };

    // Node 与浏览器字体度量存在小幅差异；容差仍远小于未居中时 25–142 px 的偏移
    expect(Math.abs(viewCenter.x - layoutCenter.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(viewCenter.y - layoutCenter.y)).toBeLessThanOrEqual(16);
  });
});
