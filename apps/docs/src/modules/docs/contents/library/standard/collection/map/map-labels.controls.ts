import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { mapLabelsI18n } from './map-labels.i18n';

/** 按当前文档语言创建控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = mapLabelsI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            {
              id: 'position',
              kind: 'select',
              label: t.position,
              defaultValue: 'top',
              options: [
                { value: 'top', label: t.top },
                { value: 'right', label: t.right },
                { value: 'bottom', label: t.bottom },
                { value: 'left', label: t.left },
              ],
            },
            { id: 'distance', kind: 'range', label: t.distance, defaultValue: 12, min: 0, max: 24, step: 2 },
            { id: 'pin', kind: 'switch', label: t.pin, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { position: 'top', distance: 12, pin: true },
    relatedApis: ['Map.label'],
  } satisfies PreviewControlContract;
};

/** 注册与源码派生使用的默认状态 */
export const previewControlContract = createPreviewControlContract('zh');
