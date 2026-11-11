import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';
import { coordinate1DPlaygroundI18n } from './coordinate-1d-playground.i18n';

/** 一维投影的双语控件契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = coordinate1DPlaygroundI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: text.title,
      sections: [
        {
          label: text.data,
          defaultCollapsed: true,
          controls: [
            { kind: 'table', id: 'rows', label: text.events, rows: oneDimensionalEvents, columns: [{ key: 'hour' }] },
          ],
        },
        {
          label: text.projection,
          controls: [
            {
              kind: 'select',
              id: 'orientation',
              label: text.orientation,
              defaultValue: 'horizontal',
              options: [
                { value: 'horizontal', label: text.horizontal },
                { value: 'vertical', label: text.vertical },
              ],
            },
          ],
        },
      ],
    }),
    canonicalValues: { orientation: 'horizontal' } as const,
    relatedApis: ['Plot.coordinate.orientation'],
  } satisfies PreviewControlContract;
};
