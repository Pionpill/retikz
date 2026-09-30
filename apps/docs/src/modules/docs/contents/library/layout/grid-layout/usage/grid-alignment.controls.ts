import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './grid-alignment.i18n';
/** 同一场景的本地化控件与重置基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          {
            id: 'justifyContent',
            kind: 'select',
            defaultValue: 'center',
            label: text.justifyContent,
            options: [
              { value: 'start', label: text.justifyContent0 },
              { value: 'center', label: text.justifyContent1 },
              { value: 'end', label: text.justifyContent2 },
              { value: 'stretch', label: text.justifyContent3 },
              { value: 'space-between', label: text.justifyContent4 },
              { value: 'space-around', label: text.justifyContent5 },
            ],
          },
          {
            id: 'alignContent',
            kind: 'select',
            defaultValue: 'center',
            label: text.alignContent,
            options: [
              { value: 'start', label: text.alignContent0 },
              { value: 'center', label: text.alignContent1 },
              { value: 'end', label: text.alignContent2 },
              { value: 'stretch', label: text.alignContent3 },
              { value: 'space-between', label: text.alignContent4 },
              { value: 'space-around', label: text.alignContent5 },
            ],
          },
          {
            id: 'justifyItems',
            kind: 'select',
            defaultValue: 'center',
            label: text.justifyItems,
            options: [
              { value: 'start', label: text.justifyItems0 },
              { value: 'center', label: text.justifyItems1 },
              { value: 'end', label: text.justifyItems2 },
              { value: 'stretch', label: text.justifyItems3 },
            ],
          },
          {
            id: 'alignItems',
            kind: 'select',
            defaultValue: 'center',
            label: text.alignItems,
            options: [
              { value: 'start', label: text.alignItems0 },
              { value: 'center', label: text.alignItems1 },
              { value: 'end', label: text.alignItems2 },
              { value: 'stretch', label: text.alignItems3 },
            ],
          },
        ],
      },
    ],
  });
  return {
    controls,
    canonicalValues: { justifyContent: 'center', alignContent: 'center', justifyItems: 'center', alignItems: 'center' },
    relatedApis: [
      'GridLayout.justifyContent',
      'GridLayout.alignContent',
      'GridLayout.justifyItems',
      'GridLayout.alignItems',
    ],
  } satisfies PreviewControlContract;
};
/** 中文注册基线 */
export const previewControlContract = createPreviewControlContract('zh');
