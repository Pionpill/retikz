import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as groupPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-basic.zh.demo';
import { previewSource as groupLabelPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-label.zh.demo';
import { previewSource as groupStylePreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-style.zh.demo';

const readContent = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Graph Group documentation', () => {
  it.each(['zh', 'en'] as const)('%s documents Group composition and Core label reuse', lang => {
    const page = readContent(`src/modules/docs/contents/schematic/graph/group/index.${lang}.mdx`);
    const api = readContent(`src/modules/docs/contents/schematic/graph/api-reference/index.${lang}.mdx`);

    const sections = [
      '## ' + (lang === 'zh' ? '基础用法' : 'Basic usage'),
      '## ' + (lang === 'zh' ? '例子' : 'Examples'),
      '## ' + (lang === 'zh' ? '技术原理' : 'How it works'),
      '## ' + (lang === 'zh' ? 'API 参考' : 'API Reference'),
    ];
    const sectionPositions = sections.map(section => page.indexOf(section));
    expect(sectionPositions.every(position => position >= 0)).toBe(true);
    expect(sectionPositions).toEqual([...sectionPositions].sort((a, b) => a - b));
    expect(page).toContain(lang === 'zh' ? '### 标题与说明' : '### caption');
    expect(page).toContain(lang === 'zh' ? '### 标签' : '### label');
    expect(page).toContain(lang === 'zh' ? '### 样式调整' : '### Style adjustments');
    expect(readContent(`src/modules/docs/contents/schematic/graph/group/group-basic.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(readContent(`src/modules/docs/contents/schematic/graph/group/group-label.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(readContent(`src/modules/docs/contents/schematic/graph/group/group-style.${lang}.demo.tsx`)).toContain(
      'previewControls',
    );
    expect(page).toContain('files="group-label"');
    expect(page).toContain('files="group-style"');
    expect(page).toContain('IRNodeLabel');
    expect(page).toContain('Surface');
    expect(page).toContain('FlexLayout');
    expect(page).toContain(
      lang === 'zh' ? '命名 Graph Theme 会为 Group 根外框提供' : 'A named Graph Theme supplies the Group root shell',
    );
    expect(page).toContain(lang === 'zh' ? '完整顶层字段替换' : 'complete top-level field replacement');
    expect(api).toContain('GroupSchema');
    expect(api).toContain('GroupProviderKey');
    expect(api).toContain('GroupInputEmbedAdapter');
    expect(api).toContain('GraphSurfaceThemeStyleTokens');
  });

  it('keeps Group children in the executable canonical preview and Vanilla code view', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preview = buildPreviewIR(() => groupPreviewSource.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview);

      expect(vanilla.code).toContain("group('preview-group-1'");
      expect(vanilla.code).toContain('GroupInputEmbedAdapter');
      expect(vanilla.code).toContain('caption: {');
      expect(vanilla.code).toContain("title: { text: '运行时' }");
      expect(vanilla.code).toContain("description: { text: '编译与渲染' }");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it.each([
    ['caption', groupPreviewSource],
    ['label', groupLabelPreviewSource],
    ['style', groupStylePreviewSource],
  ] as const)('renders the %s preview canonical state', (_name, previewSource) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const preview = buildPreviewIR(() => previewSource.canonicalRender?.() ?? null);
      expect(preview).not.toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
