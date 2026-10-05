import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { demoI18n } from './flex-wrapping.i18n';

/** 当前语言的功能控件与稳定基线 */
export const createPreviewControlContract = (lang: Lang) => {
  const text = demoI18n[lang];
  const controls = definePreviewControls({
    presentation: 'panel',
    title: text.title,
    sections: [
      {
        controls: [
          { kind: 'range', id: 'width', label: text.width, defaultValue: 260, min: 180, max: 300, step: 1 },
          { kind: 'range', id: 'basis', label: text.basis, defaultValue: 90, min: 55, max: 110, step: 1 },
          {
            kind: 'select',
            id: 'wrap',
            label: text.wrap,
            defaultValue: 'wrap',
            options: [
              { value: 'nowrap', label: text.wrapOption0 },
              { value: 'wrap', label: text.wrapOption1 },
              { value: 'wrap-reverse', label: text.wrapOption2 },
            ],
          },
          {
            kind: 'select',
            id: 'alignContent',
            label: text.alignContent,
            defaultValue: 'center',
            options: [
              { value: 'start', label: text.alignContentOption0 },
              { value: 'center', label: text.alignContentOption1 },
              { value: 'end', label: text.alignContentOption2 },
              { value: 'space-between', label: text.alignContentOption3 },
              { value: 'space-around', label: text.alignContentOption4 },
              { value: 'space-evenly', label: text.alignContentOption5 },
              { value: 'stretch', label: text.alignContentOption6 },
            ],
          },
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
        ],
      },
    ],
  });

  return {
    controls,
    canonicalValues: { width: 260, basis: 90, wrap: 'wrap', alignContent: 'center', justifyContent: 'start' },
    relatedApis: [
      'FlexLayout.size',
      'FlexLayoutItem.basis',
      'FlexLayout.wrap',
      'FlexLayout.alignContent',
      'FlexLayout.justifyContent',
    ],
  } satisfies PreviewControlContract;
};

/** 默认语言的注册契约 */
export const previewControlContract = createPreviewControlContract('zh');
