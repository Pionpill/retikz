import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { provenanceDemoI18n } from './provenance-demo.i18n';

/** 对比回调事件与返回数组 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const i18n = provenanceDemoI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: i18n.delivery,
      sections: [
        {
          controls: [
            { kind: 'switch', id: 'sink', label: i18n.sink, defaultValue: true },
            {
              kind: 'switch',
              id: 'retain',
              label: i18n.retain,
              defaultValue: false,
              visibleWhen: { controlId: 'sink', oneOf: [true] },
            },
          ],
        },
      ],
    }),
    canonicalValues: { sink: true, retain: false },
    relatedApis: ['DataLineageOptions.sink', 'DataLineageOptions.retainEvents'],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract();
