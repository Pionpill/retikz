import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-alignment.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'justifyContent',
            label: text.justifyContent,
            defaultValue: 'start',
            options: [
              { value: 'start', label: text.justifyContentOption0 },
              { value: 'center', label: text.justifyContentOption1 },
              { value: 'end', label: text.justifyContentOption2 },
              { value: 'space-between', label: text.justifyContentOption3 },
              { value: 'space-around', label: text.justifyContentOption4 },
              { value: 'space-evenly', label: text.justifyContentOption5 },
            ],
          },
          {
            kind: 'select',
            id: 'alignItems',
            label: text.alignItems,
            defaultValue: 'center',
            options: [
              { value: 'start', label: text.alignItemsOption0 },
              { value: 'center', label: text.alignItemsOption1 },
              { value: 'end', label: text.alignItemsOption2 },
              { value: 'stretch', label: text.alignItemsOption3 },
            ],
          },
          {
            kind: 'select',
            id: 'alignSelf',
            label: text.alignSelf,
            defaultValue: 'auto',
            options: [
              { value: 'auto', label: text.alignSelfOption0 },
              { value: 'start', label: text.alignSelfOption1 },
              { value: 'center', label: text.alignSelfOption2 },
              { value: 'end', label: text.alignSelfOption3 },
              { value: 'stretch', label: text.alignSelfOption4 },
            ],
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { justifyContent: 'start', alignItems: 'center', alignSelf: 'auto' },
    relatedApis: ['FlexLayout.justifyContent', 'FlexLayout.alignItems', 'FlexLayoutItem.alignSelf'],
  } satisfies PreviewControlContract;
};
/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
