import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview';
import * as gridBounds from '../../src/modules/docs/contents/library/layout/grid-layout/extended/grid-bounds';
import * as gridImplicit from '../../src/modules/docs/contents/library/layout/grid-layout/extended/grid-implicit';
import * as gridInspection from '../../src/modules/docs/contents/library/layout/grid-layout/extended/grid-inspection';
import * as gridOverlap from '../../src/modules/docs/contents/library/layout/grid-layout/extended/grid-overlap';
import * as gridAlignment from '../../src/modules/docs/contents/library/layout/grid-layout/usage/grid-alignment';
import * as gridItem from '../../src/modules/docs/contents/library/layout/grid-layout/usage/grid-item';
import * as gridPlacement from '../../src/modules/docs/contents/library/layout/grid-layout/usage/grid-placement';
import * as gridTracks from '../../src/modules/docs/contents/library/layout/grid-layout/usage/grid-tracks';

describe('Grid 功能预览', () => {
  it('改变份额与锚点后，Vanilla 和 IR 绘图均更新', () => {
    for (const [source, values] of [[gridTracks.previewSource, { factor: 4 }]] as const) {
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
    ['grid-alignment', gridAlignment],
    ['grid-item', gridItem],
    ['grid-placement', gridPlacement],
    ['grid-tracks', gridTracks],
    ['grid-bounds', gridBounds],
    ['grid-implicit', gridImplicit],
    ['grid-inspection', gridInspection],
    ['grid-overlap', gridOverlap],
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
