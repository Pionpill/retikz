import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { provenanceDemoI18n } from './provenance-demo.i18n';

/** 所有记录选项都作用于右侧真实事件 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = provenanceDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.records,
      sections: [
        {
          label: i18n.scope,
          controls: [
            { kind: 'switch', id: 'provenance', label: i18n.provenance, defaultValue: true },
            { kind: 'switch', id: 'steps', label: i18n.steps, defaultValue: true },
            { kind: 'switch', id: 'fields', label: i18n.fields, defaultValue: false },
            { kind: 'switch', id: 'reducers', label: i18n.reducers, defaultValue: false },
            { kind: 'switch', id: 'selectors', label: i18n.selectors, defaultValue: false },
            { kind: 'switch', id: 'samples', label: i18n.samples, defaultValue: false },
            {
              kind: 'switch',
              id: 'details',
              label: i18n.details,
              defaultValue: false,
            },
          ],
        },
        {
          label: i18n.budget,
          controls: [
            { kind: 'switch', id: 'full', label: i18n.full, defaultValue: false },
            {
              kind: 'range',
              id: 'maxIndices',
              label: i18n.maxIndices,
              defaultValue: 2,
              min: 1,
              max: 4,
              step: 1,
              visibleWhen: { controlId: 'full', oneOf: [false] },
            },
            {
              kind: 'range',
              id: 'maxRows',
              label: i18n.maxRows,
              defaultValue: 1,
              min: 1,
              max: 4,
              step: 1,
            },
          ],
        },
      ],
    }),
    canonicalValues: {
      provenance: true,
      full: false,
      maxIndices: 2,
      steps: true,
      fields: false,
      reducers: false,
      selectors: false,
      samples: false,
      details: false,
      maxRows: 1,
    },
    relatedApis: ['DataLineageOptions'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract();
