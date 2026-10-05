import type { FC } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Lang } from '../../src/i18n';
import type * as PreviewContext from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview/types';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import type { PreviewControlContract, PreviewSourceConfig } from '../../src/modules/docs/preview';

const live = vi.hoisted(() => ({ values: {} as PreviewControlValues }));
vi.mock('../../src/modules/docs/components/component-preview/context', async importOriginal => ({
  ...(await importOriginal<typeof PreviewContext>()),
  usePreviewControls: () => live.values,
  usePreviewDimensions: () => undefined,
}));

type Playground = {
  default: FC<{ lang?: Lang }>;
  createPreviewControlContract: (lang?: Lang) => PreviewControlContract;
  previewSource: PreviewSourceConfig;
};

const demos: Record<string, () => Promise<Playground>> = {
  'regression/regression-encodings': () =>
    import('../../src/modules/docs/contents/viz/chart/points/regression/regression-encodings'),
  'connected-scatter/connected-scatter-encodings': () =>
    import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-encodings'),
  'ranged-dot/ranged-dot-encodings': () =>
    import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-encodings'),
  'strip/strip-encodings': () => import('../../src/modules/docs/contents/viz/chart/points/strip/strip-encodings'),
  'scatter/scatter-appearance': () =>
    import('../../src/modules/docs/contents/viz/chart/points/scatter/scatter-appearance'),
  'bubble/bubble-basic': async () => {
    const demo = await import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo');
    const zh = await import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls');
    const en = await import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls');

    return {
      ...demo,
      createPreviewControlContract: (lang: Lang = 'zh') =>
        lang === 'zh' ? zh.previewControlContract : en.previewControlContract,
    };
  },
  'connected-scatter/connected-scatter-basic': async () => {
    const demo =
      await import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo');
    const zh =
      await import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.controls');
    const en =
      await import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.controls');

    return {
      ...demo,
      createPreviewControlContract: (lang: Lang = 'zh') =>
        lang === 'zh' ? zh.previewControlContract : en.previewControlContract,
    };
  },
  'ranged-dot/ranged-dot-basic': async () => {
    const demo = await import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.zh.demo');
    const zh = await import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.controls');
    const en = await import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.controls');

    return {
      ...demo,
      createPreviewControlContract: (lang: Lang = 'zh') =>
        lang === 'zh' ? zh.previewControlContract : en.previewControlContract,
    };
  },
  'regression/regression-basic': async () => {
    const demo = await import('../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.zh.demo');
    const zh = await import('../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.controls');
    const en = await import('../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.controls');

    return {
      ...demo,
      createPreviewControlContract: (lang: Lang = 'zh') =>
        lang === 'zh' ? zh.previewControlContract : en.previewControlContract,
    };
  },
  'strip/strip-basic': async () => {
    const demo = await import('../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.zh.demo');
    const zh = await import('../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.controls');
    const en = await import('../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.en.controls');

    return {
      ...demo,
      createPreviewControlContract: (lang: Lang = 'zh') =>
        lang === 'zh' ? zh.previewControlContract : en.previewControlContract,
    };
  },

  'scatter/scatter-marks': () => import('../../src/modules/docs/contents/viz/chart/points/scatter/scatter-marks'),
  'scatter/scatter-facet': () => import('../../src/modules/docs/contents/viz/chart/points/scatter/scatter-facet'),
  'bubble/bubble-marks': () => import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-marks'),
  'bubble/bubble-facet': () => import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-facet'),
  'connected-scatter/connected-scatter-marks': () =>
    import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-marks'),
  'connected-scatter/connected-scatter-gaps': () =>
    import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-gaps'),
  'regression/regression-marks': () =>
    import('../../src/modules/docs/contents/viz/chart/points/regression/regression-marks'),
  'regression/regression-facet': () =>
    import('../../src/modules/docs/contents/viz/chart/points/regression/regression-facet'),
  'regression/regression-compare': () =>
    import('../../src/modules/docs/contents/viz/chart/points/regression/regression-compare'),
  'ranged-dot/ranged-dot-marks': () =>
    import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-marks'),
  'ranged-dot/ranged-dot-daylight': () =>
    import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-daylight'),
  'strip/strip-marks': () => import('../../src/modules/docs/contents/viz/chart/points/strip/strip-marks'),
  'strip/strip-distribution': () => import('../../src/modules/docs/contents/viz/chart/points/strip/strip-distribution'),
};

describe('Point chart playground interactions', () => {
  for (const [name, load] of Object.entries(demos)) {
    it(`${name}: bilingual controls change chart input and reset to canonical source`, async () => {
      const demo = await load();
      const zh = demo.createPreviewControlContract('zh');
      const en = demo.createPreviewControlContract('en');
      const fields = getPreviewControlFields(zh.controls);
      if (name === 'ranged-dot/ranged-dot-daylight') {
        expect(fields).toHaveLength(0);
      } else {
        expect(fields.length).toBeGreaterThan(0);
      }

      if (name.endsWith('-marks')) {
        expect(fields.map(field => field.id)).not.toContain('override');
        expect(zh.canonicalValues).not.toHaveProperty('override');
      }

      expect(Object.keys(zh.canonicalValues).sort()).toEqual(fields.map(field => field.id).sort());
      expect(en.canonicalValues).toEqual(zh.canonicalValues);

      const withoutLabels = (value: unknown) =>
        JSON.stringify(value, (key, item) => (['title', 'label', 'help'].includes(key) ? undefined : item));

      expect(withoutLabels(en.controls)).toEqual(withoutLabels(zh.controls));

      live.values = { ...zh.canonicalValues };
      const baseline = JSON.stringify(demo.default({ lang: 'zh' }));
      const sourceIr = buildPreviewIR(demo.default).sourceIr;

      expect(sourceIr.children.length).toBeGreaterThan(0);

      if (name.endsWith('-marks')) expect(JSON.stringify(sourceIr)).toContain('"override":true');

      expect(JSON.stringify(demo.previewSource.canonicalRender?.('zh'))).toEqual(baseline);

      for (const field of fields) {
        live.values = { ...zh.canonicalValues };
        if (field.visibleWhen) live.values[field.visibleWhen.controlId] = field.visibleWhen.oneOf[0];
        const beforeInput = JSON.stringify(demo.default({ lang: 'zh' }));
        const beforeIR = JSON.stringify(buildPreviewIR(demo.default).sourceIr);

        switch (field.kind) {
          case 'switch':
            live.values[field.id] = !field.defaultValue;
            break;
          case 'range':
            live.values[field.id] = field.defaultValue === field.max ? field.min : field.max;
            break;
          case 'select':
            live.values[field.id] = field.options.find(option => option.value !== field.defaultValue)!.value;
            break;
          case 'color':
            live.values[field.id] = '#123456';
            break;
          default:
            throw new Error(`Unsupported playground control: ${field.kind}`);
        }

        expect(JSON.stringify(demo.default({ lang: 'zh' })), field.id).not.toEqual(beforeInput);
        expect(JSON.stringify(buildPreviewIR(demo.default).sourceIr), field.id).not.toEqual(beforeIR);
        expect(JSON.stringify(demo.previewSource.canonicalRender?.('zh'))).toEqual(baseline);
      }

      live.values = { ...zh.canonicalValues };

      expect(JSON.stringify(demo.default({ lang: 'zh' }))).toEqual(baseline);
    });
  }
});
