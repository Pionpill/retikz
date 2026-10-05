import type { Lang } from '@/i18n';
import { definePreviewControls } from '@/modules/docs/preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { mapDataI18n } from './map-data.i18n';

/** 按文档语言创建交互面板 */
const createControls = (lang: Lang) => {
  const t = mapDataI18n[lang];
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
            defaultValue: 'array',
            options: [
              { value: 'all', label: t.all },
              { value: 'none', label: t.none },
              { value: 'map', label: t.map },
              { value: 'array', label: t.array },
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
    canonicalValues: { dataExpand: 'array' },
    relatedApis: ['Map.dataExpand'],
  }) satisfies PreviewControlContract;

/** 注册与源码派生使用的默认契约 */
export const previewControlContract = createPreviewControlContract('zh');
