import { describe, expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { createPreviewControlContract } from '../../src/modules/docs/contents/viz/chart/lines/line/line-basic.controls';
import { renderLineBasic } from '../../src/modules/docs/contents/viz/chart/lines/line/line-basic.preview';
import { renderLineMinimal } from '../../src/modules/docs/contents/viz/chart/lines/line/line-minimal.preview';

describe('Line 文档源码预览', () => {
  it('保留精简 Line Source，并通过 /line 生成可渲染的 Vanilla 代码', () => {
    const preview = buildPreviewIR(() => renderLineMinimal());
    expect(preview.sourceIr.children[0]).toMatchObject({
      namespace: 'chart',
      type: 'line',
      recipe: { chartType: 'line' },
    });
    const vanilla = buildVanillaPreview(preview);
    expect(vanilla.code).toContain('@retikz/chart-vanilla/line');
    expect(vanilla.code).toContain('lineChartInputEmbedAdapter');
    expect(vanilla.svg).toContain('<svg');
  });

  it('中英文控件状态通过同一个图形实现编译，缺值与可选点不破坏预览', () => {
    for (const lang of ['zh', 'en'] as const) {
      const values = createPreviewControlContract(lang).canonicalValues;
      const preview = buildPreviewIR(() =>
        renderLineBasic({ ...values, point: true, connectNulls: true, curve: 'step' }),
      );
      expect(buildVanillaPreview(preview).svg).toContain('<svg');
    }
  });
});
