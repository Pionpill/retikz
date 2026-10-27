import { describe, expect, it, vi } from 'vitest';

import { buildPreviewIR } from '../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../src/modules/docs/components/component-preview/vanilla-preview';
import { previewSource as groupPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-basic';
import { previewSource as groupLabelPreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-label';
import { previewSource as groupStylePreviewSource } from '../src/modules/docs/contents/schematic/graph/group/group-style';

describe('Graph Group 文档', () => {
  it('将 Group 子项保留在可执行规范预览和 Vanilla 代码视图中', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const preview = buildPreviewIR(() => groupPreviewSource.canonicalRender?.() ?? null);
      const vanilla = buildVanillaPreview(preview);

      expect(vanilla.code).toContain('group({');
      expect(vanilla.code).toContain('groupInputEmbedAdapter');
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
  ] as const)('渲染 %s 预览规范状态', (_name, previewSource) => {
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
