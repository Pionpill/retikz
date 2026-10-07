import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { mapOverflowI18n } from './map-overflow.i18n';

/** 按当前文档语言创建控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = mapOverflowI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            { id: 'width', kind: 'range', label: t.width, defaultValue: 80, min: 64, max: 160, step: 8 },
            {
              id: 'overflow',
              kind: 'select',
              label: t.overflow,
              defaultValue: 'clip',
              options: [
                { value: 'clip', label: t.clip },
                { value: 'visible', label: t.visible },
              ],
            },
            { id: 'reference', kind: 'switch', label: t.reference, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { width: 80, overflow: 'clip', reference: true },
    relatedApis: ['Map.entries', 'Map.layout'],
  } satisfies PreviewControlContract;
};

/** 注册与源码派生使用的默认状态 */
export const previewControlContract = createPreviewControlContract('zh');
