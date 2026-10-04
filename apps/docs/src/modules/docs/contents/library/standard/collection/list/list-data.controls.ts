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
            id: 'dataExpand',
            label: t.dataExpand,
            defaultValue: 'list',
            options: [
              { value: 'all', label: t.all },
              { value: 'none', label: t.none },
              { value: 'map', label: t.map },
              { value: 'list', label: t.list },
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
    canonicalValues: { dataExpand: 'list' },
    relatedApis: ['List.dataExpand'],
  }) satisfies PreviewControlContract;

/** 注册与源码派生使用的默认契约 */
export const previewControlContract = createPreviewControlContract('zh');
