import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as groupPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-basic.zh.demo';
import { previewSource as groupLabelPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-label.zh.demo';
import { previewSource as groupStylePreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-style.zh.demo';

describe('Graph Group documentation', () => {
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
