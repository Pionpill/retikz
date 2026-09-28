import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { fixedSlopeRows } from './regression-custom.data';
import { regressionCustomI18n } from './regression-custom.i18n';

/** 固定斜率示例的交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = regressionCustomI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.settings,
      sections: [
        {
          label: text.data,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.data,
              rows: fixedSlopeRows,
              columns: [{ key: 'x' }, { key: 'y' }],
            },
          ],
        },
        {
          label: text.settings,
          controls: [{ kind: 'range', id: 'slope', label: text.slope, defaultValue: 2, min: -2, max: 4, step: 0.25 }],
        },
      ],
    }),
    canonicalValues: { slope: 2 },
    relatedApis: ['defineRegression', 'RegressionChart'],
  } satisfies PreviewControlContract;
};
