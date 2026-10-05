import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';
import * as overlayClipping from '../../src/modules/docs/contents/library/layout/overlay-layout/extended/overlay-clipping';
import * as overlayInspection from '../../src/modules/docs/contents/library/layout/overlay-layout/extended/overlay-inspection';
import * as overlayParticipation from '../../src/modules/docs/contents/library/layout/overlay-layout/extended/overlay-participation';
import * as overlayPosition from '../../src/modules/docs/contents/library/layout/overlay-layout/extended/overlay-position';
import * as overlayAlignment from '../../src/modules/docs/contents/library/layout/overlay-layout/usage/overlay-alignment';
import * as overlayBox from '../../src/modules/docs/contents/library/layout/overlay-layout/usage/overlay-box';
import * as overlayOffset from '../../src/modules/docs/contents/library/layout/overlay-layout/usage/overlay-offset';

describe('Overlay 功能预览', () => {
  it('改变份额与锚点后，Vanilla 和 IR 绘图均更新', () => {
    for (const [source, values] of [[overlayPosition.previewSource, { anchor: 'left' }]] as const) {
      const before = source.buildViews!({ lang: 'en' });
      const after = source.buildViews!({ lang: 'en', values });

      expect(after.ir?.files[0].code).not.toEqual(before.ir?.files[0].code);

      for (const key of ['vanilla', 'ir'] as const) {
        expect(renderToStaticMarkup(after[key]!.render!('svg'))).not.toEqual(
          renderToStaticMarkup(before[key]!.render!('svg')),
        );
      }
    }
  });

  it.each([
    ['overlay-alignment', overlayAlignment],
    ['overlay-box', overlayBox],
    ['overlay-offset', overlayOffset],
    ['overlay-clipping', overlayClipping],
    ['overlay-inspection', overlayInspection],
    ['overlay-participation', overlayParticipation],
    ['overlay-position', overlayPosition],
  ])('%s 在 API 切换及控件边界保留检查图层', (_name, demo) => {
    const zh = demo.createPreviewControlContract('zh');
    const en = demo.createPreviewControlContract('en');

    expect(en.canonicalValues).toEqual(zh.canonicalValues);
    expect(en.controls.title).not.toEqual(zh.controls.title);

    const definition: PreviewControlsDefinition = zh.controls;
    const controls = definition.sections.flatMap(section => section.controls);
    const canonical = demo.previewSource.buildViews!({ lang: 'zh' });

    expect(canonical.vanilla?.files[0].code).toContain('createLayoutInspectionVanillaDriver');
    expect(canonical.ir?.files[0].code).not.toContain('inspector');

    for (const view of [canonical.vanilla, canonical.ir]) {
      const svg = renderToStaticMarkup(view!.render!('svg'));

      expect(svg).toContain('data-retikz-readonly-layer');
      expect(svg).toContain('<text');
    }

    for (const control of controls) {
      const candidates =
        control.kind === 'range'
          ? [control.min, control.max]
          : control.kind === 'select'
            ? control.options.map(option => option.value)
            : control.kind === 'switch'
              ? [false, true]
              : [];

      for (const value of candidates) {
        const views = demo.previewSource.buildViews!({
          lang: 'en',
          values: { ...zh.canonicalValues, [control.id]: value },
        });
        const svg = renderToStaticMarkup(views.vanilla!.render!('svg'));

        expect(svg).toContain('data-retikz-readonly-layer');
        expect(svg).not.toContain('NaN');
      }
    }
  });
});
