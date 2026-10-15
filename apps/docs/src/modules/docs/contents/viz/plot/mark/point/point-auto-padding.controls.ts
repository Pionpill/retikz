import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { rows } from './point-auto-padding.data';
import { pointAutoPaddingI18n } from './point-auto-padding.i18n';

/** 自动留白示例 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = pointAutoPaddingI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        { label: text.data, defaultCollapsed: true, controls: [{ kind: 'table', id: 'rows', label: text.rows, rows }] },
        {
          controls: [
            {
              kind: 'select',
              id: 'strategy',
              label: text.strategy,
              defaultValue: 'max-radius',
              options: [
                { value: 'max-radius', label: text.maximum },
                { value: 'point-aware', label: text.aware },
                { value: 'off', label: text.off },
              ],
            },
            {
              kind: 'range',
              id: 'clearance',
              label: text.clearance,
              defaultValue: 0,
              min: 0,
              max: 20,
              step: 1,
              visibleWhen: { controlId: 'strategy', oneOf: ['max-radius', 'point-aware'] },
            },
            {
              kind: 'select',
              id: 'override',
              label: text.override,
              defaultValue: 'automatic',
              options: [
                { value: 'automatic', label: text.automatic },
                { value: 'zero', label: text.zero },
                { value: 'lower', label: text.lower },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { strategy: 'max-radius', clearance: 0, override: 'automatic' },
    relatedApis: ['PointMark.autoPadding', 'PlotScale.domainPadding'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract();
