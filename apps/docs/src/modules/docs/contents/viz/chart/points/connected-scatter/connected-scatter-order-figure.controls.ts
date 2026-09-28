import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { connectedScatterOrderFigureData } from './connected-scatter-order-figure.data';
import { connectedScatterOrderFigureI18n } from './connected-scatter-order-figure.i18n';

/** 连接顺序示例的交互契约 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const text = connectedScatterOrderFigureI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      sections: [
        {
          label: text.data,
          controls: [
            {
              kind: 'table',
              id: 'rows',
              label: text.data,
              rows: connectedScatterOrderFigureData,
              columns: [{ key: 'step' }, { key: 'x' }, { key: 'y' }],
            },
          ],
        },
        { label: text.order, controls: [{ kind: 'switch', id: 'ordered', label: text.order, defaultValue: true }] },
      ],
    }),
    canonicalValues: { ordered: true },
    relatedApis: ['ConnectedScatterEncodings.order'],
  } satisfies PreviewControlContract;
};
