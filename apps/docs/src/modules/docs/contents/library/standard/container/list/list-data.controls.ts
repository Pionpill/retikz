import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { listDataI18n } from './list-data.i18n';

/** 按文档语言创建交互面板 */
const createControls = (lang: Lang) => {
  const t = listDataI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: t.title,
    sections: [
      {
        controls: [
          {
            kind: 'select',
            id: 'dataObjectDisplay',
            label: t.dataObjectDisplay,
            defaultValue: 'text',
            options: [
              { value: 'map', label: t.map },
              { value: 'text', label: t.text },
            ],
          },
        ],
      },
    ],
  });
};

/** 交互示例的稳定状态和 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
    canonicalValues: { dataObjectDisplay: 'text' },
    relatedApis: ['List.dataObjectDisplay'],
  }) satisfies PreviewControlContract;

/** 注册与源码派生使用的默认契约 */
export const previewControlContract = createPreviewControlContract('zh');
