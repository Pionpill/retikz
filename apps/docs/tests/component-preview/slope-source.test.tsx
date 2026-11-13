import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { createPreviewControlContract } from '../../src/modules/docs/contents/viz/chart/lines/slope/slope-basic.controls';
import { renderSlopeBasic } from '../../src/modules/docs/contents/viz/chart/lines/slope/slope-basic.preview';
import { renderSlopeMinimal } from '../../src/modules/docs/contents/viz/chart/lines/slope/slope-minimal.preview';

describe('Slope 文档源码预览', () => {
  it('保留精简 Slope Source，并通过 /line 生成可渲染的 Vanilla 代码', () => {
    const preview = buildPreviewIR(() => renderSlopeMinimal());
    expect(preview.sourceIr.children[0]).toMatchObject({
      namespace: 'chart',
      type: 'line',
      recipe: { chartType: 'slope' },
    });
    const vanilla = buildVanillaPreview(preview);
    expect(vanilla.code).toContain('@retikz/chart-vanilla/line');
    expect(vanilla.code).toContain('slopeChartInputEmbedAdapter');
    expect(vanilla.svg).toContain('<svg');
  });

  it('中英文控件状态通过同一个图形实现编译，隐藏点后标签仍可编译', () => {
    for (const lang of ['zh', 'en'] as const) {
      const values = createPreviewControlContract(lang).canonicalValues;
      const preview = buildPreviewIR(() =>
        renderSlopeBasic({ ...values, point: false, label: true, position: 'top', distance: 0 }),
      );
      expect(buildVanillaPreview(preview).svg).toContain('<svg');
    }
  });
});
