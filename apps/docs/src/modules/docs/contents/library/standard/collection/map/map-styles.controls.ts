import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { mapStylesI18n } from './map-styles.i18n';

/** 按当前文档语言创建控件 */
export const createPreviewControlContract = (lang: Lang) => {
  const t = mapStylesI18n[lang];
  return {
    controls: definePreviewControls({
      presentation: 'panel',
      title: t.title,
      sections: [
        {
          controls: [
            { id: 'keyWidth', kind: 'range', label: t.keyWidth, defaultValue: 60, min: 40, max: 80, step: 4 },
            { id: 'valueWidth', kind: 'range', label: t.valueWidth, defaultValue: 112, min: 64, max: 160, step: 8 },
            { id: 'local', kind: 'switch', label: t.local, defaultValue: true },
          ],
        },
      ],
    }),
    canonicalValues: { keyWidth: 60, valueWidth: 112, local: true },
    relatedApis: ['Map.layout', 'Map.style', 'Map.entries'],
  } satisfies PreviewControlContract;
};

/** 注册与源码派生使用的默认状态 */
export const previewControlContract = createPreviewControlContract('zh');
