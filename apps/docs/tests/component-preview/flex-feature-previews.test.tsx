import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { resolvePreviewControlContract } from '../../src/modules/docs/components/component-preview/registry';
import { previewSource as baselineSource } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-baseline';
import { previewSource as clippingSource } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-clipping';
import { previewSource as limitsSource } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-limits';
import * as wrappingDemo from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-wrapping';
import { previewSource as wrappingSource } from '../../src/modules/docs/contents/library/layout/flex-layout/extended/flex-wrapping';
import { previewSource as alignmentSource } from '../../src/modules/docs/contents/library/layout/flex-layout/usage/flex-alignment';
import { previewSource as allocationSource } from '../../src/modules/docs/contents/library/layout/flex-layout/usage/flex-allocation';
import { previewSource as geometrySource } from '../../src/modules/docs/contents/library/layout/flex-layout/usage/flex-geometry';

describe('Flex 功能示例的 API 视图', () => {
  it('controls 模块未被独立加载时，demo 注册回退仍按当前语言生成面板', () => {
    const contract = resolvePreviewControlContract(wrappingDemo, 'en');

    expect(contract?.controls).toMatchObject({ title: 'Wrapping and line distribution' });
    expect(contract?.canonicalValues).toEqual(resolvePreviewControlContract(wrappingDemo, 'zh')?.canonicalValues);
  });

  it.each([
    ['geometry', geometrySource],
    ['allocation', allocationSource],
    ['alignment', alignmentSource],
    ['limits', limitsSource],
    ['wrapping', wrappingSource],
    ['baseline', baselineSource],
    ['clipping', clippingSource],
  ])('%s 的 Vanilla 和 IR 都绘制普通布局，IR 不包含检查请求', (_name, source) => {
    const views = source.buildViews!({ lang: 'zh' });

    expect(views.vanilla?.files[0].code).not.toContain('createLayoutInspectionVanillaDriver');
    expect(views.ir?.files[0].code).not.toContain('inspector');
    expect(views.ir?.files[0].code).not.toContain('selection');

    for (const view of [views.vanilla, views.ir]) {
      const svg = renderToStaticMarkup(view!.render!('svg'));

      expect(svg).not.toContain('data-retikz-readonly-layer');
      expect(svg).toMatch(/>(?:A|First(?: Node)?)<\/(?:tspan|text)>/);
    }
  });

  it('源码切换后的实际绘图随 controls 更新，而不是停留在 canonical 状态', () => {
    const narrow = allocationSource.buildViews!({ lang: 'en', values: { width: 160 } });
    const wide = allocationSource.buildViews!({ lang: 'en', values: { width: 300 } });

    expect(narrow.ir?.files[0].code).toContain('160');
    expect(wide.ir?.files[0].code).toContain('300');
    expect(renderToStaticMarkup(narrow.vanilla!.render!('svg'))).not.toEqual(
      renderToStaticMarkup(wide.vanilla!.render!('svg')),
    );
  });
});
